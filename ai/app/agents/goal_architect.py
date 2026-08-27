import logging
import json
import os
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.llm.provider import get_llm, handle_llm_error
from app.tools.registry import (
    get_active_goals, get_goal_details, get_todays_tasks, 
    get_goal_tasks, get_todays_schedule, get_upcoming_schedule,
    create_goal, get_user_preferences, save_user_preference, schedule_task
)
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Phase 3: Single-call extraction & response logic
# ---------------------------------------------------------------------------

class GoalStateUpdate(BaseModel):
    goal: Optional[str] = Field(default=None, description="The primary goal. Set ONLY if stated/changed.")
    why: Optional[str] = Field(default=None, description="Motivation/underlying reason.")
    deadline: Optional[str] = Field(default=None, description="When to finish.")
    brain_dump: Optional[str] = Field(default=None, description="Features/constraints/context.")
    time: Optional[str] = Field(default=None, description="Hours available.")
    resources: Optional[str] = Field(default=None, description="Tools/skills.")
    obstacles: Optional[str] = Field(default=None, description="Challenges.")
    goal_changed: bool = Field(default=False, description="True if replacing goal entirely.")
    corrections: list[str] = Field(default_factory=list, description="Fields explicitly corrected by user.")

class UpdateStateAndRespond(BaseModel):
    """
    Use this tool to respond to the user and update the internal goal state.
    """
    message: str = Field(..., description="The rich conversational response for the sidebar. (Acknowledgement, reasoning, brainstorming).")
    center_question: Optional[str] = Field(..., description="Exactly ONE concise sentence representing the most useful next question/action to show in the center UI. Leave null if planning is ready.")
    goal_state_update: GoalStateUpdate = Field(..., description="Any new or corrected information extracted from the latest user message.")
    planning_ready: bool = Field(..., description="True if you have enough information to create a meaningful plan.")

def _merge_goal_state(existing: dict, extraction: dict) -> dict:
    merged = dict(existing)
    fields = ["goal", "why", "deadline", "brain_dump", "time", "resources", "obstacles"]

    goal_changed = extraction.get("goal_changed", False)
    corrections = extraction.get("corrections", [])

    if goal_changed and extraction.get("goal"):
        merged["goal"] = extraction["goal"]
        merged.pop("brain_dump", None)

    for field in fields:
        if field == "goal" and goal_changed:
            continue

        val = extraction.get(field)
        if isinstance(val, str) and val.strip().lower() in ["null", "none", "n/a", "", "not mentioned"]:
            val = None

        if val is None:
            continue

        existing_val = merged.get(field)
        if isinstance(existing_val, str) and existing_val.strip().lower() in ["null", "none", "n/a", "", "not mentioned"]:
            existing_val = None

        if existing_val is None:
            merged[field] = val
        elif field in corrections:
            merged[field] = val
        elif len(str(val)) > len(str(existing_val)):
            merged[field] = val

    return merged

# ---------------------------------------------------------------------------
# Goal Architect Node
# ---------------------------------------------------------------------------

