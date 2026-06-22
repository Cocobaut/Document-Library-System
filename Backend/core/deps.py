# core/deps.py
# Dependency Injection: get_db, get_current_user,...

from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from core.config import get_settings
from schemas.auth_schema import TokenData

from core.database import get_db
from core.security import decode_access_token
from models.user_model import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency lấy ĐẦY ĐỦ thông tin Object User từ Database bằng mã UUID từ JWT Token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id_uuid = UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.user_id == user_id_uuid).first()
    if user is None:
        raise credentials_exception

    return user


async def get_current_active_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency kiểm tra và gác cổng quyền Admin tối cao"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền Admin để thực hiện hành động này",
        )
    return current_user


async def get_current_unit_manager(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency kiểm tra quyền Quản trị đơn vị (Chấp nhận cả Admin)"""
    if current_user.role not in ("ADMIN", "UNIT_MANAGER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền quản lý đơn vị này",
        )
    return current_user