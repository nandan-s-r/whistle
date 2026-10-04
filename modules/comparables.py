import streamlit as st
from ui.components import render_page_header

def render():
    render_page_header("Comparables Engine", "Benchmark against unicorns and public peers.")
    
    st.selectbox("Select Portfolio Company", ["Acme Corp", "Beta Tech"])
    if st.button("Generate Comparables"):
        with st.spinner("Analyzing public S-1s and PitchBook data..."):
            pass
        st.markdown("""
        ### Valuation Benchmarks
        - **Acme Corp Current ARR Multiple**: 15x
        - **Public Peer Average**: 8x
        - **Unicorn Average (Series A)**: 20x
        """)
