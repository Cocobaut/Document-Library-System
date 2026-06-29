# models/document.py
# Thực thể tài liệu tương thích 100% với Postgres Schema

from sqlalchemy import Column, String, ForeignKey, BigInteger, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base
import uuid

class Document(Base):
    """
    Model tài liệu.
    """
    __tablename__ = "documents"

    document_id = document_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_type = Column(String(10), nullable=False)
    is_public = Column(Boolean, nullable=False, default=False)
    unit_id = Column(UUID(as_uuid=True), ForeignKey("units.unit_id"), nullable=False, index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    folder_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    folder_name = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships đối ứng khép kín
    owner = relationship("User", back_populates="documents")
    unit = relationship("Unit", back_populates="documents")
    shares = relationship("DocumentShare", back_populates="document", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="document", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Document(document_id={self.document_id}, title='{self.title}', owner_id={self.owner_id})>"