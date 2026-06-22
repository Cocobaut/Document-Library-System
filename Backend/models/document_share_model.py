# models/share.py
# Model bảng trung gian document_share tương thích 100% với Postgres Schema
import uuid
from sqlalchemy import Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class DocumentShare(Base):
    """
    Bảng trung gian lưu thông tin chia sẻ tài liệu ngang hàng.
    """
    __tablename__ = "document_share"

    shared_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    shared_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    shared_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships 
    document = relationship("Document", back_populates="shares")
    
    # Khai báo biến thực thể làm sạch mối quan hệ Ambiguous
    shared_with_user = relationship(
        "User", 
        foreign_keys=[shared_with_user_id], 
        back_populates="shared_documents"
    )
    shared_by_user = relationship(
        "User", 
        foreign_keys=[shared_by], 
        back_populates="sent_shares"
    )

    def __repr__(self):
        return f"<DocumentShare(shared_id={self.shared_id}, document_id={self.document_id})>"