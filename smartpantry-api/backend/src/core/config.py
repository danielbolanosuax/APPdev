from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    """Configuración centralizada SmartPantry"""
    
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "SmartPantry AI Backend"
    VERSION: str = "2.0.0"
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./smartpantry.db"
    
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS permitiendo todas las conexiones (desarrollo)
    ALLOWED_ORIGINS: list = ["*"]
    
    OPENAI_API_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()
