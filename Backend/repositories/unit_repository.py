# repositories/unit_repository.py
# Tầng truy cập dữ liệu cho bảng units

from sqlalchemy.orm import Session
from sqlalchemy import func
from models.unit_model import Unit
from models.user_model import User
from models.document_model import Document

class UnitRepository:
    """Repository xử lý truy vấn dữ liệu liên quan đến bảng units"""

    @staticmethod
    def get_by_id(db: Session, unit_id) -> Unit | None:
        """Tìm đơn vị theo ID"""
        return db.query(Unit).filter(Unit.unit_id == unit_id).first()

    @staticmethod
    def get_all(db: Session) -> list[Unit]:
        """Lấy tất cả đơn vị"""
        return db.query(Unit).all()

    @staticmethod
    def get_descendants(db: Session, path_prefix: str) -> list[Unit]:
        """Lấy tất cả đơn vị con cháu có path bắt đầu bằng prefix"""
        return db.query(Unit).filter(Unit.path.like(f"{path_prefix}%")).all()

    @staticmethod
    def get_tree(db: Session, root_path: str = None) -> list[Unit]:
        """Lấy cây đơn vị sắp xếp theo path (từ root_path hoặc toàn bộ)"""
        if root_path:
            return db.query(Unit).filter(
                Unit.path.like(f"{root_path}%")
            ).order_by(Unit.path).all()
        return db.query(Unit).order_by(Unit.path).all()

    @staticmethod
    def create(db: Session, unit: Unit) -> Unit:
        """Thêm đơn vị mới (flush để lấy ID, chưa commit)"""
        db.add(unit)
        db.flush()
        return unit

    @staticmethod
    def commit_and_refresh(db: Session, unit: Unit) -> Unit:
        """Commit transaction và refresh object"""
        db.commit()
        db.refresh(unit)
        return unit

    @staticmethod
    def delete_subtree(db: Session, path_prefix: str) -> None:
        """Xóa đơn vị và tất cả đơn vị con theo path prefix"""
        db.query(Unit).filter(
            Unit.path.like(f"{path_prefix}%")
        ).delete(synchronize_session="fetch")
        db.commit()

    @staticmethod
    def get_all_units_with_stats(db: Session):
        """
        Truy vấn toàn bộ danh sách phòng ban kèm số lượng thành viên và tài liệu.
        Sử dụng subquery hoặc outerjoin + group_by để tối ưu hóa hiệu năng 1 câu lệnh SQL.
        """
        results = db.query(
            Unit.unit_id,
            Unit.name,
            func.count(func.distinct(User.user_id)).label("user_count"),
            func.count(func.distinct(Document.document_id)).label("document_count")
        )\
        .outerjoin(User, Unit.unit_id == User.unit_id)\
        .outerjoin(Document, Unit.unit_id == Document.unit_id)\
        .group_by(Unit.unit_id, Unit.name)\
        .order_by(Unit.name.asc())\
        .all()
        
        return results
    
    @staticmethod
    def commit_and_refresh(db: Session, unit: Unit) -> Unit:
        """Lưu lại thay đổi trạng thái entity và nạp lại dữ liệu mới nhất"""
        db.commit()
        db.refresh(unit)
        return unit
    
    @staticmethod
    def get_units_quota_list(db: Session) -> list[Unit]:
        """Lấy danh sách tất cả phòng ban kèm cột quota của họ"""
        return db.query(Unit.unit_id, Unit.name, Unit.quota_bytes).order_by(Unit.name.asc()).all()

    @staticmethod
    def get_system_total_quota(db: Session):
        """Tính toán tổng quota và đếm tổng số phòng ban trên toàn hệ thống"""
        result = db.query(
            func.coalesce(func.sum(Unit.quota_bytes), 0).label("total_quota"),
            func.count(Unit.unit_id).label("total_units")
        ).first()
        return result
    
    @staticmethod
    def get_by_name(db: Session, name: str) -> Unit | None:
        """Tìm kiếm phòng ban chính xác theo tên đơn vị"""
        return db.query(Unit).filter(Unit.name == name).first()