from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.models.schemas import UserCreate, UserResponse

router = APIRouter()

@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Crear nuevo usuario"""
    # TODO: Implementar hash de contraseña y validación
    return {
        "id": 1,
        "email": user.email,
        "family_size": user.family_size
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user():
    """Obtener usuario actual"""
    return {
        "id": 1,
        "email": "demo@smartpantry.com",
        "family_size": 4
    }
