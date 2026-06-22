# repositories/document_repository.py
# Tầng truy cập dữ liệu cho bảng documents phù hợp Postgres Schema

from sqlalchemy.orm import Session
from sqlalchemy import func

from models.document_model import Document
from models.document_share_model import DocumentShare
from models.user_model import User
from models.unit_model import Unit

class DocumentRepository:
    """Repository xử lý truy vấn dữ liệu liên quan đến bảng documents"""

    @staticmethod
    def get_by_id(db: Session, document_id) -> Document | None:
        """Tìm tài liệu theo ID dạng UUID"""
        return db.query(Document).filter(Document.document_id == document_id).first()

    @staticmethod
    def get_personal_documents(
        db: Session, owner_id, offset: int, limit: int
    ) -> tuple[list[Document], int]:
        """Lấy danh sách tài liệu cá nhân (do chính user sở hữu) kèm tổng số"""
        query = db.query(Document).filter(Document.owner_id == owner_id)
        total = query.count()
        docs = query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()
        return docs, total

    @staticmethod
    def get_shared_documents(
        db: Session, user_id, offset: int, limit: int
    ) -> tuple[list[Document], int]:
        """Lấy danh sách tài liệu được chia sẻ đích danh cho user kèm tổng số"""
        query = db.query(Document).join(
            DocumentShare, DocumentShare.document_id == Document.document_id
        ).filter(
            DocumentShare.shared_with_user_id == user_id
        )
        total = query.count()
        docs = query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()
        return docs, total

    @staticmethod
    def get_unit_inherited_documents(
        db: Session, ancestor_unit_ids: list, exclude_owner_id,
        offset: int, limit: int
    ) -> tuple[list[Document], int]:
        """Lấy danh sách tài liệu công khai kế thừa từ đơn vị cha/bản thân kèm tổng số"""
        query = db.query(Document).filter(
            Document.unit_id.in_(ancestor_unit_ids),
            Document.is_public == True,
            Document.owner_id != exclude_owner_id
        )
        total = query.count()
        docs = query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()
        return docs, total

    @staticmethod
    def count_by_unit_users(db: Session, unit_id) -> int:
        """Đếm tổng số tài liệu của các user thuộc đơn vị"""
        return (
            db.query(func.count(Document.document_id))
            .join(User, Document.owner_id == User.user_id)
            .filter(User.unit_id == unit_id)
            .scalar() or 0
        )

    @staticmethod
    def count_inherited_documents(db: Session, ancestor_unit_ids: list, exclude_owner_id) -> int:
        """Đếm số lượng tài liệu kế thừa (public từ các đơn vị cha)"""
        return db.query(Document).filter(
            Document.unit_id.in_(ancestor_unit_ids),
            Document.is_public == True,
            Document.owner_id != exclude_owner_id
        ).count()

    @staticmethod
    def create(db: Session, document: Document) -> Document:
        """Thêm tài liệu mới vào database"""
        db.add(document)
        db.commit()
        db.refresh(document)
        return document

    @staticmethod
    def delete(db: Session, document: Document) -> None:
        """Xóa hoàn toàn tài liệu khỏi Database (Hard Delete khớp với DB Schema thực tế)"""
        db.delete(document)
        db.commit()

    @staticmethod
    def update_public_status(db: Session, document: Document, is_public: bool) -> Document:
        """Cập nhật trạng thái công khai/riêng tư"""
        document.is_public = is_public
        db.commit()
        db.refresh(document)
        return document
    
    @staticmethod
    def get_company_total_count(db: Session) -> int:
        """Đếm tổng số tài liệu của toàn bộ công ty trong hệ thống"""
        return db.query(func.count(Document.document_id)).scalar() or 0

    @staticmethod
    def get_document_counts_grouped_by_unit(db: Session) -> list[tuple]:
        """
        Lấy danh sách số lượng tài liệu group theo từng đơn vị.
        Trả về danh sách các tuple: (unit_id, unit_name, document_count)
        Sử dụng OUTER JOIN với bảng Unit để các đơn vị chưa có document nào vẫn hiển thị (bằng 0).
        """
        return (
            db.query(
                Unit.unit_id,
                Unit.name,
                func.count(Document.document_id).label("doc_count")
            )
            .select_from(Unit)
            .join(Document, Unit.unit_id == Document.unit_id, isouter=True)
            .group_by(Unit.unit_id, Unit.name)
            .all()
        )