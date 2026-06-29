# schemas/document.py
# Schema cho Document

from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class DocumentCreate(BaseModel):
    """Schema metadata khi upload tài liệu (Đã đồng bộ DB thực tế)"""
    title: str = Field(..., min_length=1, max_length=255)
    is_public: bool = Field(default=False, description="Công khai cho toàn đơn vị")
    unit_id: UUID = Field(..., description="Mã đơn vị sở hữu")
    folder_id: Optional[UUID] = Field(None, description="ID của folder nếu được upload theo dạng thư mục. Upload đơn lẻ sẽ là null.")


class DocumentUpdate(BaseModel):
    """Schema cập nhật metadata tài liệu"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    is_public: Optional[bool] = None
    folder_id: Optional[UUID] = Field(None, description="Cập nhật tài liệu")


class DocumentResponse(BaseModel):
    """Schema đầu ra chi tiết tài liệu (Khớp 100% với các cột của bảng documents trong DB)"""
    document_id: UUID       
    title: str              
    file_path: str         
    file_size: int         
    file_type: str         
    owner_id: UUID        
    unit_id: UUID       
    is_public: bool
    created_at: datetime
    folder_id: Optional[UUID] = None
    folder_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class CategorizedDocumentItems(BaseModel):
    """Danh sách tài liệu phân loại theo 3 nguồn quyền lợi"""
    personal: List[DocumentResponse] = Field(default_factory=list)
    shared: List[DocumentResponse] = Field(default_factory=list)
    unit_inherited: List[DocumentResponse] = Field(default_factory=list)


class CategorizedDocumentCount(BaseModel):
    """Tổng số lượng bản ghi tương ứng cho từng nguồn"""
    personal: int = 0
    shared: int = 0
    unit_inherited: int = 0


class DocumentListResponse(BaseModel):
    """Schema đầu ra danh sách tài liệu có phân trang chuẩn khớp cho Router chính"""
    items: CategorizedDocumentItems
    totals: CategorizedDocumentCount
    page: int
    page_size: int
    total_pages: int


class DocumentSharePayload(BaseModel):
    """Schema nhận request thực hiện chia sẻ tài liệu ngang hàng"""
    username: str = Field(..., description="Username của người được chia sẻ")
    unit_id: UUID = Field(..., description="ID phòng ban/đơn vị của người được chia sẻ (Dạng UUID)")


class DocumentUpdatePublicPayload(BaseModel):
    """Schema cập nhật trạng thái public"""
    is_public: bool = Field(
        ..., 
        description="Trạng thái công khai mới (True: công khai đơn vị, False: riêng tư)"
    )


class DocumentShareResponse(BaseModel):
    """Schema phản hồi khi thực hiện chia sẻ tài liệu thành công"""
    message: str
    share_id: UUID           
    document_id: UUID         
    shared_by: UUID           
    shared_with_user_id: UUID 
    shared_at: datetime     

    class Config:
        from_attributes = True

# class DocumentSearchQuery(BaseModel):
#     """Schema tham số tìm kiếm tài liệu"""
#     keyword: Optional[str] = Field(None, description="Từ khóa tìm kiếm trong nội dung/tiêu đề")
#     file_type: Optional[str] = Field(None, description="Lọc theo loại file")
#     owner_id: Optional[int] = Field(None, description="Lọc theo người sở hữu")
#     page: int = Field(default=1, ge=1)
#     page_size: int = Field(default=20, ge=1, le=100)