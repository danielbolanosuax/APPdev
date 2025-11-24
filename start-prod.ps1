# Script de inicio - Producción
Write-Host "🚀 Iniciando SmartPantry AI - Modo Producción (Docker)" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker no está instalado" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Construyendo contenedores..." -ForegroundColor Yellow
docker-compose build

Write-Host "🚀 Iniciando servicios..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "✅ Aplicación iniciada en modo producción" -ForegroundColor Green
Write-Host "📍 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📍 Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ver logs: docker-compose logs -f" -ForegroundColor Gray
Write-Host "Para detener: docker-compose down" -ForegroundColor Gray
