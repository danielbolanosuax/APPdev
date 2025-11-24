# Start SmartPantry Backend
Write-Host "🚀 Iniciando SmartPantry Backend..." -ForegroundColor Cyan

cd smartpantry-api\backend
.\venv\Scripts\Activate.ps1
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
