from pydantic import BaseModel, Field, EmailStr, validator
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
    CONDIMENTS = "condiments"
    FROZEN = "frozen"
    BAKERY = "bakery"
    OTHER = "other"

# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserBase(BaseModel):
    email: EmailStr
    family_size: int = Field(default=1, ge=1, le=20)

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=100)
    
    @validator('password')
    def password_strength(cls, v):
        if not any(char.isdigit() for char in v):
            raise ValueError('La contraseña debe contener al menos un número')
        if not any(char.isupper() for char in v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        return v

class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool = True
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ============================================================================
# ITEM SCHEMAS
# ============================================================================

class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: CategoryEnum
    quantity: float = Field(..., gt=0, le=10000)
    unit: str = Field(..., min_length=1, max_length=20)
    expiration_date: Optional[date] = None
    barcode: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=500)
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v or v.isspace():
            raise ValueError('El nombre no puede estar vacío')
        return v.strip()

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[CategoryEnum] = None
    quantity: Optional[float] = Field(None, gt=0, le=10000)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    expiration_date: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class ItemResponse(ItemBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================================================
# RECIPE SCHEMAS
# ============================================================================

class RecipeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    ingredients: List[str] = Field(..., min_items=1)
    instructions: List[str] = Field(..., min_items=1)
    prep_time: int = Field(..., ge=1, le=1440)  # max 24 horas
    cook_time: Optional[int] = Field(None, ge=0, le=1440)
    servings: int = Field(default=4, ge=1, le=50)
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    cuisine: Optional[str] = Field(None, max_length=50)
    tags: List[str] = Field(default_factory=list)

class RecipeResponse(RecipeBase):
    id: int
    match_percentage: Optional[float] = Field(None, ge=0, le=100)
    missing_ingredients: List[str] = Field(default_factory=list)
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============================================================================
# ANALYTICS SCHEMAS
# ============================================================================

class InventoryStats(BaseModel):
    total_items: int
    items_by_category: dict
    expiring_soon: int
    expired_items: int
    total_value_estimate: Optional[float] = None

class ConsumptionTrend(BaseModel):
    category: str
    items_consumed: int
    trend: str  # "increasing", "stable", "decreasing"

# ============================================================================
# ERROR SCHEMAS
# ============================================================================

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
