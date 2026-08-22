import logging
import json
import os
from typing import Dict, Any
from app.llm.gemini import get_llm
from app.tools.registry import get_analytics_summary, get_todays_focus, get_recent_focus
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logger = logging.getLogger(__name__)

def insight_agent_node(state: Dict[str, Any]):
    logger.info("Executing insight_agent_node")
    messages = state.get("messages", [])
    
    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break

    if os.getenv("MOCK_LLM") == "true":
        content = "Mock Insight Agent response."
        return {
            "final_insight": content,
            "messages": [AIMessage(content=content)]
        }
    
    llm = get_llm()
    if not llm:
        return {"final_insight": "StudyFlow AI is currently offline. Your study data is still safe."}

    system_prompt = """You are the StudyFlow AI coach, a READ-ONLY assistant.
You help the user understand their study patterns, focus metrics, and analytics.
You have access to tools to fetch the user's data.
You MUST NOT invent or hallucinate data. Only use what the tools return.
"""
    
    tools = [get_analytics_summary, get_todays_focus, get_recent_focus]
    llm_with_tools = llm.bind_tools(tools)

    window = messages[-20:]
    input_messages = [SystemMessage(content=system_prompt)] + window
    
    try:
        response = llm_with_tools.invoke(input_messages)
        content = response.content.strip() if response.content else ""
        
        # Enforce budget and prevent duplicates
        count = state.get("tool_call_count", 0)
        history = state.get("tool_calls_history", [])
        
        if hasattr(response, "tool_calls") and response.tool_calls:
            new_history = list(history)
            valid_tool_calls = []
            duplicate_tool_calls = []
            
            for tc in response.tool_calls:
                call_sig = f"{tc['name']}:{json.dumps(tc['args'], sort_keys=True)}"
                if call_sig in new_history:
                    duplicate_tool_calls.append(tc)
                else:
                    new_history.append(call_sig)
                    valid_tool_calls.append(tc)
                    
            if duplicate_tool_calls and not valid_tool_calls:
                # LLM only requested duplicate tools. Block it to prevent infinite loop.
                logger.warning("Insight Agent requested only duplicate tools. Blocking.")
                content = "I've already checked that information. I should analyze what I have."
                return {
                    "final_insight": content,
                    "messages": [AIMessage(content=content)]
                }
                
            if duplicate_tool_calls:
                logger.info(f"Filtering {len(duplicate_tool_calls)} duplicate tool calls")
                response = AIMessage(
                    content=response.content,
                    tool_calls=valid_tool_calls,
                    response_metadata=response.response_metadata,
                    id=response.id
                )
                
            if count + len(valid_tool_calls) > 5:
                logger.warning(f"Insight Agent exceeded budget ({count} + {len(valid_tool_calls)} > 5)")
                return {
                    "final_insight": "I'm sorry, I've had to process too much information. Could you simplify your request?",
                    "messages": [AIMessage(content="I'm sorry, I've had to process too much information. Could you simplify your request?")]
                }
                
            return {
                "tool_call_count": count + len(valid_tool_calls),
                "tool_calls_history": new_history,
                "messages": [response]
            }
            
        return {
            "final_insight": content,
            "messages": [response]
        }
    except Exception as e:
        logger.error(f"Insight Agent LLM Error: {e}")
        return {"final_insight": "StudyFlow AI is currently offline. Your study data is still safe."}
