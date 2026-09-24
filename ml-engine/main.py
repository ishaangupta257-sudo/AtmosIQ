"""Render-compatible ASGI entrypoint.

The ML service app lives in serve.py, but Render is configured to run
`uvicorn main:app`. Re-exporting the app here keeps both entrypoints valid.
"""
from serve import app

