from memory.vector_store import search_memory

def retrieve_context_for_query(query, limit=5):
    """Fetches relevant context from ChromaDB to inject into LLM prompts."""
    results = search_memory(query, n_results=limit)
    if not results or not results['documents'] or len(results['documents'][0]) == 0:
        return ""
    
    context = "--- PAST FIRM MEMORY & CONTEXT ---\n"
    for idx, doc in enumerate(results['documents'][0]):
        meta = results['metadatas'][0][idx] if results['metadatas'] else {}
        source = meta.get('source', 'Unknown')
        context += f"[{source.upper()}] {doc}\n\n"
    
    return context
