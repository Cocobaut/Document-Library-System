# core/database.py
# Kết nối SQLAlchemy Session

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from core.config import get_settings

settings = get_settings()

# Tạo engine kết nối tới Database
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Kiểm tra kết nối trước khi sử dụng
    pool_size=10,
    max_overflow=20,
)

# Tạo SessionLocal factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Session:
    """
    Generator cung cấp database session.
    Đảm bảo session luôn được đóng sau khi sử dụng.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
