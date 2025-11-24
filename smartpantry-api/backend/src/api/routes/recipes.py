from fastapi import APIRouter, Depends
from typing import List
from src.models.schemas import RecipeResponse

router = APIRouter()

@router.get("/", response_model=List[RecipeResponse])
async def get_recipes():
    """Obtener recetas sugeridas basadas en inventario"""
    # TODO: Implementar lógica de matching con IA
    return [
        {
            "id": 1,
            "name": "Pasta con tomate",
            "ingredients": ["pasta", "tomate", "ajo"],
            "instructions": ["Hervir pasta", "Preparar salsa", "Mezclar"],
            "prep_time": 20,
            "difficulty": "easy",
            "match_percentage": 85.0
        }
    ]

@router.get("/ai-suggestions")
async def get_ai_recipe_suggestions():
    """Sugerencias de recetas usando IA"""
    return {
        "message": "Endpoint para integración con OpenAI GPT-4",
        "status": "pending_implementation"
    }
