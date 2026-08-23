# Phase 6.2.6 Architecture Audit: OmniRoute Integration

## 1. Current Architecture Review

### Existing Components:
- **API Gateway (Node.js)**: Proxies frontend requests (`/api/v1/agent/chat` and `/api/v1/agent/action/resume`) to the Python backend. Handles JWT authentication.
- **Python Backend (FastAPI)**: Exposes endpoints for the LangGraph agent (`/api/v1/agent/insight` and `/api/v1/agent/action/resume`).
- **LangGraph Application**:
  - **State**: Maintained via PostgreSQL checkpointing.
  - **Graph Nodes**: `supervisor`, `goal_architect`, `insight_agent`, and `tools`.
  - **LLM Abstraction**: Currently resides in `ai/app/llm/gemini.py`. Uses `ChatGoogleGenerativeAI` from `langchain_google_genai`, directly targeting the `gemini-1.5-flash` model via the `GEMINI_API_KEY` environment variable.
  - **MOCK_LLM**: Currently implemented within individual agents (`supervisor.py`, `goal_architect.py`, `insight_agent.py`). If `MOCK_LLM=true`, these nodes short-circuit and return hardcoded deterministic responses based on trigger words.

### Known Constraints & Behaviors:
- The `MOCK_LLM` logic in agents works well for unit tests and prevents API calls during automated runs. We must preserve this.
- Tools require structured outputs via `.bind_tools()`.
- The Supervisor requires structured output via `.with_structured_output()`.
- The frontend and backend Node.js applications are secure and completely unaware of what specific LLM provider is used (they just proxy to Python).

## 2. OmniRoute Integration Strategy

### Concept
OmniRoute is an LLM gateway (often acting as an OpenAI-compatible proxy) that routes to various underlying models (e.g., GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) based on headers or API paths without changing the LangChain client logic.
To integrate this properly:
1. We will install `langchain-openai`.
2. We will replace or supplement `gemini.py` with an agnostic `provider.py`.
3. We will initialize `ChatOpenAI` with configurable Base URLs and API Keys.

### Environment Variables
We need to update `ai/.env` and `ai/.env.example` with:
```env
OMNIROUTE_API_KEY=your_omniroute_key_here
OMNIROUTE_BASE_URL=https://api.omniroute.ai/v1  # or whichever URL the user uses
OMNIROUTE_MODEL=meta-llama/llama-3-70b-instruct # default or any supported model
```

### File Modifications
- **`ai/requirements.txt`**: Add `langchain-openai`.
- **`ai/app/config.py`**: Add `OMNIROUTE_API_KEY`, `OMNIROUTE_BASE_URL`, `OMNIROUTE_MODEL`.
- **`ai/app/llm/provider.py`**: Create a new file implementing `get_llm()` that reads these variables and returns a `ChatOpenAI` instance.
- **`ai/app/agents/*.py`**: Change `from app.llm.gemini import get_llm` to `from app.llm.provider import get_llm`.

## 3. Error Handling & Security

- **Missing Config**: `get_llm()` must gracefully detect missing keys/URLs and log errors, returning `None`. Agents already handle `if not llm: return {"error": ...}`.
- **Provider Failure / Timeout**: Wrap the `.invoke()` calls in try/catch (which is mostly done in agents, but we will review to ensure timeouts are handled gracefully without crashing the FastAPI server).
- **Security**: The API keys will remain purely in `ai/.env` and will never be logged, leaked, or exposed to the Node.js backend or frontend client.

## 4. Verification & Testing

- **Preserve `MOCK_LLM=true`**: Existing tests will run untouched because the mock short-circuits *before* `get_llm()` is called in the agents.
- **New Integration Test**: We will create `ai/tests/test_omniroute.py` or modify integration tests to explicitly verify that when `MOCK_LLM=false`, an actual request can be made if credentials are provided. (We may skip actual execution in CI if keys are missing).
- **Regression**: We will run `pytest` and `npm run test:integration` as final verification.

## 5. Scope Boundaries
- We will NOT touch the frontend, IdeaLab, or Node.js logic.
- We will NOT implement new tools or agents.
- The sole objective is the underlying provider switch to OmniRoute.
