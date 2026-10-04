# We rely on ChromaDB's built-in default embedding function (ONNX based sentence-transformers)
# which handles local embeddings perfectly without massive PyTorch dependencies.

def embed_text(text):
    pass # Chroma handles this natively via query_texts and documents
