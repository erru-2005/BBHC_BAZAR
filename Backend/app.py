"""
Main application entry point for Flask backend
"""
from app import create_app
from config import Config
import sys

try:
    app, socketio = create_app()
except Exception as e:
    error_text = str(e)
    print(f"[ERROR] Backend startup failed: {error_text}")
    if 'resolution lifetime expired' in error_text.lower() or 'dns' in error_text.lower():
        print("[HINT] MongoDB SRV DNS lookup failed. Please check your internet/DNS and MONGODB_URI in Backend/.env.")
    sys.exit(1)

if __name__ == '__main__':
    socketio.run(
        app,
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )

