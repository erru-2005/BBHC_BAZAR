"""
Main application entry point for Flask backend
"""
from app import create_app
from config import Config

app, socketio = create_app()

if __name__ == '__main__':
    socketio.run(
        app,
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG,
        allow_unsafe_werkzeug=True
    )

