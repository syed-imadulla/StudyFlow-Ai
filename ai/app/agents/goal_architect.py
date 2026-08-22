import logging
import json
import os
from typing import Dict, Any
from app.llm.gemini import get_llm
from app.tools.registry import (
    get_active_goals, get_goal_details, get_todays_tasks, 
    get_goal_tasks, get_todays_schedule, get_upcoming_schedule
)
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logger = logging.getLogger(__name__)

def goal_architect_node(state: Dict[str, Any]):
    logger.info("Executing goal_architect_node")
    messages = state.get("messages", [])
    
    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break

    if os.getenv("MOCK_LLM") == "true":
        content = f"Mock Goal Architect response for: {last_msg}"
        
        if "simulate tool call" in last_msg.lower() or "simulate duplicate tool call" in last_msg.lower() or "simulate loop tool call" in last_msg.lower() or "simulate duplicate sequence" in last_msg.lower():
            # If the last message is from a tool, it means we just executed it
            if len(messages) > 1 and getattr(messages[-1], "type", "") == "tool" and "simulate loop tool call" not in last_msg.lower() and "simulate duplicate sequence" not in last_msg.lower():
                content = "Tool executed successfully."
                return {
                    "final_insight": content,
                    "messages": [AIMessage(content=content)]
                }
                
            # Simulate a tool call to get_active_goals
            # For loop tool call, we make the arguments different each time to bypass the duplicate filter
            args = {"dummy": f"arg_{len(messages)}"} if "simulate loop tool call" in last_msg.lower() else {"dummy": "arg"}
            
            tool_call = {
                "name": "get_active_goals",
                "args": args,
                "id": f"mock_call_{len(messages)}"
            }
            
            tool_calls = [tool_call]
            if "simulate duplicate tool call" in last_msg.lower():
                # Add duplicate in the same request array
                tool_calls.append(tool_call)
                
            mock_message = AIMessage(content="", tool_calls=tool_calls)
            
            # Enforce budget and prevent duplicates for mock branch too
            count = state.get("tool_call_count", 0)
            history = state.get("tool_calls_history", [])
            
            new_history = list(history)
            valid_tool_calls = []
            duplicate_tool_calls = []
            
            for tc in tool_calls:
                call_sig = f"{tc['name']}:{json.dumps(tc['args'], sort_keys=True)}"
                if call_sig in new_history:
                    duplicate_tool_calls.append(tc)
                else:
                    new_history.append(call_sig)
                    valid_tool_calls.append(tc)
                    
            if duplicate_tool_calls and not valid_tool_calls:
                content = "I've already checked that information. I should analyze what I have."
                return {
                    "final_insight": content,
                    "messages": [AIMessage(content=content)]
                }
                
            mock_message = AIMessage(content="", tool_calls=valid_tool_calls)
                
            if count + len(valid_tool_calls) > 5:
                content = "I'm sorry, I've had to process too much information. Could you simplify your request?"
                return {
                    "final_insight": content,
                    "messages": [AIMessage(content=content)]
                }
                
            return {
                "tool_call_count": count + len(valid_tool_calls),
                "tool_calls_history": new_history,
                "messages": [mock_message]
            }
            
        if "favorite subject" in last_msg.lower():
            for m in messages:
                if isinstance(m, HumanMessage) and "math" in m.content.lower():
                    content = "Your favorite subject is Math."
                    break
        
        return {
            "final_insight": content,
            "messages": [AIMessage(content=content)]
        }
        
    llm = get_llm()
    if not llm:
        return {"final_insight": "StudyFlow AI is currently offline."}
        
    system_prompt = """You are the Goal Architect, a helpful AI assistant for StudyFlow.
You help the user manage their goals, tasks, and study schedule.
You have access to tools to fetch the user's data.
You MUST NOT invent or hallucinate data. Only use what the tools return.
Do not ask for IDs unless you cannot find them using your tools.
"""
    
    tools = [
        get_active_goals, get_goal_details, get_todays_tasks, 
        get_goal_tasks, get_todays_schedule, get_upcoming_schedule
    ]
    
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
                logger.warning("Goal Architect requested only duplicate tools. Blocking.")
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
                # Cancel tools, budget exceeded
                logger.warning(f"Goal Architect exceeded budget ({count} + {len(valid_tool_calls)} > 5)")
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
        logger.error(f"Goal Architect LLM Error: {e}")
        return {"final_insight": "StudyFlow AI is currently offline."}
