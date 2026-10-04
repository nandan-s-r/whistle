import os

def load_css(file_path="ui/styles.css"):
    with open(file_path, "r") as f:
        return f"<style>{f.read()}</style>"

def inject_custom_fonts():
    return """
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    """

def format_currency(value):
    if not value: return "$0"
    try:
        val = float(value)
        if val >= 1_000_000_000: return f"${val/1_000_000_000:.1f}B"
        if val >= 1_000_000: return f"${val/1_000_000:.1f}M"
        if val >= 1_000: return f"${val/1_000:.1f}K"
        return f"${val:.0f}"
    except:
        return value

def truncate(text, length=100):
    if not text: return ""
    return text[:length] + "..." if len(text) > length else text
