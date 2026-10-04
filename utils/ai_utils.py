import google.generativeai as genai
from groq import Groq
import os
from config.settings import GEMINI_API_KEY, GROQ_API_KEY
from memory.retrieval import retrieve_context_for_query

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Configure Groq
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def call_groq(prompt, system_instruction="You are a VC analyst.", inject_memory=False):
    """Primary text AI using Groq for speed."""
    if not groq_client: return "Groq API key missing."
    
    context = ""
    if inject_memory:
        context = retrieve_context_for_query(prompt)
        if context:
            prompt = f"{context}\n\nUSER QUERY:\n{prompt}"
            
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2048
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"Error calling Groq: {str(e)}"

def analyze_image_with_gemini(image_path, prompt):
    """Uses Gemini 1.5 Flash for multimodal visual tasks."""
    if not GEMINI_API_KEY: return "Gemini API key missing."
    try:
        import PIL.Image
        img = PIL.Image.open(image_path)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([prompt, img])
        return response.text
    except Exception as e:
        return f"Error analyzing image: {str(e)}"
