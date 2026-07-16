"""
Email utility service using SMTP
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

class EmailService:
    @staticmethod
    def send_email(to_email, subject, body_text, body_html=None):
        """
        Send an email via SMTP
        
        Args:
            to_email (str): Recipient email address
            subject (str): Email subject
            body_text (str): Plain text body
            body_html (str, optional): HTML body
            
        Returns:
            tuple: (success: bool, error_message: str)
        """
        try:
            # Load configuration
            smtp_server = current_app.config.get('SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = current_app.config.get('SMTP_PORT', 587)
            smtp_email = current_app.config.get('SMTP_EMAIL')
            smtp_password = current_app.config.get('SMTP_PASSWORD')

            if not smtp_email or not smtp_password:
                err_msg = "SMTP credentials not configured"
                print(f"[EmailService] Error: {err_msg}")
                return False, err_msg

            print(f"[EmailService] Sending email to {to_email} with subject: '{subject}'")

            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"BBHCBazaar <{smtp_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            # Attach parts
            part1 = MIMEText(body_text, 'plain')
            msg.attach(part1)

            if body_html:
                part2 = MIMEText(body_html, 'html')
                msg.attach(part2)

            # Connect and send with fallback logic for resilience
            server = None
            last_err = None
            ports_to_try = [smtp_port]
            
            # If the primary port fails, try the alternative standard port as fallback
            alt_port = 465 if smtp_port == 587 else 587
            ports_to_try.append(alt_port)

            for port in ports_to_try:
                try:
                    print(f"[EmailService] Attempting connection to {smtp_server}:{port}...")
                    if port == 465:
                        server = smtplib.SMTP_SSL(smtp_server, port, timeout=5)
                    else:
                        server = smtplib.SMTP(smtp_server, port, timeout=5)
                        server.ehlo()
                        server.starttls()
                        server.ehlo()
                    
                    server.login(smtp_email, smtp_password)
                    server.sendmail(smtp_email, to_email, msg.as_string())
                    server.quit()
                    last_err = None
                    break  # Success!
                except Exception as e:
                    last_err = e
                    print(f"[EmailService] Port {port} failed: {e}")
                    if server:
                        try:
                            server.close()
                        except Exception:
                            pass
                        server = None

            if last_err is not None:
                raise last_err

            print(f"[EmailService] Email sent successfully to {to_email}")
            return True, "Email sent successfully"
        except Exception as e:
            err_msg = str(e)
            print(f"[EmailService] Failed to send email to {to_email}: {err_msg}")
            return False, err_msg
