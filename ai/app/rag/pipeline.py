import os
import tempfile
import logging
from typing import List, Dict, Any

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
import chromadb

logger = logging.getLogger(__name__)

# Initialize ChromaDB client and embeddings
CHROMA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db")
os.makedirs(CHROMA_PATH, exist_ok=True)

_embeddings = None
_vectorstore = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        logger.info("Initializing HuggingFace embeddings (all-MiniLM-L6-v2)")
        _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings

def get_vectorstore():
    global _vectorstore
    if _vectorstore is None:
        logger.info(f"Initializing Chroma vectorstore at {CHROMA_PATH}")
        _vectorstore = Chroma(
            collection_name="studyflow_notes",
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_PATH
        )
    return _vectorstore

def process_and_upload_document(file_path: str, user_id: str, document_name: str) -> Dict[str, Any]:
    """Extracts, cleans, chunks, and embeds a document into ChromaDB."""
    try:
        logger.info(f"Processing document {document_name} for user {user_id}")
        
        # 1. Extraction
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        
        # 2. Text Cleaning & Metadata attachment
        for doc in docs:
            # Basic cleaning
            doc.page_content = doc.page_content.replace('\x00', '').strip()
            doc.metadata["user_id"] = user_id
            doc.metadata["document_name"] = document_name
            
        # 3. Chunking
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        chunks = text_splitter.split_documents(docs)
        
        # 4. Embeddings & Vector Index (Chroma handles embeddings transparently)
        vectorstore = get_vectorstore()
        vectorstore.add_documents(chunks)
        
        logger.info(f"Successfully uploaded {len(chunks)} chunks for {document_name}")
        return {"success": True, "chunks_added": len(chunks)}
    except Exception as e:
        logger.error(f"Error processing document: {e}")
        return {"success": False, "error": str(e)}

def search_user_documents(query: str, user_id: str, k: int = 3) -> List[Dict[str, Any]]:
    """Retrieves the top k most relevant chunks for a given query, filtered by user_id."""
    try:
        vectorstore = get_vectorstore()
        
        # Retrieval with metadata filtering
        results = vectorstore.similarity_search_with_score(
            query,
            k=k,
            filter={"user_id": user_id}
        )
        
        formatted_results = []
        for doc, score in results:
            formatted_results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score)
            })
            
        return formatted_results
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        return []
