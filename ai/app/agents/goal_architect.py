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
# Phase 2: Structured extraction schema
# ---------------------------------------------------------------------------

class GoalFieldExtraction(BaseModel):
    """
    Structured extraction result from a single user message.
    Each field is Optional — only fields EXPLICITLY present in the
    user's message should be set. Do NOT infer or hallucinate values.
    """
    goal: Optional[str] = Field(
        default=None,
        description=(
            "The primary goal the user wants to accomplish. "
            "Set ONLY if the user explicitly states or changes their goal."
        )
    )
    why: Optional[str] = Field(
        default=None,
        description=(
            "The motivation, reason, or desired outcome. "
            "Set only if the user mentions WHY they want to achieve this."
        )
    )
    deadline: Optional[str] = Field(
        default=None,
        description="When the user wants to finish. Set only if a time or date is explicitly mentioned."
    )
    brain_dump: Optional[str] = Field(
        default=None,
        description=(
            "Existing knowledge, requirements, desired features, or constraints the user mentions. "
            "Set only when user shares relevant project context."
        )
    )
    time: Optional[str] = Field(
        default=None,
        description=(
            "How many hours per day/week the user can dedicate. "
            "Set only if explicitly stated. REPLACES any prior value when a correction occurs."
        )
    )
    resources: Optional[str] = Field(
        default=None,
        description=(
            "Technologies, tools, skills, links, or materials available to the user. "
            "Set only if the user explicitly mentions them."
        )
    )
    obstacles: Optional[str] = Field(
        default=None,
        description="Challenges, blockers, or concerns the user mentions. Set only if explicit."
    )
    goal_changed: bool = Field(
        default=False,
        description=(
            "Set to true ONLY if the user explicitly replaces their previous goal with a different one "
            "(e.g. 'Actually, I want to build X instead'). "
            "Do NOT set true for goal clarifications or elaborations."
        )
    )
    corrections: list[str] = Field(
        default_factory=list,
        description=(
            "List of field names the user is explicitly correcting "
            "(e.g. 'time', 'deadline'). "
            "Used to ensure corrected value replaces the old one."
        )
    )


# ---------------------------------------------------------------------------
# Phase 2C: Extraction helpers
# ---------------------------------------------------------------------------

