import os
import json
from groq import Groq
from google import genai

def call_llm(prompt: str, format_type: str = "json_object") -> str:
    """Helper to call Groq with Gemini fallback."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    
    if groq_api_key:
        try:
            client = Groq(api_key=groq_api_key)
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                response_format={"type": format_type} if format_type == "json_object" else None
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Groq failed, falling back to Gemini: {e}")
            
    if gemini_api_key:
        try:
            client = genai.Client(api_key=gemini_api_key)
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            text = response.text
            if format_type == "json_object" and "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            return text
        except Exception as e:
            print(f"Gemini failed: {e}")
            
    raise Exception("No valid LLM API key configured or all LLMs failed.")

def analyze_copilot_transcript(transcript: str) -> dict:
    prompt = f"""
    You are an AI Meeting Copilot for a Venture Capital firm.
    Analyze this meeting transcript/notes and extract key signals.
    
    Transcript:
    "{transcript}"
    
    Return ONLY a JSON object with this exact schema:
    {{
      "metrics": ["List of quantitative metrics mentioned"],
      "red_flags": ["List of concerns or risks"],
      "follow_ups": ["List of action items"],
      "sentiment": "Positive, Neutral, or Negative"
    }}
    """
    try:
        response_text = call_llm(prompt)
        return json.loads(response_text)
    except Exception as e:
        print(f"Error parsing Copilot JSON: {e}")
        return {
            "metrics": ["Failed to extract metrics"],
            "red_flags": ["Failed to extract red flags"],
            "follow_ups": ["Failed to extract follow ups"],
            "sentiment": "Error"
        }

def generate_outreach_email(startup_name: str, founder_name: str, template_type: str, sender_name: str = "Partner", sender_firm: str = "VC Firm") -> dict:
    prompt = f"""
    You are {sender_name}, a Partner at {sender_firm}, a top-tier Venture Capital firm.
    Write a cold outreach email to {founder_name}, founder of {startup_name}.
    Style/Template: {template_type}
    
    The email must be extremely concise, personalized, and professional. Max 4-5 sentences.
    Sign off the email with your real name ({sender_name}) and firm ({sender_firm}). Make it sound human and high-signal.
    
    Return ONLY a JSON object with this exact schema:
    {{
      "subject": "Email subject line",
      "body": "The full email body"
    }}
    """
    try:
        response_text = call_llm(prompt)
        return json.loads(response_text)
    except Exception as e:
        print(f"Error parsing Outreach JSON: {e}")
        return {
            "subject": f"Connecting regarding {startup_name}",
            "body": f"Hi {founder_name},\n\nI was impressed by what you're building at {startup_name}. Let's chat.\n\nBest,\n{sender_name}\n{sender_firm}"
        }
