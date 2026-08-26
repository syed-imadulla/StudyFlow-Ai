# IdeaLab Current Architecture

## 1. Frontend Architecture
The current IdeaLab frontend (`frontend/idealab.html`) is a static HTML file that uses Tailwind CSS for styling and vanilla JavaScript for logic.
- **Layout:** It features a linear sidebar, a top navigation bar, and a main content area split into two sections: a Center Stage for the primary input and a Right Column for the StudyFlow AI Guided Assistant chat feed.
- **Center Stage:** Contains a 7-step visual stepper at the top and a main input textarea (`stepInput`). Pressing Enter triggers `handleStepAdvance()`, which sends the text to the AI and manually increments the visual stepper.
- **Right Column (Chat):** Contains an `aiChatFeed` div to display messages, a set of clickable "Examples", and a secondary input bar (`aiAssistantInput`). Submitting this input triggers `handleAIChatSubmit()`, which sends text to the AI without incrementing the stepper.
- **Communication:** Both inputs route to `sendToAI(text)`, which makes an HTTP POST request to `/agent/chat` on the Node.js backend using `SF_HTTP`.
- **Modals:** A hidden `goalProposalModal` is populated and displayed when the backend returns a `pending_action` of type `create_goal`. It renders the `ai_summary` (using regex for Markdown-to-HTML conversion) and provides "Edit/Cancel" and "Approve & Create Goal" buttons.
- **Note:** The global `aiChat.js` floating widget is disabled on the `idealab.html` page to prevent conflicts.

## 2. Node Backend Architecture
The Node.js backend serves primarily as an API proxy and data persistence layer for IdeaLab.
- **API Proxy (`AiController`):** 
  - `POST /agent/chat` forwards the user's `prompt`, `thread_id`, and JWT token to the Python AI service's `/api/v1/agent/insight` endpoint.
  - `POST /agent/action/resume` forwards HITL approvals to the Python AI service's `/api/v1/agent/action/resume` endpoint.
- **Tool Execution (`ToolController`):** When the Python AI executes tools, it makes HTTP requests back to the Node backend. For example, `create_goal` hits `ToolController.createGoal`.
- **Business Logic (`GoalService`):** `GoalService.createGoal` takes the payload (including `subtasks`, `deadline_mode`, etc.), calculates time distributions for milestones, and calculates dynamic progress and lifecycles before saving to MongoDB.

## 3. AI/LangGraph Architecture
The AI layer is a FastAPI application running LangGraph (`ai/app/main.py`).
- **Graph Structure (`builder.py`):** A state machine (`StateGraph`) with a central `supervisor` node that routes to specific agent nodes (like `goal_architect`). It includes nodes for tool execution (`read_tools`, `prepare_action`, `action_tools`).
- **Goal Architect (`goal_architect.py`):** The agent responsible for IdeaLab. It uses a system prompt that instructs the LLM to deduce missing information based on goal types (Project, Exam, Learning, Personal) and ask 1-2 questions per turn without forcing a rigid 7-question format. It enforces a tool budget to prevent infinite loops.
- **Tools (`registry.py`):** Defines tools bound to the LLMs, including `create_goal`. Tools make HTTP requests back to the Node API using the user's forwarded JWT token.