def _mock_extract(last_msg: str, goal_state: dict) -> GoalFieldExtraction:
    """
    Deterministic mock extraction for MOCK_LLM=true (unit tests without live LLM).
    """
    msg_lower = last_msg.lower()
    extracted = GoalFieldExtraction()

    # Goal change detection
    goal_change_phrases = [
        "actually i want", "actually, i want", "instead i want", "instead, i want",
        "changed my mind", "finance tracker instead", "weather app instead",
        "want to learn spanish",
    ]
    if any(p in msg_lower for p in goal_change_phrases):
        extracted.goal_changed = True

    # Goal extraction
    if "react portfolio" in msg_lower or ("portfolio" in msg_lower and "react" in msg_lower):
        extracted.goal = "Build a React portfolio"
    elif "finance tracker" in msg_lower:
        extracted.goal = "Build a finance tracker"
        extracted.goal_changed = True
    elif "weather app" in msg_lower and "actually" not in msg_lower:
        extracted.goal = "Build a weather app"
    elif "dsa" in msg_lower or "data structures" in msg_lower:
        extracted.goal = "Learn Data Structures and Algorithms (DSA)"
    elif "semester exam" in msg_lower or ("exam" in msg_lower and "prepare" in msg_lower):
        extracted.goal = "Prepare for semester exams"
    elif "learn spanish" in msg_lower:
        extracted.goal = "Learn Spanish"
        extracted.goal_changed = True
    elif "vue" in msg_lower and "portfolio" in msg_lower:
        extracted.goal = "Build a Vue portfolio"

    # Deadline
    for phrase in ["30 days", "20 days", "10 days", "1 month", "3 months", "3 weeks", "2 weeks", "1 week"]:
        if phrase in msg_lower:
            extracted.deadline = phrase
            break

    # Time — corrections are explicit ("actually", "only", correction indicators)
    is_time_correction = any(w in msg_lower for w in ["actually", "only", "instead", "correction"])
    if "2 hours" in msg_lower and not is_time_correction:
        extracted.time = "2 hours/day"
    elif "4 hours" in msg_lower:
        extracted.time = "4 hours/day"
    elif "3 hours" in msg_lower:
        extracted.time = "3 hours/evening"
    elif "1 hour" in msg_lower:
        if "weekday" in msg_lower:
            extracted.time = "1 hour on weekdays"
        else:
            extracted.time = "1 hour/day"
        if is_time_correction:
            extracted.corrections.append("time")

    # Resources / skills
    if "react" in msg_lower and "tailwind" in msg_lower:
        extracted.resources = "React, Tailwind CSS"
    elif "react" in msg_lower and "node" in msg_lower:
        extracted.resources = "React, Node.js"
    elif "c++" in msg_lower:
        extracted.resources = "Basic C++"
    elif "vue" in msg_lower and ("portfolio" in msg_lower or "instead" in msg_lower):
        extracted.resources = "Vue.js"

    # Why / motivation
    if "internship" in msg_lower:
        extracted.why = "Targeting internships"
    elif "freelance" in msg_lower:
        extracted.why = "Targeting freelance work"
    elif "get a job" in msg_lower or "find a job" in msg_lower:
        extracted.why = "Job seeking"

    # Obstacles
    if "struggle" in msg_lower or ("difficult" in msg_lower and "find" not in msg_lower) or "hard time" in msg_lower:
        extracted.obstacles = last_msg

    return extracted


def _merge_goal_state(existing: dict, extraction: GoalFieldExtraction) -> dict:
    """
    Merge extracted fields into the existing goal_state.

    Merge rules (in priority order):
    1. goal_changed=True  -> update goal, clear brain_dump (context reset).
                            Preserve time/resources/obstacles (may still apply).
    2. field in corrections -> always replace with new value.
    3. Field not yet in existing -> add the new value.
    4. Field already set, new value is more specific (longer) -> replace.
    5. Ambiguous / no new value extracted -> leave existing untouched.
    """
    merged = dict(existing)
    fields = ["goal", "why", "deadline", "brain_dump", "time", "resources", "obstacles"]

    if extraction.goal_changed and extraction.goal:
        merged["goal"] = extraction.goal
        merged.pop("brain_dump", None)
        # time/resources/obstacles are kept unless explicitly reset

    for field in fields:
        if field == "goal" and extraction.goal_changed:
            continue  # Already handled above

        val = getattr(extraction, field, None)
        if val is None:
            continue  # Not mentioned — leave existing alone

        existing_val = merged.get(field)

        if existing_val is None:
            # Brand-new information
            merged[field] = val
        elif field in extraction.corrections:
            # Explicit correction — always replace
            merged[field] = val
        elif len(str(val)) > len(str(existing_val)):
            # New value is more specific / longer — replace
            merged[field] = val
        # If new value is shorter or same length, keep existing (more complete) value
        # else: same or shorter — keep existing

    return merged


