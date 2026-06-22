# repositories/bookmark_repository.py
# Tầng truy cập dữ liệu cho bảng bookmarks phù hợp Postgres Schema

from sqlalchemy.orm import Session
from models.bookmark_model import Bookmark


class BookmarkRepository:
    """Repository xử lý truy vấn dữ liệu liên quan đến bảng bookmarks"""

    @staticmethod
    def get_by_user_and_document(
        db: Session, user_id, document_id
    ) -> Bookmark | None:
        """
        Tìm bản ghi bookmark theo user_id và document_id.
        Cả hai tham số đầu vào được xử lý dưới dạng định danh UUID.
        """
        return db.query(Bookmark).filter(
            Bookmark.user_id == user_id,
            Bookmark.document_id == document_id,
        ).first()

    @staticmethod
    def create(db: Session, bookmark: Bookmark) -> Bookmark:
        """Thêm bản ghi bookmark mới vào cơ sở dữ liệu"""
        db.add(bookmark)
        db.commit()
        db.refresh(bookmark)
        return bookmark

    @staticmethod
    def delete(db: Session, bookmark: Bookmark) -> None:
        """Xóa hoàn toàn bản ghi bookmark khỏi cơ sở dữ liệu"""
        db.delete(bookmark)
        db.commit()