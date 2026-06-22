# schemas/manager.py
# Schema phục vụ xuất dữ liệu thống kê dung lượng đơn vị

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class UnitStorageStats(BaseModel):
    """Schema thống kê dung lượng 1 đơn vị"""
    unit_id: UUID
    unit_name: str
    quota_bytes: int = Field(..., description="Hạn mức dung lượng")
    used_bytes: int = Field(..., description="Đã sử dụng")
    free_bytes: int = Field(..., description="Còn trống")
    usage_percent: float = Field(..., description="Phần trăm đã sử dụng")
    total_documents: int = Field(..., description="Tổng số tài liệu")
    total_users: int = Field(..., description="Tổng số người dùng")
    inherited_documents: int = Field(..., description="Số lượng tài liệu được kế thừa")


class UserStorageStats(BaseModel):
    """Schema thống kê dung lượng 1 người dùng trong đơn vị"""
    user_id: int
    username: str
    full_name: Optional[str]
    quota_bytes: int
    used_bytes: int
    usage_percent: float
    document_count: int


class UnitDetailedReport(BaseModel):
    """Schema báo cáo chi tiết dung lượng đơn vị bao gồm từng user"""
    unit: UnitStorageStats
    users: list[UserStorageStats]


class StorageOverview(BaseModel):
    """Schema tổng quan dung lượng toàn hệ thống (dành cho Admin)"""
    total_units: int
    total_users: int
    total_documents: int
    total_quota_bytes: int
    total_used_bytes: int
    overall_usage_percent: float
    units: list[UnitStorageStats]
