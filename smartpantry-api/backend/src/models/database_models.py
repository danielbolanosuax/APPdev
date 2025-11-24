from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    family_size = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    items = relationship("PantryItem", back_populates="user")

class PantryItem(Base):
    __tablename__ = "pantry_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(100), index=True)
    category = Column(String(50))
    quantity = Column(Float)
    unit = Column(String(20))
    expiration_date = Column(Date, nullable=True)
    barcode = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="items")
