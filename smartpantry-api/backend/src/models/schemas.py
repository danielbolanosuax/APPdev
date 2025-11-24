from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

class CategoryEnum(str, Enum):
    DAIRY = "dairy"
    VEGETABLES = "vegetables"
    FRUITS = "fruits"
    MEAT = "meat"
    FISH = "fish"
    GRAINS = "grains"
    BEVERAGES = "beverages"
    SNACKS = "snacks"
    OTHER = "other"

class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: CategoryEnum
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., max_length=20)
    expiration_date: Optional[date] = None
    barcode: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[CategoryEnum] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expiration_date: Optional[date] = None

class ItemResponse(ItemBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class RecipeBase(BaseModel):
    name: str
    ingredients: List[str]
    instructions: List[str]
    prep_time: int
    difficulty: str

class RecipeResponse(RecipeBase):
    id: int
    match_percentage: Optional[float] = None
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    password: str
    family_size: int = 1

class UserResponse(BaseModel):
    id: int
    email: str
    family_size: int
    
    class Config:
        from_attributes = True
