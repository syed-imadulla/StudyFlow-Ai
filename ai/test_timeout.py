import asyncio
import os
from pprint import pprint

os.environ["MOCK_LLM"] = "false"

from app.graph.builder import build_graph
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver

async def main():
    checkpointer = MemorySaver()
    workflow = build_graph()
    app = workflow.compile(checkpointer=checkpointer)
    
    config = {"configurable": {"thread_id": "test_timeout_1"}}
    
    print("--- FIRST MESSAGE ---")
    inputs = {
        "messages": [HumanMessage(content="I want to build a React portfolio in 30 days and can spend 2 hours daily.")]
    }
    async for event in app.astream(inputs, config, stream_mode="values"):
        print(event.keys())
    
    state = app.get_state(config).values
    print("Goal State after Msg 1:", state.get("goal_state"))
    
    print("\n--- SECOND MESSAGE ---")
    inputs2 = {
        "messages": [HumanMessage(content="I can spend 2 hours daily and need it finished in 3 weeks.")]
    }
    async for event in app.astream(inputs2, config, stream_mode="values"):
        print(event.keys())
        
    state2 = app.get_state(config).values
    print("Goal State after Msg 2:", state2.get("goal_state"))

if __name__ == "__main__":
    asyncio.run(main())
