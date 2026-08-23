import logging
import json
from typing import Dict, Any
from app.llm.provider import get_llm, handle_llm_error
from app.tools.registry import search_web_resources, get_active_goals
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

logger = logging.getLogger(__name__)

def resource_agent_node(state: Dict[str, Any]):
    logger.info("Executing resource_agent_node")
    messages = state.get("messages", [])
    
    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break

    llm = get_llm()
    if not llm:
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}

    system_prompt = """You are the StudyFlow AI Resource Agent.
Your responsibility is to find useful educational resources (articles, docs, wikis) for the user.
Use the `search_web_resources` tool to search Wikipedia or web for resources.
Do NOT hallucinate or fabricate URLs. 
Always explain WHY the recommended resource is useful and estimate the difficulty/time if possible.
You can use `get_active_goals` to contextualize the recommendations based on what the user is currently working on.
"""
    
    tools = [search_web_resources, get_active_goals]
    llm_with_tools = llm.bind_tools(tools)

    window = messages[-20:]
    
    # Sanitize ToolMessages
    sanitized_window = []
    for msg in window:
        if isinstance(msg, ToolMessage):
            sanitized_window.append(HumanMessage(content=f"[Tool {msg.name} execution result]: {msg.content}"))
        elif getattr(msg, "type", "") == "tool":
            sanitized_window.append(HumanMessage(content=f"[Tool execution result]: {msg.content}"))
        else:
            sanitized_window.append(msg)
            
    input_messages = [SystemMessage(content=system_prompt)] + sanitized_window
    
    try:
        response = llm_with_tools.invoke(input_messages)
        content = response.content.strip() if response.content else ""
        
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
                logger.warning("Resource Agent requested only duplicate tools. Blocking.")
                content = "I've already searched for those resources. Here's what I found:"
                return {
                    "final_insight": content,
                    "messages": [AIMessage(content=content)]
                }
                
            if duplicate_tool_calls:
                response = AIMessage(
                    content=response.content,
                    tool_calls=valid_tool_calls,
                    response_metadata=response.response_metadata,
                    id=response.id
                )
                
            if count + len(valid_tool_calls) > 5:
                logger.warning(f"Resource Agent exceeded budget ({count} + {len(valid_tool_calls)} > 5)")
                return {
                    "final_insight": "I've searched quite a bit. Let's work with the resources I've found so far.",
                    "messages": [AIMessage(content="I've searched quite a bit. Let's work with the resources I've found so far.")]
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
        logger.error(f"Resource Agent LLM Error: {e}")
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}
