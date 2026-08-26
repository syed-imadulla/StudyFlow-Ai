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

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class GoalStateUpdate(BaseModel):
    """The current understanding of the user's goal based on their latest message."""
    goal: str | None = Field(None, description="The core project, exam, or objective")
    why: str | None = Field(None, description="Motivation, desired outcome, or main concern")
    deadline: str | None = Field(None, description="Timeline or deadline")
    brain_dump: str | None = Field(None, description="Existing knowledge, ideas, or requirements")
    time: str | None = Field(None, description="Available time or daily commitment")
    resources: str | None = Field(None, description="Available resources, skills, budget, or materials")
    obstacles: str | None = Field(None, description="Potential obstacles or constraints")

def goal_extraction_node(state: Dict[str, Any]):
    logger.info("Executing goal_extraction_node")
    
    messages = state.get("messages", [])
    if not messages:
        return {}
        
    if not isinstance(messages[-1], HumanMessage):
        logger.info("Last message is not from Human, skipping extraction.")
        return {}
        
    current_goal_state = state.get("goal_state") or {}
    
    if os.getenv("MOCK_LLM") == "true":
        last_msg = messages[-1].content.lower()
        mock_state = dict(current_goal_state)
        if "goal" in last_msg or "build" in last_msg or "learn" in last_msg or "portfolio" in last_msg:
            mock_state["goal"] = messages[-1].content
        if "because" in last_msg or "want to" in last_msg:
            mock_state["why"] = "Mocked why"
        if "days" in last_msg or "weeks" in last_msg or "deadline" in last_msg:
            mock_state["deadline"] = "Mocked deadline"
        if "hours" in last_msg or "minutes" in last_msg or "time" in last_msg:
            mock_state["time"] = "Mocked time"
        return {"goal_state": mock_state}

    llm = get_llm()
    if not llm:
        return {}
        
    system_prompt = f"""You are an analytical state extractor for a goal planning AI.
Your job is to read the recent conversation and the CURRENT GOAL STATE, and output the FULLY UPDATED Goal State.

CURRENT GOAL STATE:
{json.dumps(current_goal_state, indent=2)}

INSTRUCTIONS:
1. Return the complete updated state across all 7 categories: goal, why, deadline, brain_dump, time, resources, obstacles.
2. If the user provides new information, ADD it to the state.
3. If the user provides more specific information or explicitly corrects something (e.g. "Actually I want to do X instead"), REPLACE the old value.
4. If the user says something ambiguous, DO NOT overwrite existing reliable information.
5. If the user completely changes their goal, UPDATE the goal and keep only relevant existing context.
6. Leave fields as null/None if they have not been provided yet.
7. Do NOT generate questions or conversational responses. ONLY output the structured state.
8. Be concise. Summarize the user's intent clearly for each field.
"""
    
    window = messages[-5:]
    input_messages = [SystemMessage(content=system_prompt)] + window
    
    try:
        structured_llm = llm.with_structured_output(GoalStateUpdate)
        res = structured_llm.invoke(input_messages)
        
        # Pydantic v2 dump
        new_state = res.model_dump(exclude_none=True) if hasattr(res, "model_dump") else res.dict(exclude_none=True)
        
        final_state = {
            "goal": new_state.get("goal") or current_goal_state.get("goal"),
            "why": new_state.get("why") or current_goal_state.get("why"),
            "deadline": new_state.get("deadline") or current_goal_state.get("deadline"),
            "brain_dump": new_state.get("brain_dump") or current_goal_state.get("brain_dump"),
            "time": new_state.get("time") or current_goal_state.get("time"),
            "resources": new_state.get("resources") or current_goal_state.get("resources"),
            "obstacles": new_state.get("obstacles") or current_goal_state.get("obstacles")
        }
        
        # But wait, if they change the goal, we want the LLM to nullify old stuff? 
        # The prompt says "output the FULLY UPDATED Goal State... Leave fields as null if they have not been provided yet."
        # If the LLM returns null for an old field because they changed the goal, it won't be in new_state.
        # So we actually want to just use what the LLM returned exactly, merging is risky.
        # Let's fix that.
        
        final_state_direct = {
            "goal": getattr(res, "goal", None),
            "why": getattr(res, "why", None),
            "deadline": getattr(res, "deadline", None),
            "brain_dump": getattr(res, "brain_dump", None),
            "time": getattr(res, "time", None),
            "resources": getattr(res, "resources", None),
            "obstacles": getattr(res, "obstacles", None)
        }
        
        logger.info(f"Extracted goal state: {json.dumps(final_state_direct)}")
        return {"goal_state": final_state_direct}
        
    except Exception as e:
        logger.error(f"Goal Extractor LLM Error: {e}")
        return {}

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
        
    current_goal_state = state.get("goal_state", {})
    
    system_prompt = f"""You are the IdeaLab Goal Architect, a highly structured AI assistant for StudyFlow.
Your job is to help users brainstorm, structure, and create new study/productivity goals.
You MUST NOT force a rigid 7-question format. Instead, you must deduce missing information adaptively.

CURRENT KNOWN INFORMATION (Goal State):
{json.dumps(current_goal_state, indent=2)}

INSTRUCTIONS:
1. Review the Current Known Information above.
2. If enough information exists to form a solid plan, DO NOT ask more questions. Use the `create_goal` tool immediately.
3. If critical information is still missing, you MUST ask EXACTLY ONE primary question about the most important missing category.
   - Do NOT ask multiple questions at once (e.g., do not ask "What is your deadline and how much time do you have?").
   - Ask contextually relevant questions. Don't ask a mechanical checklist question.
4. DO NOT ask the user for information that is already present in the Goal State or their previous messages.
5. If the user provides vague answers or changes their mind, acknowledge it naturally.
6. DO NOT hallucinate or invent requirements (e.g., do not add a database if they ask for a static site).

When using the `create_goal` tool:
- `subtasks`: ALWAYS provide a structured list of dictionaries for subtasks (containing title, description, priority). The title should be actionable. The description should be meaningful (not generic). Think about dependencies and logical order! (e.g., Plan -> Design -> Build -> Test).
- `rawDump`: Keep this as a simple bulleted fallback representation of the tasks.
- `ai_summary`: Provide a polished, human-friendly markdown proposal. This is the ONLY thing the user sees during confirmation. Start with a header "🎯 [Goal Title]". Then a short explanation of what you understood (Objective, Constraints, Resources). Then human-friendly fields like "Timeline:" (e.g., '30 days', not '30 days left'), "Daily commitment:", "Roadmap:" (list of the subtasks), and "Recommendations:" (if any). Do NOT use raw field names. Be professional.
- Deadline values: Use natural phrasing (e.g. 1 week, NOT 1 weeks).

Once you receive the tool execution result indicating success, DO NOT call the tool again. Confirm to the user that the goal was created successfully and summarize the next steps.

Be extremely natural, conversational, and concise (1-2 sentences max). Distinguish known facts from assumptions. If you infer something, ask to confirm.
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
