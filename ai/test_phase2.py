import asyncio
from app.agents.goal_architect import goal_extraction_node, goal_architect_node
from app.agents.supervisor import AgentState
from langchain_core.messages import HumanMessage, AIMessage

def test_extraction():
    # Test 1: Multiple fields extracted from one message
    print("--- Test 1: Multiple fields from one message ---")
    state = {
        "messages": [HumanMessage(content="I want to build a React portfolio in 30 days. I can spend 2 hours a day.")],
        "goal_state": {}
    }
    result = goal_extraction_node(state)
    print("Extracted:", result)
    
    # Test 2: Information persists and explicit corrections replace old information
    print("\n--- Test 2: Corrections ---")
    state = {
        "messages": [HumanMessage(content="Actually, I can only spend 1 hour a day, and I want to use Vue instead of React.")],
        "goal_state": {
            "goal": "build a React portfolio",
            "deadline": "30 days",
            "time": "2 hours a day"
        }
    }
    result = goal_extraction_node(state)
    print("Extracted:", result)
    
    # Test 3: Vague answers
    print("\n--- Test 3: Vague answers ---")
    state = {
        "messages": [HumanMessage(content="I'm not really sure, maybe later.")],
        "goal_state": {
            "goal": "build a Vue portfolio",
            "deadline": "30 days",
            "time": "1 hour a day"
        }
    }
    result = goal_extraction_node(state)
    print("Extracted:", result)
    
    # Test 4: Goal changes
    print("\n--- Test 4: Goal changes ---")
    state = {
        "messages": [HumanMessage(content="Actually I want to learn Spanish instead.")],
        "goal_state": {
            "goal": "build a Vue portfolio",
            "deadline": "30 days",
            "time": "1 hour a day"
        }
    }
    result = goal_extraction_node(state)
    print("Extracted:", result)

if __name__ == "__main__":
    test_extraction()
