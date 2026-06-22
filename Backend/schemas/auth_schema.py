# schemas/auth.py
# Schema cho LoginPayload, TokenResponse

from pydantic import BaseModel, Field

class LoginPayload(BaseModel):
    """Schema đầu vào cho API đăng nhập"""
    username: str = Field(..., min_length=1, description="Tên đăng nhập")
    password: str = Field(..., min_length=1, description="Mật khẩu")


class ChangePasswordPayload(BaseModel):
    """Schema đầu vào cho API đổi mật khẩu"""
    old_password: str = Field(..., min_length=1, description="Mật khẩu hiện tại")
    new_password: str = Field(..., min_length=6, max_length=100, description="Mật khẩu mới (Tối thiểu 6 ký tự)")

class TokenResponse(BaseModel):
    """Schema đầu ra khi đăng nhập thành công"""
    access_token: str = Field(..., description="JWT Access Token")
    token_type: str = Field(default="bearer", description="Loại token")


class TokenData(BaseModel):
    """Schema dữ liệu giải mã từ JWT Token"""
    user_id: int | None = None
    username: str | None = None
