# schemas/unit.py
# Schema cho Admin tạo/sửa đơn vị

from pydantic import BaseModel, Field, ConfigDict, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import UUID

class UnitCreate(BaseModel):
    """Schema tạo đơn vị mới"""
    name: str = Field(..., min_length=1, max_length=255, description="Tên đơn vị")
    parent_id: Optional[int] = Field(None, description="ID đơn vị cha (null = đơn vị gốc)")
    quota_bytes: int = Field(default=0, ge=0, description="Hạn mức dung lượng (bytes)")


class UnitUpdate(BaseModel):
    """Schema cập nhật đơn vị"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    parent_id: Optional[int] = Field(None, description="Di chuyển đơn vị sang nhánh mới")
    quota_bytes: Optional[int] = Field(None, ge=0)
    manager_user_id: Optional[UUID] = Field(None, description="ID của nhân sự quản lý mới được chỉ định")


class UnitResponse(BaseModel):
    id: UUID = Field(validation_alias="unit_id")
    name: str
    parent_id: Optional[UUID] = None
    path: str
    
    level: int = 0
    quota_bytes: int = 10737418240
    used_bytes: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True)


class UnitTreeNode(BaseModel):
    """Schema đầu ra cây đơn vị (dạng đệ quy)"""
    id: int
    name: str
    level: int
    quota_bytes: int
    used_bytes: int
    children: list["UnitTreeNode"] = []

    class Config:
        from_attributes = True


class UnitStatResponse(BaseModel):
    """Schema trả về danh sách đơn vị kèm số liệu thống kê"""
    unit_id: UUID = Field(..., description="ID của đơn vị")
    name: str = Field(..., description="Tên phòng ban/đơn vị")
    user_count: int = Field(0, description="Số lượng thành viên thuộc phòng ban")
    document_count: int = Field(0, description="Số lượng tài liệu thuộc phòng ban")

    model_config = ConfigDict(from_attributes=True)


class UnitDetailMember(BaseModel):
    full_name: str
    role: str
    used_quota: int
    total_quota: int
    status: str

    model_config = ConfigDict(from_attributes=True)


class UnitDetailResponse(BaseModel):
    unit_id: UUID
    unit_name: str
    total_members: int
    total_documents: int
    used_quota: int
    total_quota: int
    members: List[UnitDetailMember]

    model_config = ConfigDict(from_attributes=True)


class UnitQuotaResponse(BaseModel):
    """Schema trả về thông tin hạn mức dung lượng của một phòng ban"""
    unit_id: UUID = Field(..., description="ID của đơn vị")
    name: str = Field(..., description="Tên phòng ban")
    quota_bytes: int = Field(..., description="Hạn mức dung lượng phòng ban (bytes)")

    model_config = ConfigDict(from_attributes=True)


class TotalQuotaSystemResponse(BaseModel):
    """Schema trả về tổng dung lượng của toàn hệ thống"""
    total_quota_bytes: int = Field(..., description="Tổng hạn mức dung lượng của tất cả đơn vị cộng lại (bytes)")
    total_units: int = Field(..., description="Tổng số lượng đơn vị phòng ban")


class UnitDocumentStat(BaseModel):
    """Thống kê tài liệu của riêng từng đơn vị"""
    unit_id: UUID
    unit_name: str
    total_documents: int = Field(..., description="Tổng số tài liệu thuộc phòng ban này")


class CompanyDocumentStatsResponse(BaseModel):
    """Schema phản hồi tổng thể cho Admin"""
    company_total_documents: int = Field(..., description="Tổng số tài liệu toàn công ty")
    details_by_unit: List[UnitDocumentStat] = Field(..., description="Danh sách thống kê chi tiết theo từng đơn vị")


class UnitLookupResponse(BaseModel):
    name: str
    unit_id: UUID = Field(..., description="Mã định danh UUID của đơn vị phòng ban")


class AnalyticsOverviewResponse(BaseModel):
    total_units: int
    total_users: int
    total_documents: int
    quota_used_bytes: int