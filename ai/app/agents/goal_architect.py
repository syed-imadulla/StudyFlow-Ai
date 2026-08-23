import logging
import json
import os
from typing import Dict, Any
from app.llm.provider import get_llm, handle_llm_error
from app.tools.registry import (
    get_active_goals, get_goal_details, get_todays_tasks, 
    get_goal_tasks, get_todays_schedule, get_upcoming_schedule,
    create_goal, get_user_preferences, save_user_preference, schedule_task
)
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

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
        
        if "simulate tool call" in last_msg.lower() or "simulate action tool" in last_msg.lower() or "simulate duplicate tool call" in last_msg.lower() or "simulate loop tool call" in last_msg.lower() or "simulate duplicate sequence" in last_msg.lower() or "create a goal" in last_msg.lower():
            # If the last message is from a tool, it means we just executed it
            if len(messages) > 1 and getattr(messages[-1], "type", "") == "tool" and "simulate loop tool call" not in last_msg.lower() and "simulate duplicate sequence" not in last_msg.lower():
                content = "Tool executed successfully."
                return {
                    "final_insight": content,
                    "messages": [AIMessage(content=content)]
                }
                
            # Simulate a tool call to get_active_goals or create_goal
            # For loop tool call, we make the arguments different each time to bypass the duplicate filter
            args = {"dummy": f"arg_{len(messages)}"} if "simulate loop tool call" in last_msg.lower() else {"dummy": "arg"}
            tool_name = "get_active_goals"
            
            if "simulate action tool" in last_msg.lower() or "create a goal" in last_msg.lower():
                tool_name = "create_goal"
                args = {
                    "title": "Test Goal", 
                    "description": "Desc", 
                    "targetHours": 10,
                    "rawDump": "- Subtask 1\n- Subtask 2",
                    "ai_summary": "🎯 Test Goal\n\nThis is a mock summary.",
                    "subtasks": [
                        {"title": "Subtask 1", "description": "Desc 1", "priority": "HIGH"},
                        {"title": "Subtask 2", "description": "Desc 2", "priority": "MEDIUM"}
                    ],
                    "deadline_mode": "DURATION",
                    "deadline_value": 7,
                    "deadline_unit": "days"
                }
            
            tool_call = {
                "name": tool_name,
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
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}
        
    system_prompt = """You are the IdeaLab Goal Architect, a highly structured AI assistant for StudyFlow.
Your job is to help users brainstorm, structure, and create new study/productivity goals.
You MUST NOT force a rigid 7-question format. Instead, you must deduce missing information adaptively.

1. First, identify the type of goal the user wants:
   - PROJECT (e.g., build a website, code an app) -> Needs: outcome, scope, existing skills, tech stack, deadline, available time.
   - EXAM (e.g., semester exams, SATs) -> Needs: subjects, exam dates, syllabus, weak areas, available time.
   - LEARNING (e.g., learn DSA, learn Spanish) -> Needs: current level, target level, motivation, practice preference, available time.
   - PERSONAL (e.g., read 10 books, workout) -> Needs: desired outcome, current routine, obstacles, frequency, deadline.

2. Check what information you already have from their messages.
   - USE the `get_user_preferences` tool to retrieve any long-term preferences the user previously saved.
   - If the user tells you a new preference, USE the `save_user_preference` tool to remember it for future conversations.

3. Ask ONLY the most important missing question next. DO NOT ask questions you already know the answer to. Ask a maximum of 1 or 2 questions per turn.

4. DO NOT hallucinate or invent requirements (e.g., do not add a database if they ask for a static site, do not add authentication if not requested). If you have a good idea that wasn't requested, suggest it first rather than silently adding it.

5. If you have enough information to form a solid plan, use the `create_goal` tool.

When using the `create_goal` tool:
- `subtasks`: ALWAYS provide a structured list of dictionaries for subtasks (containing title, description, priority). The title should be actionable. The description should be meaningful (not generic). Think about dependencies and logical order! (e.g., Plan -> Design -> Build -> Test).
- `rawDump`: Keep this as a simple bulleted fallback representation of the tasks.
- `ai_summary`: Provide a polished, human-friendly markdown proposal. This is the ONLY thing the user sees during confirmation. Start with a header "🎯 [Goal Title]". Then a short explanation of what you understood (Objective, Constraints, Resources). Then human-friendly fields like "Timeline:" (e.g., '30 days', not '30 days left'), "Daily commitment:", "Roadmap:" (list of the subtasks), and "Recommendations:" (if any). Do NOT use raw field names. Be professional.
- Deadline values: Use natural phrasing (e.g. 1 week, NOT 1 weeks).

Once you receive the tool execution result indicating success, DO NOT call the tool again. Confirm to the user that the goal was created successfully and summarize the next steps.

Be extremely natural, conversational, and concise (2-3 sentences max). Distinguish known facts from assumptions. If you infer something, ask to confirm.
"""
    
    from app.tools.registry import create_goal, schedule_task, get_user_preferences, save_user_preference
    tools = [
        get_active_goals, get_goal_details, get_todays_tasks, 
        get_goal_tasks, get_todays_schedule, get_upcoming_schedule,
        create_goal, schedule_task, get_user_preferences, save_user_preference
    ]
    
    llm_with_tools = llm.bind_tools(tools)
    
    window = messages[-20:]
    
    # Sanitize ToolMessages for LLMs that reject OpenAI ToolMessage format (like Llama-3)
    sanitized_window = []
    from langchain_core.messages import ToolMessage
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
        logger.info(f"Goal Architect Response: content='{content}', tool_calls={getattr(response, 'tool_calls', [])}")
        
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
        import traceback
        logger.error(f"Goal Architect LLM Error: {e}")
        logger.error(traceback.format_exc())
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}
