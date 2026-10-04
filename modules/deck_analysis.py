import streamlit as st
import fitz  # PyMuPDF
import concurrent.futures
from ui.components import render_page_header, render_glass_card

from agents import (
    financial_agent, market_agent, tech_agent, 
    gtm_agent, moat_agent, founder_agent, legal_agent
)

def extract_text_from_pdf(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def run_agent(agent_module, context, name):
    return name, agent_module.run(context)

def render():
    render_page_header("AI Pitch Deck Analyzer", "Upload PDF for deep VC analysis.")
    
    uploaded_file = st.file_uploader("Upload Pitch Deck (PDF)", type="pdf")
    if uploaded_file:
        st.success("Deck uploaded successfully!")
        if st.button("Run Diligence Agents"):
            with st.spinner("Extracting text via PyMuPDF..."):
                pdf_text = extract_text_from_pdf(uploaded_file.read())
            
            st.info(f"Extracted {len(pdf_text)} characters. Running 7 AI Agents in parallel...")
            
            agents = [
                (financial_agent, "Financial Analysis"),
                (market_agent, "Market & TAM"),
                (tech_agent, "Technology & Product"),
                (gtm_agent, "Go-to-Market"),
                (moat_agent, "Defensibility & Moat"),
                (founder_agent, "Founder Evaluation"),
                (legal_agent, "Legal & Compliance")
            ]
            
            results = {}
            with st.spinner("Executing Groq Subagents..."):
                with concurrent.futures.ThreadPoolExecutor(max_workers=7) as executor:
                    futures = {executor.submit(run_agent, agent, pdf_text, name): name for agent, name in agents}
                    for future in concurrent.futures.as_completed(futures):
                        name, res = future.result()
                        results[name] = res
            
            st.success("Analysis Complete!")
            
            for name, res in results.items():
                st.subheader(f"🧠 {name} (Score: {res.get('confidence_score', 'N/A')}/100)")
                html = f"<ul>"
                for finding in res.get("findings", []):
                    html += f"<li>{finding}</li>"
                html += f"</ul>"
                if res.get("risks"):
                    html += f"<h5 style='color: var(--status-danger); margin-top: 10px;'>Risks:</h5><ul>"
                    for risk in res.get("risks", []):
                        html += f"<li>{risk}</li>"
                    html += "</ul>"
                render_glass_card(html)
