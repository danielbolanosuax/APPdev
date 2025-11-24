# ============================================================================
# REPORTE COMPLETO DE CÓDIGO - SMARTPANTRY AI
# ============================================================================

$outputFile = "code_review_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

Write-Host "Generando reporte completo del proyecto..." -ForegroundColor Cyan

@"
================================================================================
SMARTPANTRY AI - ANÁLISIS COMPLETO DE CÓDIGO
Fecha: $(Get-Date)
================================================================================

"@ | Out-File $outputFile

# ============================================================================
# BACKEND PYTHON
# ============================================================================

@"

################################################################################
# BACKEND PYTHON - FastAPI
################################################################################

"@ | Add-Content $outputFile

$backendFiles = @(
    "smartpantry-api\backend\src\api\main.py",
    "smartpantry-api\backend\src\core\config.py",
    "smartpantry-api\backend\src\core\database.py",
    "smartpantry-api\backend\src\models\schemas.py",
    "smartpantry-api\backend\src\models\database_models.py",
    "smartpantry-api\backend\src\api\routes\items.py",
    "smartpantry-api\backend\src\api\routes\recipes.py",
    "smartpantry-api\backend\src\api\routes\users.py",
    "smartpantry-api\backend\requirements.txt",
    "smartpantry-api\backend\.env"
)

foreach ($file in $backendFiles) {
    if (Test-Path $file) {
        @"

================================================================================
ARCHIVO: $file
================================================================================

"@ | Add-Content $outputFile
        Get-Content $file | Add-Content $outputFile
    } else {
        "❌ No encontrado: $file" | Add-Content $outputFile
    }
}

# ============================================================================
# FRONTEND REACT
# ============================================================================

@"

################################################################################
# FRONTEND REACT - TypeScript
################################################################################

"@ | Add-Content $outputFile

$frontendFiles = @(
    "src\App.tsx",
    "src\main.tsx",
    "src\services\api.ts",
    "src\features\inventory\InventoryView.tsx",
    "src\features\inventory\AddItemModal.tsx",
    "src\features\recipes\RecipesView.tsx",
    "src\features\recipes\RecipeCard.tsx",
    "src\features\shopping\ShoppingView.tsx",
    "src\features\analytics\AnalyticsView.tsx",
    "src\state\store.ts",
    "src\store\useStore.ts",
    "src\ui\AppShell.tsx",
    "src\ui\kit.tsx",
    "package.json",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.js"
)

foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        @"

================================================================================
ARCHIVO: $file
================================================================================

"@ | Add-Content $outputFile
        Get-Content $file | Add-Content $outputFile
    } else {
        "❌ No encontrado: $file" | Add-Content $outputFile
    }
}

# ============================================================================
# ESTRUCTURA DEL PROYECTO
# ============================================================================

@"

################################################################################
# ESTRUCTURA COMPLETA DEL PROYECTO
################################################################################

"@ | Add-Content $outputFile

Get-ChildItem -Recurse -File | 
    Where-Object { $_.FullName -notmatch "node_modules|\.git|venv|__pycache__|dist" } |
    Select-Object FullName, Length |
    Format-Table -AutoSize |
    Out-String |
    Add-Content $outputFile

Write-Host "✅ Reporte generado: $outputFile" -ForegroundColor Green
Write-Host "📄 Abre el archivo y compártelo para revisión" -ForegroundColor Yellow

# Abrir el archivo automáticamente
notepad $outputFile

