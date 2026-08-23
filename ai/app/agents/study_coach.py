import logging
import json
from typing import Dict, Any
from app.llm.provider import get_llm, handle_llm_error
from app.tools.registry import search_study_notes
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

logger = logging.getLogger(__name__)

def study_coach_node(state: Dict[str, Any]):
    logger.info("Executing study_coach_node")
    messages = state.get("messages", [])
    
    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break

    llm = get_llm()
    if not llm:
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}

    system_prompt = """You are the StudyFlow AI Study Coach.
Your responsibility is to explain concepts, teach step-by-step, adapt difficulty to the learner, and generate examples.
You can query the user's RAG agent/notes using `search_study_notes` if they ask specific questions about their own material.
Be concise, clear, and encouraging. Identify weak areas and ask checking questions when useful.
"""
    
    tools = [search_study_notes]
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
                logger.warning("Study Coach requested only duplicate tools. Blocking.")
                content = "I've already searched your notes for this. Based on what I found, let me explain."
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
                logger.warning(f"Study Coach exceeded budget ({count} + {len(valid_tool_calls)} > 5)")
                return {
                    "final_insight": "I've searched quite a bit. Let's break this concept down without more searches.",
                    "messages": [AIMessage(content="I've searched quite a bit. Let's break this concept down without more searches.")]
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
        logger.error(f"Study Coach LLM Error: {e}")
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}
