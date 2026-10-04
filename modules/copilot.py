import streamlit as st
from ui.components import render_page_header
from utils.ai_utils import call_groq

def render():
    render_page_header("AI VC Copilot", "Conversational AI with full firm context.")
    
    if "messages" not in st.session_state:
        st.session_state.messages = []

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("Ask anything about your startups or market..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Searching firm memory..."):
                response = call_groq(prompt, inject_memory=True)
            st.markdown(response)
            st.session_state.messages.append({"role": "assistant", "content": response})

