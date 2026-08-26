import logging
import json
import os
import uuid
from typing import Dict, Any, List
from app.llm.provider import get_llm, handle_llm_error
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from pydantic import BaseModel, Field
from app.tools.registry import create_goal

logger = logging.getLogger(__name__)

class GoalStateUpdate(BaseModel):
    """The complete, fully updated state of the user's goal based on the entire conversation."""
    goal: str | None = Field(None, description="The core project, exam, or objective")
    why: str | None = Field(None, description="Motivation, desired outcome, or main concern")
    deadline: str | None = Field(None, description="Timeline or deadline")
    brain_dump: str | None = Field(None, description="Existing knowledge, ideas, or requirements")
    time: str | None = Field(None, description="Available time or daily commitment")
    resources: str | None = Field(None, description="Available resources, skills, budget, or materials")
    obstacles: str | None = Field(None, description="Potential obstacles or constraints")

def has_quantified_scope(goal_str: str) -> bool:
    if not goal_str:
        return False
    s = str(goal_str).lower()
    return any(c.isdigit() for c in s) or "project" in s or "chapter" in s or "module" in s or "exam" in s or "gate" in s or "rank" in s or "score" in s

def _clean_val(val):
    if val is None:
        return None
    if str(val).lower().strip() in ["null", "none", "", "n/a", "unknown", "tbd", "to be determined", "not specified"]:
        return None
    return val

def handle_mock_llm(messages, last_msg, current_goal_state, state):
    content = f"Mock Goal Architect response for: {last_msg}"
    mock_state = dict(current_goal_state)
    
    last_msg_lower = last_msg.lower()
    
    # State Mocking
    if "goal" in last_msg_lower or "build" in last_msg_lower or "learn" in last_msg_lower or "portfolio" in last_msg_lower or "tracker" in last_msg_lower or "gate" in last_msg_lower:
        if "finance tracker" in last_msg_lower:
            mock_state = {"goal": "personal finance tracker"} # Goal change resets
        else:
            mock_state["goal"] = last_msg
    if "days" in last_msg_lower or "weeks" in last_msg_lower or "deadline" in last_msg_lower:
        if "4 weeks" in last_msg_lower:
            mock_state["deadline"] = "4 weeks"
        else:
            mock_state["deadline"] = last_msg
    if "hours" in last_msg_lower or "minutes" in last_msg_lower or "time" in last_msg_lower:
        if "1 hour on weekdays" in last_msg_lower:
            mock_state["time"] = "1 hour on weekdays"
        else:
            mock_state["time"] = last_msg
            
    is_ready = bool(mock_state.get("goal") and (mock_state.get("deadline") or mock_state.get("time")) and (mock_state.get("brain_dump") or has_quantified_scope(mock_state.get("goal"))))
    
    if "simulate action tool" in last_msg_lower or "create a goal" in last_msg_lower or is_ready:
        tool_call = {
            "name": "create_goal",
            "args": {
                "title": "Test Goal", 
                "description": "Desc", 
                "targetHours": 10,
                "rawDump": "- Subtask 1",
                "ai_summary": "🎯 Test Goal",
                "subtasks": [{"title": "Subtask 1", "description": "Desc 1", "priority": "HIGH"}],
                "deadline_mode": "DURATION"
            },
            "id": f"mock_call_{uuid.uuid4().hex[:8]}"
        }
        return {
            "goal_state": mock_state,
            "is_goal_ready": True,
            "final_insight": "Creating goal.",
            "messages": [AIMessage(content="", tool_calls=[tool_call])]
        }
    
    return {
        "goal_state": mock_state,
        "is_goal_ready": False,
        "final_insight": "What projects will you showcase?",
        "messages": [AIMessage(content="What projects will you showcase?")]
    }

