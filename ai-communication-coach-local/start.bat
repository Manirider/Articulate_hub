@echo off
echo Starting AI Communication Coach...

echo Starting Backend...
start cmd /k "cd backend && .venv\Scripts\activate.ps1 && python main.py"

echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"

echo Done! Open http://localhost:3000 in your browser.
echo NOTE: Ensure you have Ollama running with: ollama run llama3
