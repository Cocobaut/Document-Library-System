# models/bookmark.py
# Model bảng trung gian bookmarks (đánh dấu sao) tương thích 100% với Postgres Schema

from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base


class Bookmark(Base):
    """
    Bảng trung gian lưu thông tin đánh dấu sao tài liệu.
    Sử dụng Khóa chính phức hợp (Composite Primary Key) kết hợp từ cả 2 trường.
    """
    __tablename__ = "bookmarks"

    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.user_id", ondelete="CASCADE"), 
        primary_key=True
    )
    document_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("documents.document_id", ondelete="CASCADE"), 
        primary_key=True
    )

    # Relationships đối ứng song phương dạng số nhiều 'bookmarks'
    user = relationship("User", back_populates="bookmarks")
    document = relationship("Document", back_populates="bookmarks")

    def __repr__(self):
        return f"<Bookmark(user_id={self.user_id}, document_id={self.document_id})>"