def goal_extraction_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Phase 2C: Structured Goal Extraction Node.

    Analyzes the latest user message against the existing goal_state
    and returns a merged, updated goal_state. Does NOT emit any messages.
    Runs before goal_architect_node in the graph.
    """
    logger.info("Executing goal_extraction_node")
    messages = state.get("messages", [])
    existing_goal_state = state.get("goal_state") or {}

    # Find the latest human message
    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break

    if not last_msg:
        return {"goal_state": existing_goal_state}

    # --- MOCK path for unit tests ---
    if os.getenv("MOCK_LLM") == "true":
        extracted = _mock_extract(last_msg, existing_goal_state)
        merged = _merge_goal_state(existing_goal_state, extracted)
        logger.info(f"[MOCK] goal_state after extraction: {merged}")
        return {"goal_state": merged}

    # --- Live LLM structured extraction ---
    llm = get_llm()
    if not llm:
        logger.warning("goal_extraction_node: LLM unavailable, keeping existing goal_state")
        return {"goal_state": existing_goal_state}

    # Build compact conversation context (up to last 20 human/AI turns)
    context_messages = []
    turn_count = 0
    for m in reversed(messages):
        if isinstance(m, (HumanMessage, AIMessage)):
            context_messages.insert(0, m)
            turn_count += 1
            if turn_count >= 20:
                break

    existing_json = json.dumps(existing_goal_state, indent=2) if existing_goal_state else "{}"

    extraction_system = f"""You are a strict information extraction engine for a goal-planning assistant.

Your ONLY task: extract structured goal information from the user's LATEST message.

CURRENT KNOWN INFORMATION (goal_state already captured):
{existing_json}

RULES — FOLLOW EXACTLY:
1. Extract ONLY fields EXPLICITLY mentioned in the user's latest message.
2. Do NOT infer, assume, or hallucinate values.
3. Do NOT extract fields already in goal_state UNLESS the user is correcting or updating them.
4. If the user provides a more specific value for a field already set, mark that field in corrections.
5. If the user explicitly changes their overall goal (says "actually I want X instead"), set goal_changed=true.
6. If the user is vague ("not sure", "maybe"), extract nothing for that field.
7. Preserve existing goal_state — only explicitly stated new information should be extracted.

LATEST USER MESSAGE:
"{last_msg}"
"""

    try:
        structured_llm = llm.with_structured_output(GoalFieldExtraction)
        input_msgs = [SystemMessage(content=extraction_system)] + context_messages[-10:]
        extraction: GoalFieldExtraction = structured_llm.invoke(input_msgs)
        merged = _merge_goal_state(existing_goal_state, extraction)
        logger.info(f"goal_state after extraction: {merged}")
        return {"goal_state": merged}
    except Exception as e:
        logger.error(f"goal_extraction_node LLM error: {e}. Keeping existing goal_state.")
        return {"goal_state": existing_goal_state}


# ---------------------------------------------------------------------------
# Phase 2D/E: Upgraded Goal Architect Node (with goal_state context injection)
# ---------------------------------------------------------------------------

def goal_architect_node(state: Dict[str, Any]):
    logger.info("Executing goal_architect_node")
    messages = state.get("messages", [])
    goal_state = state.get("goal_state") or {}

    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break

    if os.getenv("MOCK_LLM") == "true":
        content = f"Mock Goal Architect response for: {last_msg}"

        if ("simulate tool call" in last_msg.lower() or "simulate action tool" in last_msg.lower()
                or "simulate duplicate tool call" in last_msg.lower()
                or "simulate loop tool call" in last_msg.lower()
                or "simulate duplicate sequence" in last_msg.lower()
                or "create a goal" in last_msg.lower()):
            if (len(messages) > 1
                    and getattr(messages[-1], "type", "") == "tool"
                    and "simulate loop tool call" not in last_msg.lower()
                    and "simulate duplicate sequence" not in last_msg.lower()):
                content = "Tool executed successfully."
                return {"final_insight": content, "messages": [AIMessage(content=content)]}

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

            tool_call = {"name": tool_name, "args": args, "id": f"mock_call_{len(messages)}"}
            tool_calls = [tool_call]
            if "simulate duplicate tool call" in last_msg.lower():
                tool_calls.append(tool_call)

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
                return {"final_insight": content, "messages": [AIMessage(content=content)]}

            mock_message = AIMessage(content="", tool_calls=valid_tool_calls)

            if count + len(valid_tool_calls) > 5:
                content = "I'm sorry, I've had to process too much information. Could you simplify your request?"
                return {"final_insight": content, "messages": [AIMessage(content=content)]}

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

        return {"final_insight": content, "messages": [AIMessage(content=content)]}

    llm = get_llm()
    if not llm:
        return {"final_insight": "StudyFlow AI is temporarily unavailable."}

    # --- Build goal_state context block for the system prompt ---
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

    if known_lines:
        goal_state_block = "WHAT I ALREADY KNOW:\n" + "\n".join(known_lines)
    else:
        goal_state_block = "WHAT I ALREADY KNOW:\n  (Nothing yet — this is the opening message.)"

    missing_fields = [field_labels[f] for f in field_labels if not goal_state.get(f)]
    missing_str = ", ".join(missing_fields) if missing_fields else "None — consider creating the plan."

    system_prompt = f"""You are the IdeaLab Goal Architect, a highly intelligent conversational goal-planning AI for StudyFlow.

