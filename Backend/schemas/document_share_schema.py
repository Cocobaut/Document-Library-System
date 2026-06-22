# schemas/share.py
# Schema phục vụ payload chia sẻ file

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ShareCreate(BaseModel):
    """Schema tạo lượt chia sẻ tài liệu"""
    document_id: int = Field(..., description="ID tài liệu cần chia sẻ")
    shared_with_user_id: int = Field(..., description="ID người nhận chia sẻ")
    permission: str = Field(default="view", description="Quyền: view, edit, download")


class ShareBatchCreate(BaseModel):
    """Schema chia sẻ tài liệu cho nhiều người cùng lúc"""
    document_id: int = Field(..., description="ID tài liệu cần chia sẻ")
    user_ids: list[int] = Field(..., min_length=1, description="Danh sách ID người nhận")
    permission: str = Field(default="view", description="Quyền: view, edit, download")


class ShareUpdate(BaseModel):
    """Schema cập nhật quyền chia sẻ"""
    permission: str = Field(..., description="Quyền mới: view, edit, download")


class ShareResponse(BaseModel):
    """Schema đầu ra thông tin chia sẻ"""
    id: int
    document_id: int
    shared_with_user_id: int
    permission: str
    shared_by_user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
