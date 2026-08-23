import logging
import json
from typing import Dict, Any
from app.llm.provider import get_llm, handle_llm_error
from app.tools.registry import (
    get_active_goals, get_goal_details, get_goal_tasks, 
    get_todays_tasks, get_todays_schedule, get_upcoming_schedule, schedule_task,
    get_user_preferences
)
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

logger = logging.getLogger(__name__)

def planner_agent_node(state: Dict[str, Any]):
    logger.info("Executing planner_agent_node")
    messages = state.get("messages", [])
    
    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break

    llm = get_llm()
    if not llm:
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}

    system_prompt = """You are the StudyFlow AI Planner Agent.
Your primary responsibility is to help the user break goals into actionable plans, schedule tasks, estimate workload, and manage their study time.
You MUST consider the user's deadlines, available study time, and existing schedule.
If their schedule is overloaded, recommend delaying tasks.
Use your tools to fetch active goals, current tasks, and schedule events.
You can also use `get_user_preferences` to check if they have preferred study times or patterns.
Do not hallucinate task IDs or goal IDs. Always fetch them first if you need them.
To schedule a task, use the `schedule_task` tool.
"""
    
    tools = [
        get_active_goals, get_goal_details, get_goal_tasks, 
        get_todays_tasks, get_todays_schedule, get_upcoming_schedule, schedule_task,
        get_user_preferences
    ]
    llm_with_tools = llm.bind_tools(tools)

    window = messages[-20:]
    
    # Sanitize ToolMessages for LLMs that don't support them well natively
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
                logger.warning("Planner Agent requested only duplicate tools. Blocking.")
                content = "I've already checked that information. Based on what I found, we can proceed with planning."
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
                logger.warning(f"Planner Agent exceeded budget ({count} + {len(valid_tool_calls)} > 5)")
                content = "I've reviewed quite a bit of your schedule. Let's focus on one specific task or day for now."
                return {
                    "final_insight": content,
                    "messages": [AIMessage(content=content)]
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
        logger.error(f"Planner Agent LLM Error: {e}")
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}
