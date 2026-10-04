import chromadb
from chromadb.config import Settings
from config.settings import CHROMA_DB_PATH
import uuid

# Initialize ChromaDB persistent client
client = chromadb.PersistentClient(path=CHROMA_DB_PATH, settings=Settings(allow_reset=True))

def get_collection(name="antigravity_memory"):
    return client.get_or_create_collection(name=name)

def store_memory(text, metadata=None):
    collection = get_collection()
    doc_id = str(uuid.uuid4())
    collection.add(
        documents=[text],
        metadatas=[metadata or {}],
        ids=[doc_id]
    )
    return doc_id

def search_memory(query, n_results=5, filter_metadata=None):
    collection = get_collection()
    if collection.count() == 0:
        return []
    
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where=filter_metadata
    )
    return results

def get_startup_memory(startup_id, n_results=10):
    return search_memory("", n_results=n_results, filter_metadata={"startup_id": startup_id})