def goal_architect_node(state: Dict[str, Any]):
    logger.info("Executing goal_architect_node (Phase 3 1-call)")
    messages = state.get("messages", [])
    goal_state = state.get("goal_state") or {}

    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break
            
    # --- MOCK path for unit tests ---
    if os.getenv("MOCK_LLM") == "true":
        logger.info("[MOCK] Goal Architect bypass")
        from app.agents.goal_architect_mock import _mock_extract # Not strictly needed if MOCK_LLM bypasses logic. Wait, earlier test used MOCK_LLM to simulate duplicate tools etc. For this, I'll just return a dummy response.
        content = "Mock response"
        return {"final_insight": content, "messages": [AIMessage(content=content)]}

    llm = get_llm()
    if not llm:
        return {"final_insight": "StudyFlow AI is temporarily unavailable."}

    # Context Block
    field_labels = {
        "goal": "Goal",
        "why": "Motivation / Why",
        "deadline": "Deadline",
        "brain_dump": "Existing Knowledge / Requirements",
        "time": "Available Time",
        "resources": "Resources / Skills / Tools",
        "obstacles": "Potential Obstacles",
    }
    known_lines = []
    for key, label in field_labels.items():
        val = goal_state.get(key)
        if val:
            known_lines.append(f"  * {label}: {val}")

    goal_state_block = "WHAT I ALREADY KNOW:\n" + ("\n".join(known_lines) if known_lines else "  (Nothing yet)")

    system_prompt = f"""You are the IdeaLab Goal Architect, an AI Thinking Partner for StudyFlow.
"Most apps manage tasks. StudyFlow helps you think."

{goal_state_block}

YOUR RULES — FOLLOW EXACTLY:

1. ONE LLM CALL ARCHITECTURE
   You MUST always call `UpdateStateAndRespond` to reply. 
   The `message` parameter (sidebar) is for reasoning, encouragement, or acknowledging context.
   The `center_question` parameter MUST contain EXACTLY ONE CONCISE QUESTION, or be null.

2. CENTER QUESTION VS SIDEBAR
   - The sidebar `message` MUST NEVER duplicate the `center_question`.
   - The sidebar `message` MUST NEVER secretly introduce another question.
   - The sidebar is your mentor voice. The center is your single structured question.

3. QUESTION SELECTION
   Before asking any question, ask yourself: "Is it IMPOSSIBLE to build a useful plan without this answer?"
   If NO: DO NOT ASK IT.
   If YES: ask exactly ONE concise question.
   NEVER ask for information merely because an internal field is empty (like resources or obstacles).
   NEVER ask clarifying questions about scope (e.g. "Do you want to add new projects or use existing ones?") if the current context is already sufficient to build a plan. Assume they want to use what they stated.
   NEVER combine multiple questions.

4. STOP CONDITION (INFORMATION-DRIVEN READINESS)
   When you have enough information to create a meaningful plan, you MUST:
   - set `planning_ready=true`
   - leave `center_question` null
   - STOP asking questions (do NOT ask a final confirmation question)
   - call the `create_goal` tool in the SAME turn.
   (e.g. If they have a goal, tech stack, timeline, and daily hours, that is enough to generate a plan. If they mention existing projects, use them. DO NOT ask if they want more.)

5. EXTRACTING CONTEXT
   In `goal_state_update`, extract ONLY explicitly stated information. If they completely change their goal, set `goal_changed=true` so old assumptions are dropped.

6. PROPOSAL QUALITY & STRUCTURE
   When you call `create_goal`, your `ai_summary` MUST be a highly detailed, actionable Markdown blueprint generated STRICTLY from the entire conversation.
   Do NOT invent facts, new deadlines, or arbitrary technologies. If they gave you 3 projects, use those 3 projects.
   Structure the blueprint thoughtfully (only use sections that make sense):
   # [Goal Title]
   ### Objective
   ### Strategy
   ### Milestones
   ### Tasks
   ### Timeline
   ### Deliverables
   ### Risks
   ### Success Criteria
"""

    tools = [
        UpdateStateAndRespond,
        create_goal, schedule_task, get_active_goals, get_goal_details, 
        get_todays_tasks, get_goal_tasks, get_todays_schedule, get_upcoming_schedule,
        get_user_preferences, save_user_preference
    ]

    llm_with_tools = llm.bind_tools(tools)
    window = messages[-20:]

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
        import time
        t_llm_start = time.time()
        logger.info(f"LLM_START: {t_llm_start}")
        
        response = llm_with_tools.invoke(input_messages)
        
        t_llm_end = time.time()
        logger.info(f"LLM_END: {t_llm_end}")
        logger.info(f"LLM_DURATION_MS: {(t_llm_end - t_llm_start) * 1000:.2f}ms")
        
        content = response.content.strip() if response.content else ""
        logger.info(f"Goal Architect Response: content='{{content}}', tool_calls={{getattr(response, 'tool_calls', [])}}")
        
        new_messages = []
        final_insight = content
        merged_state = goal_state
        
        valid_tool_calls = []

        if hasattr(response, "tool_calls") and response.tool_calls:
            for tc in response.tool_calls:
                if tc["name"] == "UpdateStateAndRespond":
                    args = tc["args"]
                    msg = args.get("message", "")
                    center = args.get("center_question", "")
                    
                    if center:
                        final_insight = f"{msg}\n\n<center>{center}</center>"
                    else:
                        final_insight = msg
                        
                    # State update
                    update = args.get("goal_state_update", {})
                    merged_state = _merge_goal_state(goal_state, update)
                else:
                    valid_tool_calls.append(tc)

        # Fallback if no UpdateStateAndRespond was called
        if not final_insight and valid_tool_calls:
            final_insight = "I'm generating your proposal now..."

        mock_response = AIMessage(
            content=final_insight,
            tool_calls=valid_tool_calls,
            response_metadata=response.response_metadata if hasattr(response, "response_metadata") else {},
            id=response.id if hasattr(response, "id") else "mock_id"
        )
        new_messages.append(mock_response)

        return {
            "goal_state": merged_state,
            "final_insight": final_insight,
            "messages": new_messages
        }

    except Exception as e:
        import traceback
        logger.error(f"Goal Architect LLM Error: {e}")
        logger.error(traceback.format_exc())
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}


