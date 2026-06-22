# controllers/auth.py
# Router xử lý Đăng nhập/Đăng xuất

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import create_access_token
from core.config import get_settings
from schemas.auth_schema import LoginPayload, TokenResponse, ChangePasswordPayload
from services.user_service import UserService
from core.deps import get_current_user
from models.user_model import User

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["Xác thực"])


@router.post("/login", response_model=TokenResponse, summary="Đăng nhập hệ thống")
async def login(payload: LoginPayload, db: Session = Depends(get_db)):
    """
    Xác thực người dùng và trả về JWT Access Token.
    """
    user = UserService.authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={
            "sub": str(user.user_id),
            "username": user.username,
            "role": user.role,
            "unit_name": user.unit.name if user.unit else ""
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(access_token=access_token)


@router.put(
    "/change-password", 
    status_code=status.HTTP_200_OK, 
    summary="Đổi mật khẩu người dùng"
)
async def change_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Ép buộc phải gắn Token
):
    """
    API đổi mật khẩu dùng chung cho mọi vai trò (Admin, Manager, User).
    Hệ thống tự động nhận diện danh tính thông qua Token truyền vào Header.
    """
    UserService.change_password(db=db, user=current_user, data=payload)
    return {"message": "Đổi mật khẩu thành công. Vui lòng sử dụng mật khẩu mới cho lần đăng nhập sau."}


@router.post("/logout", summary="Đăng xuất hệ thống")
async def logout():
    """
    Đăng xuất. Với JWT stateless, client chỉ cần xóa token phía client.
    Nếu cần blacklist token, implement thêm Redis token blacklist.
    """
    return {"message": "Đăng xuất thành công"}
