# models/user.py
# Thực thể người dùng tương thích 100% với Postgres Schema

import uuid

from sqlalchemy import Column, String, ForeignKey, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import textwrap

from .base import Base


class User(Base):
    """
    Model người dùng hệ thống.
    """
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, comment="ADMIN, UNIT_MANAGER, USER")
    unit_id = Column(UUID(as_uuid=True), ForeignKey("units.unit_id"), nullable=False, index=True)
    storage_quota = Column(BigInteger, nullable=False, default=10737418240)
    storage_used = Column(BigInteger, nullable=False, default=0)

    unit = relationship("Unit", back_populates="users")
    documents = relationship("Document", back_populates="owner")
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    
    shared_documents = relationship(
        "DocumentShare", 
        foreign_keys="[DocumentShare.shared_with_user_id]", 
        back_populates="shared_with_user",
        cascade="all, delete-orphan"
    )
    sent_shares = relationship(
        "DocumentShare", 
        foreign_keys="[DocumentShare.shared_by]", 
        back_populates="shared_by_user",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User(user_id={self.user_id}, username='{self.username}', role='{self.role}')>"