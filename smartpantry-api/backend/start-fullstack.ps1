# Start Full Stack (Backend + Frontend)
Write-Host "🚀 Iniciando Full Stack SmartPantry..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'smartpantry-api\backend'; .\venv\Scripts\Activate.ps1; uvicorn src.api.main:app --reload --port 8000"

Start-Sleep -Seconds 3

npm run dev
