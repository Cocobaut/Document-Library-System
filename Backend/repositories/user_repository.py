# repositories/user_repository.py
# Tầng truy cập dữ liệu cho bảng users phù hợp Postgres Schema

from sqlalchemy.orm import Session
from sqlalchemy import func

from models.user_model import User
from models.document_model import Document


class UserRepository:
    """Repository xử lý truy vấn dữ liệu liên quan đến bảng users"""

    @staticmethod
    def get_by_username(db: Session, username: str) -> User | None:
        """Tìm kiếm người dùng trong Database bằng username"""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_by_id(db: Session, user_id) -> User | None:
        """Tìm user theo ID dạng UUID"""
        return db.query(User).filter(User.user_id == user_id).first()

    @staticmethod
    def get_by_username(db: Session, username: str) -> User | None:
        """Tìm user theo username"""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_by_username_and_unit(db: Session, username: str, unit_id) -> User | None:
        """Tìm user theo username và mã đơn vị (UUID)"""
        return db.query(User).filter(
            User.username == username,
            User.unit_id == unit_id
        ).first()

    @staticmethod
    def get_by_unit(db: Session, unit_id) -> list[User]:
        """Lấy danh sách user thuộc đơn vị"""
        return db.query(User).filter(User.unit_id == unit_id).all()

    @staticmethod
    def count_by_unit(db: Session, unit_id) -> int:
        """Đếm số lượng user thuộc đơn vị"""
        return db.query(func.count(User.user_id)).filter(User.unit_id == unit_id).scalar() or 0

    @staticmethod
    def sum_used_bytes_by_unit(db: Session, unit_id) -> int:
        """Tính tổng dung lượng đã sử dụng của tất cả user trong đơn vị"""
        return db.query(func.sum(User.storage_used)).filter(
            User.unit_id == unit_id
        ).scalar() or 0

    @staticmethod
    def get_users_with_doc_count_by_unit(db: Session, unit_id):
        """
        Truy vấn danh sách user thuộc đơn vị kèm số lượng tài liệu của từng user.
        Trả về list of Row(user_id, username, full_name, storage_quota, storage_used, document_count).
        """
        doc_count_subquery = (
            db.query(Document.owner_id, func.count(Document.document_id).label("doc_count"))
            .group_by(Document.owner_id)
            .subquery()
        )

        return (
            db.query(
                User.user_id,
                User.username,
                User.full_name,
                User.storage_quota,
                User.storage_used,
                func.coalesce(doc_count_subquery.c.doc_count, 0).label("document_count")
            )
            .outerjoin(doc_count_subquery, User.user_id == doc_count_subquery.c.owner_id)
            .filter(User.unit_id == unit_id)
            .all()
        )

    @staticmethod
    def create(db: Session, user: User) -> User:
        """Thêm user mới vào database"""
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_quota(db: Session, user: User, new_quota: int) -> User:
        """Cập nhật hạn mức dung lượng"""
        user.storage_quota = new_quota
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_used_bytes(db: Session, user: User, delta_bytes: int) -> User:
        """Cập nhật dung lượng đã sử dụng (cộng/trừ delta)"""
        user.storage_used = max(0, user.storage_used + delta_bytes)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_password(db: Session, user: User, hashed_password: str) -> User:
        """Cập nhật mật khẩu đã băm"""
        user.password_hash = hashed_password
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_all(db: Session) -> list[User]:
        """
        Truy vấn toàn bộ danh sách người dùng trong hệ thống.
        Sắp xếp danh sách theo bảng chữ cái của username (hoặc full_name).
        """
        return db.query(User).order_by(User.username.asc()).all()
    
    @staticmethod
    def get_by_username(db: Session, username: str) -> User | None:
        """Tìm kiếm người dùng chính xác theo username"""
        return db.query(User).filter(User.username == username).first()