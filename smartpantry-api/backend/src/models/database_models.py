from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    family_size = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    items = relationship("PantryItem", back_populates="user", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_user_email', 'email'),
    )

class PantryItem(Base):
    __tablename__ = "pantry_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), index=True, nullable=False)
    category = Column(String(50), index=True, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    expiration_date = Column(Date, nullable=True, index=True)
    barcode = Column(String(50), nullable=True)
    location = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="items")
    
    __table_args__ = (
        Index('idx_item_user', 'user_id'),
        Index('idx_item_category', 'category'),
        Index('idx_item_expiration', 'expiration_date'),
    )

class Recipe(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    description = Column(Text, nullable=True)
    ingredients = Column(Text, nullable=False)  # JSON string
    instructions = Column(Text, nullable=False)  # JSON string
    prep_time = Column(Integer, nullable=False)
    cook_time = Column(Integer, nullable=True)
    servings = Column(Integer, default=4)
    difficulty = Column(String(20), nullable=False)
    cuisine = Column(String(50), nullable=True)
    tags = Column(Text, nullable=True)  # JSON string
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_recipe_difficulty', 'difficulty'),
        Index('idx_recipe_cuisine', 'cuisine'),
    )
