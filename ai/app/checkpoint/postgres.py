import os
from psycopg_pool import ConnectionPool
from langgraph.checkpoint.postgres import PostgresSaver
import logging

logger = logging.getLogger(__name__)

_pool = None

def get_postgres_saver():
    """
    Returns a configured PostgresSaver for LangGraph.
    Initializes the connection pool on the first call.
    """
    global _pool
    
    postgres_uri = os.getenv(
        "POSTGRES_URI", 
        "postgresql://postgres:postgres@localhost:5432/studyflow"
    )
    
    if _pool is None:
        logger.info("Initializing PostgreSQL ConnectionPool for LangGraph Checkpointer...")
        try:
            _pool = ConnectionPool(
                conninfo=postgres_uri,
                max_size=20,
                timeout=5.0,
                kwargs={"autocommit": True}
            )
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise e

    saver = PostgresSaver(_pool)
    # Ensure tables are created
    saver.setup()
    return saver
