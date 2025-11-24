Write-Host "🚀 Iniciando SmartPantry AI Enterprise v2.0.0" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (!(Test-Path "smartpantry-api\backend\src\api\main.py")) {
    Write-Host "❌ Error: Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

Write-Host "1️⃣  Iniciando Backend..." -ForegroundColor Yellow
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\smartpantry-api\backend'; .\venv\Scripts\python.exe -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000" -PassThru

Start-Sleep -Seconds 5

Write-Host "2️⃣  Iniciando Frontend..." -ForegroundColor Yellow
npm run dev

Write-Host ""
Write-Host "✅ Aplicación iniciada" -ForegroundColor Green
Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "📍 Backend:  http://localhost:8000/docs" -ForegroundColor Cyan
