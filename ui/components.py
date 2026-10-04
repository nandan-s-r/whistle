import streamlit as st

def render_glass_card(html_content):
    st.markdown(
f"<div class='stCard'>"
f"{html_content}"
f"</div>", unsafe_allow_html=True)

def render_badge(text, status="neutral"):
    """status can be success, warning, danger, neutral"""
    return f'<span class="status-badge badge-{status}">{text}</span>'

def render_metric_card(label, value, delta=None, delta_color="normal"):
    delta_html = ""
    if delta:
        color = "#22c55e" if delta_color == "normal" else "#ef4444"
        if delta.startswith("-") and delta_color == "normal": color = "#ef4444"
        elif delta.startswith("-") and delta_color == "inverse": color = "#22c55e"
        delta_html = f"<span style='color: {color}; font-size: 0.8em; margin-left: 8px;'>{delta}</span>"
        
    render_glass_card(
f"<p style='margin:0; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.05em;'>{label}</p>"
f"<h2 style='margin: 5px 0 0 0; font-size: 2em;'>{value}{delta_html}</h2>"
    )

def render_page_header(title, subtitle=None):
    html = f"<h1 style='margin-bottom: 0;'>{title}</h1>"
    if subtitle:
        html += f"<p style='color: var(--text-secondary); margin-top: 5px;'>{subtitle}</p>"
    html += "<hr style='border-color: var(--border-subtle); margin-top: 20px; margin-bottom: 30px;'/>"
    st.markdown(html, unsafe_allow_html=True)
