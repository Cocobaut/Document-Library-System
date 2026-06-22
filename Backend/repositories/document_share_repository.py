# repositories/document_share_repository.py
# Tầng truy cập dữ liệu cho bảng document_share phù hợp Postgres Schema

from sqlalchemy.orm import Session
from models.document_share_model import DocumentShare


class DocumentShareRepository:
    """Repository xử lý truy vấn dữ liệu liên quan đến bảng document_share"""

    @staticmethod
    def get_by_document_and_user(
        db: Session, document_id, user_id
    ) -> DocumentShare | None:
        """
        Tìm bản ghi chia sẻ theo document_id và user_id (UUID).
        Trả về lượt chia sẻ tài liệu đích danh cho một user cụ thể.
        """
        return db.query(DocumentShare).filter(
            DocumentShare.document_id == document_id,
            DocumentShare.shared_with_user_id == user_id
        ).first()

    @staticmethod
    def create(db: Session, share: DocumentShare) -> DocumentShare:
        """Thêm bản ghi chia sẻ mới vào cơ sở dữ liệu"""
        db.add(share)
        db.commit()
        db.refresh(share)
        return share