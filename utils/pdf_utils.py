import fitz  # PyMuPDF
import os

def extract_text_from_pdf(pdf_path):
    """Extracts text from all pages of a PDF."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text += f"--- Page {page_num+1} ---\n"
            text += page.get_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

def convert_pdf_to_images(pdf_path, output_dir):
    """Converts a PDF to a list of image paths for visual analysis."""
    try:
        os.makedirs(output_dir, exist_ok=True)
        doc = fitz.open(pdf_path)
        image_paths = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # High resolution
            img_path = os.path.join(output_dir, f"page_{page_num}.png")
            pix.save(img_path)
            image_paths.append(img_path)
        return image_paths
    except Exception as e:
        print(f"Error converting PDF to images: {e}")
        return []