## 4. Current Conversation Flow
1. **User Input:** User types an idea in `idealab.html` (either center or side input) and submits.
2. **Frontend Request:** `sendToAI` sends `{ prompt, thread_id }` to Node API `/agent/chat`.
3. **Node Proxy:** Node forwards the request to Python `/api/v1/agent/insight`.
4. **LangGraph Entry:** Python adds the message to the state and invokes the graph.
5. **Supervisor:** The `supervisor` node analyzes the intent and routes the state to `goal_architect`.
6. **Agent Processing:** `goal_architect` invokes the LLM. The LLM generates a clarifying question (as an `AIMessage`).
7. **Response Return:** Graph execution completes. Python returns the `final_insight` (the AI's question).
8. **Frontend Display:** Node proxies the response back to `idealab.html`, which appends it to `aiChatFeed`.

## 5. Current Goal Creation Flow
1. **Tool Invocation:** The `goal_architect` LLM decides it has enough info and outputs a tool call for `create_goal` with the required payload (`ai_summary`, `subtasks`, etc.).
2. **Graph Routing:** The `custom_tools_condition` detects an action tool and routes to the `prepare_action` node.
3. **Graph Pause (HITL):** `prepare_action` formats a `pending_action` object. The graph interrupts before the `action_tools` node. Python returns the `pending_action` to Node, which returns it to the frontend.
4. **User Review:** Frontend detects `pending_action.action === 'create_goal'` and calls `showProposalModal(payload)`. User reviews the parsed `ai_summary`.
5. **Approval:** User clicks "Approve". Frontend sends `{ thread_id, approved: true }` to Node `/agent/action/resume`.
6. **Graph Resume:** Node proxies to Python `/api/v1/agent/action/resume`. Python resumes the graph, allowing `action_tools` to execute the `create_goal` tool.
7. **Execution:** The Python tool makes a POST request to Node's `/api/v1/tools/goals`.
8. **Persistence:** `GoalService.createGoal` processes the data and saves it to MongoDB.
9. **Completion:** Tool returns success to the graph, which finishes execution. Python returns success to Node, then to frontend.
10. **Redirect:** Frontend redirects the user to `workspace.html`.

## 6. State & Memory
- **Thread ID:** Generated by the frontend (`idealab_` + timestamp) and passed in every request.
- **Checkpointer:** LangGraph uses `PostgresSaver` (connected to PostgreSQL) to persist the `AgentState` keyed by `thread_id`. If Postgres is down, it falls back to an ephemeral `MemorySaver`.
- **Context Window:** The `goal_architect` passes the last 20 messages to the LLM for context.

## 7. HITL Flow
Human-In-The-Loop (HITL) is enforced using LangGraph's `interrupt_before=["action_tools"]`. When an action tool is called, the graph halts, state is saved, and a `pending_action` is returned. A dedicated `/resume` endpoint receives the user's boolean approval, updates the state (injecting a rejection message if false), and resumes the graph.

## 8. API Contracts
- **`POST /api/v1/agent/insight` (Python):** Expects `{ prompt, thread_id }` and JWT. Returns `{ success, message, pending_action? }`.
- **`POST /api/v1/agent/action/resume` (Python):** Expects `{ thread_id, approved }` and JWT. Returns `{ success, message, pending_action? }`.
- **`POST /api/v1/tools/goals` (Node):** Expects Goal DTO (`title`, `description`, `subtasks`, `ai_summary`, etc.). Returns created Goal.

## 9. Database/Persistence
- **MongoDB:** Used by the Node.js backend. The `Goal` model contains a `subtasks` array of subdocuments.
- **PostgreSQL:** Used by the Python LangGraph service exclusively for checkpointing conversation state.

## 10. Current Issues / Risks
### A. Confirmed Bugs
- **Postgres Dependency:** If PostgreSQL is not running on port 5432, LangGraph throws connection refused errors on startup and falls back to ephemeral memory.

### B. Current Limitations
- **Disconnected UI Stepper:** The 7-step visual progress bar increments strictly based on the user pressing "Enter" in the center input, entirely decoupled from the AI's actual conversational state or logic.
- **Split Inputs:** The UI has both a center input and a side chat input, leading to a confusing UX regarding where the user should type.
- **No Attachments:** The frontend has no UI or logic implemented to attach files in the IdeaLab flow, though the backend supports RAG for other features.

### C. Architectural Risks
- **Duplicate Tool Calls:** The `goal_architect` includes logic to detect and block infinite loops if the LLM repeatedly calls the same tool.
- **Proxy Timeout:** Node sets a strict 60,000ms timeout for the Python proxy. Complex graph executions (or slow LLM responses) may hit this limit.

### D. Unknowns requiring later verification
- Behavior if a user closes the tab while a HITL `pending_action` is active.

## 11. Future Requirements Mapping

| Current System | Future Phase Requirement |
|----------------|--------------------------|
| Side chat contains examples and an input box | Right-side panel will contain ONLY conversation history. |
| Two inputs (center and side) | Center input remains the ONLY user input. |
| Center input is text only | Center input will support attachments (images, PDFs, documents). |
| AI asks 1-2 questions dynamically | Goal Architect must ask exactly 7 context-aware questions. |
| Goal Architect prompt is open-ended | After the 7th question, AI must generate a structured goal plan. |
| Modal has "Edit / Cancel" and "Approve" | Modal will have "Discard", "Make Changes", and "Proceed & Create Goal". |
| Edit/Cancel just sends `approved: false` | "Make Changes" returns to the conversation without losing context; "Discard" aborts without creating. |
| Workspace shows subtasks (implemented) | Workspace should display generated milestones/subtasks with useful descriptions. |

## 12. Files Involved

| File | Responsibility | Current Role in IdeaLab |
|------|----------------|-------------------------|
| `frontend/idealab.html` | UI layout and interactions | Renders the stepper, inputs, chat feed, and modal. Manages API requests. |
| `backend/src/controllers/ai.controller.js` | API Proxy | Forwards chat and resume requests from frontend to Python AI. |
| `backend/src/controllers/tool.controller.js` | Node Tool Endpoints | Exposes REST endpoints (`/api/v1/tools/*`) that the Python AI tools call. |
| `backend/src/services/goal.service.js` | Goal Business Logic | Processes the `create_goal` payload, distributes deadlines, saves to DB. |
| `backend/src/models/Goal.js` | Mongoose Schema | Defines the structure of Goals and Subtasks in MongoDB. |
| `ai/app/main.py` | FastAPI Entrypoint | Handles `/agent/insight` and `/agent/action/resume`, invokes LangGraph. |
| `ai/app/graph/builder.py` | LangGraph Definition | Defines the nodes, edges, HITL interruption, and state routing. |
| `ai/app/agents/supervisor.py` | Intent Router | Uses structured output to route the user's prompt to `goal_architect`. |
| `ai/app/agents/goal_architect.py` | Goal Generation AI | The LLM agent that asks questions and invokes the `create_goal` tool. |
| `ai/app/tools/registry.py` | AI Tool Definitions | Defines `create_goal` and others, making HTTP requests back to Node. |
