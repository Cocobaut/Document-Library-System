# schemas/task_schema.py
# Schema cho Task (Nhãn tài liệu)

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class TaskCreate(BaseModel):
    """Schema khi tạo mới một task (nhãn)"""
    document_id: UUID = Field(..., description="ID của tài liệu cần gắn nhãn")
    task_name: str = Field(..., min_length=1, max_length=255, description="Tên của nhãn/task")
    color: str = Field(..., min_length=1, max_length=50, description="Mã màu của nhãn")


class TaskUpdate(BaseModel):
    """Schema khi cập nhật một task"""
    task_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Tên của nhãn/task")
    color: Optional[str] = Field(None, min_length=1, max_length=50, description="Mã màu của nhãn")


class TaskResponse(BaseModel):
    """Schema đầu ra chi tiết Task"""
    task_id: UUID
    user_id: UUID
    document_id: UUID
    task_name: str
    color: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