def goal_architect_node(state: Dict[str, Any]):
    logger.info("Executing goal_architect_node")
    messages = state.get("messages", [])
    
    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break

    current_goal_state = state.get("goal_state") or {}
    
    if os.getenv("MOCK_LLM") == "true":
        return handle_mock_llm(messages, last_msg, current_goal_state, state)

    llm = get_llm()
    if not llm:
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}

    # STEP 1: EXTRACT STATE
    extraction_sys = f"""You are an analytical state extractor for a goal planning AI.
Your job is to read the conversation and output the FULLY UPDATED Goal State.

CURRENT GOAL STATE:
{json.dumps(current_goal_state, indent=2)}

INSTRUCTIONS:
1. Return the complete updated state across all 7 categories.
2. If the user provides new information, ADD it.
3. If the user provides a correction, REPLACE the old value (Latest explicit correction wins).
4. If the user completely changes their goal (e.g. "Actually, forget the portfolio. I want X"), UPDATE the goal and DISCARD irrelevant old context (set them to null).
5. DO NOT hallucinate. Leave fields as null if not provided.
"""
    
    window = messages[-5:]
    input_messages = [SystemMessage(content=extraction_sys)] + window
    
    try:
        structured_llm = llm.with_structured_output(GoalStateUpdate)
        res = structured_llm.invoke(input_messages)
        
        # We don't merge with current_goal_state blindly, we let the LLM do it.
        # This allows the LLM to nullify fields if the goal changed.
        new_state = {
            "goal": _clean_val(getattr(res, "goal", None)),
            "why": _clean_val(getattr(res, "why", None)),
            "deadline": _clean_val(getattr(res, "deadline", None)),
            "brain_dump": _clean_val(getattr(res, "brain_dump", None)),
            "time": _clean_val(getattr(res, "time", None)),
            "resources": _clean_val(getattr(res, "resources", None)),
            "obstacles": _clean_val(getattr(res, "obstacles", None))
        }
    except Exception as e:
        logger.error(f"Goal Extractor Error: {e}")
        new_state = current_goal_state

    # STEP 2: DETERMINISTIC READINESS CHECK
    is_ready = False
    if new_state.get("goal"):
        has_scope = bool(new_state.get("brain_dump")) or has_quantified_scope(new_state.get("goal"))
        has_logistics = bool(new_state.get("deadline")) or bool(new_state.get("time"))
        if has_scope and has_logistics:
            is_ready = True
            
    logger.info(f"Extracted state: {json.dumps(new_state)} | is_ready: {is_ready}")

    # STEP 3: CONVERSATIONAL RESPONSE / TOOL CALL
    if is_ready:
        system_prompt = f"""You are the IdeaLab Goal Architect.
The user has provided enough information to form a concrete actionable plan.

CURRENT KNOWN INFORMATION:
{json.dumps(new_state, indent=2)}

INSTRUCTION: You MUST immediately use the `create_goal` tool to propose the plan based on the known information. DO NOT ask any more questions. DO NOT ask a 7-step questionnaire.

When using the `create_goal` tool:
- `subtasks`: Provide a structured list of dictionaries for subtasks (title, description, priority). Think about dependencies!
- `rawDump`: Keep this as a simple bulleted fallback representation of the tasks.
- `ai_summary`: Provide a polished, human-friendly markdown proposal. This is the ONLY thing the user sees during confirmation. Start with a header "🎯 [Goal Title]". Include Timeline, Daily commitment, Roadmap, and Recommendations. Be professional.
"""
    else:
        system_prompt = f"""You are the IdeaLab Goal Architect, a highly intelligent AI assistant.
Your job is to help users brainstorm and structure study/productivity goals through a NATURAL conversation.

CURRENT KNOWN INFORMATION:
{json.dumps(new_state, indent=2)}

INSTRUCTIONS:
1. Review the Current Known Information.
2. Ask EXACTLY ONE intelligent, contextual question to gather the most valuable missing information.
3. NEVER ask a mechanical question like "Why do you want this?" or "What obstacles do you have?" unless it's genuinely the most critical missing context.
4. DO NOT ask multiple questions.
5. DO NOT ask for information that is already provided.
6. Acknowledge what the user just said naturally before asking your ONE question.
7. The conversation should flow naturally, not like a form to fill out.
"""
    
    tools = [create_goal]
    llm_with_tools = llm.bind_tools(tools)
    
    # Sanitize ToolMessages
    sanitized_window = []
    for msg in messages[-10:]:
        if isinstance(msg, ToolMessage):
            sanitized_window.append(HumanMessage(content=f"[Tool {msg.name} execution result]: {msg.content}"))
        elif getattr(msg, "type", "") == "tool":
            sanitized_window.append(HumanMessage(content=f"[Tool execution result]: {msg.content}"))
        else:
            sanitized_window.append(msg)
            
    response_input = [SystemMessage(content=system_prompt)] + sanitized_window
    
    try:
        response = llm_with_tools.invoke(response_input)
        content = response.content.strip() if response.content else ""
        
        return {
            "goal_state": new_state,
            "is_goal_ready": is_ready,
            "final_insight": content,
            "messages": [response]
        }
    except Exception as e:
        import traceback
        logger.error(f"Goal Architect Error: {e}")
        logger.error(traceback.format_exc())
        return {
            "goal_state": new_state,
            "is_goal_ready": is_ready,
            "final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable.",
            "messages": []
        }
