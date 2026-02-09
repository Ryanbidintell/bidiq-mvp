@echo off
echo Starting local server on http://localhost:8000
echo.
echo Open this URL in your browser:
echo http://localhost:8000/app.html
echo.
echo Press Ctrl+C to stop the server
echo.
python -m http.server 8000
