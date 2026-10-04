import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# For MVP, this simulates Gmail API to avoid complex OAuth flows in the local setup.
# In production, use google-api-python-client with credentials.json

def draft_email(to_email, subject, body):
    """Mocks drafting an email."""
    print(f"--- DRAFT EMAIL ---")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body: {body[:100]}...")
    print(f"-------------------")
    return {"status": "success", "message": "Email drafted successfully."}

def send_email(to_email, subject, body):
    """Mocks sending an email."""
    print(f"--- SEND EMAIL ---")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body: {body[:100]}...")
    print(f"-------------------")
    return {"status": "success", "message": "Email sent successfully."}
