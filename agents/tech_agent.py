from utils.ai_utils import call_groq
import json

def run(context_data):
    system_prompt = """You are a top-tier Deep Tech VC Partner.
Analyze the startup context and evaluate the technical architecture, scalability, and intellectual property.
Return ONLY valid JSON in this format:
{
    "findings": ["finding 1", "finding 2"],
    "risks": ["risk 1"],
    "green_flags": ["flag 1"],
    "confidence_score": 85,
    "recommendations": ["recommendation 1"]
}"""
    try:
        response = call_groq(context_data, system_instruction=system_prompt)
        start = response.find("{")
        end = response.rfind("}") + 1
        return json.loads(response[start:end])
    except Exception as e:
        return {"findings": [], "risks": [f"Analysis error: {e}"], "green_flags": [], "confidence_score": 0, "recommendations": []}
