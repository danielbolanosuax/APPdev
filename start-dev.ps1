# Script de inicio completo - Desarrollo
Write-Host "🚀 Iniciando SmartPantry AI - Modo Desarrollo" -ForegroundColor Cyan
Write-Host ""

# Backend
Write-Host "1️⃣  Iniciando Backend FastAPI..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'smartpantry-api\backend'; .\venv\Scripts\Activate.ps1; uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 3

# Frontend
Write-Host "2️⃣  Iniciando Frontend React..." -ForegroundColor Yellow
npm run dev

Write-Host ""
Write-Host "✅ Aplicación iniciada" -ForegroundColor Green
Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "📍 Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "📍 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
