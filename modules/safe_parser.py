import streamlit as st
from ui.components import render_page_header

def render():
    render_page_header("SAFE & Legal Parser", "Extract terms from legal docs instantly.")
    
    uploaded_file = st.file_uploader("Upload SAFE or Term Sheet (PDF)", type="pdf")
    if uploaded_file and st.button("Parse Terms"):
        with st.spinner("Extracting clauses..."):
            pass
        st.markdown("""
        ### Key Terms Extracted
        - **Valuation Cap**: $20M
        - **Discount**: 20%
        - **Pro-rata Rights**: <span style='color: var(--status-danger)'>No</span>
        - **MFN Clause**: Yes
        """, unsafe_allow_html=True)