{goal_state_block}

CURRENTLY MISSING INFORMATION: {missing_str}

YOUR RULES — FOLLOW EXACTLY:

1. NEVER ASK FOR INFORMATION ALREADY IN "WHAT I ALREADY KNOW".
   The structured extraction system has captured it. Trust it completely and do not re-ask.

2. ASK EXACTLY ONE PRIMARY QUESTION per turn.
   Choose the single most valuable missing piece for this specific user's goal.
   Never combine two questions (e.g. "What is X and also Y?" is forbidden).

3. SELECT THE QUESTION INTELLIGENTLY based on goal type:
   - PROJECT (website, app, tool): scope and features -> tech/skills -> time -> why -> obstacles
   - EXAM (semester, competitive): subjects -> exam date -> weak areas -> study time
   - LEARNING (language, DSA, skill): current level -> target outcome -> time -> preference
   - PERSONAL (fitness, reading): desired outcome -> frequency -> deadline -> current routine
   Do NOT follow a rigid 1->2->3->4->5->6->7 sequence. Adapt to the goal type and context.

4. KNOW WHEN TO STOP:
   When you have enough for a quality plan (goal + 3 to 4 solid fields), use create_goal.
   Do NOT artificially extend questioning to fill all 7 categories.

5. HANDLE VAGUE ANSWERS:
   If the user says "not sure" — help them narrow down by offering 2-3 concrete alternatives.
   Do NOT repeat the same question verbatim.

6. HANDLE GOAL CHANGES:
   If the user has changed their goal (visible in the conversation history),
   treat the new goal as authoritative and do not reference the old goal.

7. STYLE:
   - Warm, natural, concise (2-3 sentences max per response).
   - Acknowledge what the user shared before asking the next question.
   - Avoid hollow fillers like "Great!" or "Awesome!".

When using create_goal:
- subtasks: Structured list with title, description, priority. Be specific and logically ordered.
- rawDump: Simple bulleted fallback.
- ai_summary: Polished markdown starting with "🎯 [Goal Title]".
  Include: Objective, Timeline, Daily commitment, Roadmap, Recommendations.
- Use natural deadline phrasing (e.g. "30 days", not "30 days left").

Once a tool executes successfully, confirm to the user and DO NOT call it again.
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
                logger.warning("Goal Architect requested only duplicate tools. Blocking.")
                content = "I've already checked that information. I should analyze what I have."
                return {"final_insight": content, "messages": [AIMessage(content=content)]}

            if duplicate_tool_calls:
                logger.info(f"Filtering {len(duplicate_tool_calls)} duplicate tool calls")
                response = AIMessage(
                    content=response.content,
                    tool_calls=valid_tool_calls,
                    response_metadata=response.response_metadata,
                    id=response.id
                )

            if count + len(valid_tool_calls) > 5:
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

        return {"final_insight": content, "messages": [response]}

    except Exception as e:
        import traceback
        logger.error(f"Goal Architect LLM Error: {e}")
        logger.error(traceback.format_exc())
        return {"final_insight": handle_llm_error(e) if "e" in locals() else "StudyFlow AI is temporarily unavailable."}
