# models/unit.py
# Thực thể cây đơn vị (Phòng ban / Chi nhánh)

from sqlalchemy import Column, String, ForeignKey, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base
import uuid

class Unit(Base):
    """
    Model đơn vị tổ chức theo cấu trúc cây (tree structure)
    Sử dụng materialized path để truy vấn cây hiệu quả.
    """
    __tablename__ = "units"

    unit_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("units.unit_id", ondelete="SET NULL"), nullable=True)
    path = Column(String(1000), nullable=False, index=True)

    parent = relationship("Unit", remote_side=[unit_id], back_populates="children")
    children = relationship("Unit", back_populates="parent", cascade="all, delete-orphan")
    
    users = relationship("User", back_populates="unit")
    documents = relationship("Document", back_populates="unit")
    
    quota_bytes = Column(BigInteger, nullable=False, default=1000000000)

    def __repr__(self):
        return f"<Unit(unit_id={self.unit_id}, name='{self.name}', path='{self.path}')>"