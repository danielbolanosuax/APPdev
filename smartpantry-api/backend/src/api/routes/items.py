from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date, timedelta
from src.core.database import get_db
from src.core.security.auth import get_current_user
from src.models.schemas import ItemCreate, ItemUpdate, ItemResponse
from src.models.database_models import PantryItem

router = APIRouter()

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    item: ItemCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crear nuevo item en despensa (requiere autenticación)"""
    db_item = PantryItem(
        user_id=current_user["id"],
        **item.model_dump()
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[ItemResponse])
async def get_items(
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    expiring_soon: bool = Query(False, description="Solo items próximos a vencer"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Listar items del usuario actual"""
    query = select(PantryItem).where(PantryItem.user_id == current_user["id"])
    
    if category:
        query = query.where(PantryItem.category == category)
    
    if expiring_soon:
        week_from_now = date.today() + timedelta(days=7)
        query = query.where(
            and_(
                PantryItem.expiration_date.isnot(None),
                PantryItem.expiration_date <= week_from_now
            )
        )
    
    query = query.order_by(PantryItem.expiration_date.asc().nullslast())
    result = await db.execute(query)
    items = result.scalars().all()
    return items

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener item específico"""
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.id == item_id,
                PantryItem.user_id == current_user["id"]
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item no encontrado"
        )
    
    return item

@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: int,
    item_update: ItemUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualizar item"""
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.id == item_id,
                PantryItem.user_id == current_user["id"]
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item no encontrado"
        )
    
    update_data = item_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    await db.commit()
    await db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Eliminar item"""
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.id == item_id,
                PantryItem.user_id == current_user["id"]
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item no encontrado"
        )
    
    await db.delete(item)
    await db.commit()

@router.get("/stats/summary")
async def get_inventory_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener estadísticas del inventario"""
    from sqlalchemy import func
    
    # Total items
    total_result = await db.execute(
        select(func.count(PantryItem.id)).where(
            PantryItem.user_id == current_user["id"]
        )
    )
    total_items = total_result.scalar()
    
    # Items por categoría
    category_result = await db.execute(
        select(PantryItem.category, func.count(PantryItem.id))
        .where(PantryItem.user_id == current_user["id"])
        .group_by(PantryItem.category)
    )
    items_by_category = {cat: count for cat, count in category_result.all()}
    
    # Items próximos a vencer
    week_from_now = date.today() + timedelta(days=7)
    expiring_result = await db.execute(
        select(func.count(PantryItem.id)).where(
            and_(
                PantryItem.user_id == current_user["id"],
                PantryItem.expiration_date <= week_from_now,
                PantryItem.expiration_date.isnot(None)
            )
        )
    )
    expiring_soon = expiring_result.scalar()
    
    # Items expirados
    expired_result = await db.execute(
        select(func.count(PantryItem.id)).where(
            and_(
                PantryItem.user_id == current_user["id"],
                PantryItem.expiration_date < date.today(),
                PantryItem.expiration_date.isnot(None)
            )
        )
    )
    expired = expired_result.scalar()
    
    return {
        "total_items": total_items,
        "items_by_category": items_by_category,
        "expiring_soon": expiring_soon,
        "expired_items": expired
    }
