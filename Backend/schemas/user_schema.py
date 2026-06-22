# schemas/user.py
# Schema cho User

from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional
from datetime import datetime, timezone
from uuid import UUID

class UserCreate(BaseModel):
    """Schema tạo người dùng mới"""
    username: str = Field(..., min_length=3, max_length=100)
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    full_name: Optional[str] = Field(None, max_length=255)
    role: str = Field(default="user", description="Vai trò: admin, manager, user")
    unit_id: UUID
    quota_bytes: int = Field(default=0, ge=0, description="Hạn mức dung lượng cá nhân (bytes)")


class UserUpdate(BaseModel):
    """Schema cập nhật người dùng"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = None
    unit_id: Optional[int] = None
    quota_bytes: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: UUID = Field(validation_alias="user_id")
    username: str
    full_name: str
    role: str
    
    unit_id: Optional[UUID] = None 
    
    quota_bytes: int = Field(validation_alias="storage_quota")
    used_bytes: int = Field(validation_alias="storage_used")
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    """Schema đầu ra profile cá nhân"""
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    unit_id: Optional[int]
    quota_bytes: int
    used_bytes: int

    class Config:
        from_attributes = True


class UserLookupResponse(BaseModel):
    username: str
    user_id: UUID = Field(..., description="Mã định danh UUID của người dùng")