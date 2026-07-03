"""
Email utility for sending notifications and OTPs via Gmail SMTP
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from flask import current_app

def send_email(to_email, subject, body):
    """
    Send an email using configured SMTP settings.
    
    Args:
        to_email (str): Recipient email address
        subject (str): Email subject
        body (str): Email message body (plain text)
        
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        smtp_server = os.environ.get('SMTP_SERVER') or 'smtp.gmail.com'
        smtp_port = int(os.environ.get('SMTP_PORT') or 587)
        
        # Access config from current_app context or environment fallback
        smtp_email = None
        smtp_password = None
        
        if current_app:
            smtp_email = current_app.config.get('SMTP_EMAIL')
            smtp_password = current_app.config.get('SMTP_PASSWORD')
            
        smtp_email = smtp_email or os.environ.get('SMTP_EMAIL')
        smtp_password = smtp_password or os.environ.get('SMTP_PASSWORD')

        if not smtp_email or not smtp_password:
            print("[EmailService] Error: SMTP credentials are not configured in .env.")
            return False, "SMTP credentials missing"

        if not to_email:
            print("[EmailService] Error: No recipient email specified.")
            return False, "Recipient email missing"

        msg = MIMEMultipart()
        msg['From'] = smtp_email
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

        # Connect to SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_email, smtp_password)
        
        # Send email
        server.sendmail(smtp_email, to_email, msg.as_string())
        server.quit()

        print(f"[EmailService] Successfully sent email to {to_email}")
        return True, "Email sent successfully"
    except Exception as e:
        print(f"[EmailService] Failed to send email to {to_email}: {str(e)}")
        return False, str(e)
