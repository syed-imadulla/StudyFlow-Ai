import sys
import logging
from app.graph.builder import build_graph

logging.basicConfig(level=logging.INFO)

def main():
    graph = build_graph()
    
    config = {"configurable": {"thread_id": "test_rag_local"}}
    
    print("User: What does my DBMS PDF say about normalization?")
    initial_input = {"messages": [("user", "What does my DBMS PDF say about normalization?")]}
    
    events = graph.stream(initial_input, config)
    for event in events:
        for node, state in event.items():
            if 'messages' in state and state['messages']:
                last_message = state['messages'][-1]
                print(f"[{node}] {getattr(last_message, 'content', '')}")
                if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                    print(f"  Tool calls: {last_message.tool_calls}")

if __name__ == "__main__":
    main()
