# models/task_model.py
# Thực thể Task (Nhãn tài liệu)

import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base

class Task(Base):
    """
    Model Task, đóng vai trò như nhãn phân loại tài liệu cho từng người dùng.
    """
    __tablename__ = "tasks"

    task_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False, index=True)
    task_name = Column(String(255), nullable=False)
    color = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="tasks")
    document = relationship("Document", back_populates="tasks")

    def __repr__(self):
        return f"<Task(task_id={self.task_id}, task_name='{self.task_name}', user_id={self.user_id})>"
