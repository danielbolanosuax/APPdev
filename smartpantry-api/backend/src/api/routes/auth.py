from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from src.core.database import get_db
from src.core.security.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_user
)
from src.models.schemas import UserCreate, UserLogin, Token, UserResponse
from src.models.database_models import User
from src.core.config import get_settings

settings = get_settings()
router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Registrar nuevo usuario"""
    # Verificar si el email ya existe
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Crear usuario
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        family_size=user_data.family_size
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # Crear token
    access_token = create_access_token(
        data={"sub": db_user.id, "email": db_user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse(
            id=db_user.id,
            email=db_user.email,
            family_size=db_user.family_size,
            created_at=db_user.created_at,
            is_active=db_user.is_active
        )
    )

@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login de usuario"""
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    # Crear token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            family_size=user.family_size,
            created_at=user.created_at,
            is_active=user.is_active
        )
    )

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener información del usuario actual"""
    result = await db.execute(select(User).where(User.id == current_user["id"]))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return user

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout (el cliente debe eliminar el token)"""
    return {"message": "Sesión cerrada exitosamente"}
