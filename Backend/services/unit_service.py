# services/unit_service.py
# Tính toán dịch chuyển nhánh cây, sinh chuỗi path phù hợp Postgres Schema

from fastapi import HTTPException, status
from repositories.document_repository import DocumentRepository
from models.user_model import User

from sqlalchemy.orm import Session
from models.unit_model import Unit
from schemas.unit_schema import CompanyDocumentStatsResponse, UnitCreate, UnitDocumentStat, UnitUpdate, UnitLookupResponse, UnitDetailResponse, UnitDetailMember, AnalyticsOverviewResponse
from core.exceptions import DocumentNotFoundException
from repositories.unit_repository import UnitRepository
from models.document_model import Document
from sqlalchemy import func
from uuid import UUID

class UnitService:
    """Service xử lý logic nghiệp vụ liên quan đến cây đơn vị"""

    @staticmethod
    def generate_path(parent_path: str, unit_id) -> str:
        """Sinh chuỗi materialized path cho đơn vị mới"""
        return f"{parent_path}{unit_id}/"

    @staticmethod
    def create_unit(db: Session, data: UnitCreate) -> Unit:
        """Tạo đơn vị mới và sinh path tự động (Đã chặn trùng tên)"""
        
        existing_unit = db.query(Unit).filter(Unit.name == data.name).first()
        if existing_unit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tên đơn vị phòng ban '{data.name}' đã tồn tại trên hệ thống. Vui lòng chọn tên khác."
            )

        parent_path = "/"

        if data.parent_id:
            parent = UnitRepository.get_by_id(db, data.parent_id)
            if not parent:
                raise DocumentNotFoundException(detail="Đơn vị cha không tồn tại")
            parent_path = parent.path

        unit = Unit(
            name=data.name,
            parent_id=data.parent_id,
            path="/",
            quota_bytes=data.quota_bytes 
        )
        
        UnitRepository.create(db, unit)

        unit.path = UnitService.generate_path(parent_path, unit.unit_id)
        return UnitRepository.commit_and_refresh(db, unit)

    @staticmethod
    def move_unit(db: Session, unit_id, new_parent_id) -> Unit:
        """
        Dịch chuyển đơn vị sang nhánh mới.
        Cập nhật path cho tất cả đơn vị con.
        """
        unit = UnitRepository.get_by_id(db, unit_id)
        if not unit:
            raise DocumentNotFoundException(detail="Đơn vị không tồn tại")

        new_parent = UnitRepository.get_by_id(db, new_parent_id)
        if not new_parent:
            raise DocumentNotFoundException(detail="Đơn vị cha mới không tồn tại")

        old_path = unit.path
        new_path = UnitService.generate_path(new_parent.path, unit.unit_id)

        descendants = UnitRepository.get_descendants(db, old_path)
        for descendant in descendants:
            descendant.path = descendant.path.replace(old_path, new_path, 1)

        unit.parent_id = new_parent_id
        return UnitRepository.commit_and_refresh(db, unit)

    @staticmethod
    def get_unit_tree(db: Session, root_id = None) -> list[Unit]:
        """Lấy cây đơn vị từ root_id (hoặc toàn bộ nếu root_id=None)"""
        if root_id:
            root = UnitRepository.get_by_id(db, root_id)
            if not root:
                return []
            return UnitRepository.get_tree(db, root.path)
        return UnitRepository.get_tree(db)

    @staticmethod
    def delete_unit(db: Session, unit_id) -> bool:
        """Xóa đơn vị và tất cả đơn vị con (Chỉ xóa nếu toàn bộ nhánh cây không còn user nào)"""
        unit = UnitRepository.get_by_id(db, unit_id)
        if not unit:
            raise DocumentNotFoundException(detail="Đơn vị không tồn tại")

        sub_units = db.query(Unit).filter(Unit.path.like(f"{unit.path}%")).all()
        
        sub_unit_ids = [sub.unit_id for sub in sub_units]

        user_exists = db.query(User).filter(User.unit_id.in_(sub_unit_ids)).first()
        
        if user_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa đơn vị này hoặc các đơn vị con của nó vì vẫn còn người dùng thuộc phòng ban!"
            )

        for sub_unit in sub_units:
            db.delete(sub_unit)
            
        db.commit()
        return True
    
    @staticmethod
    def get_all_units_with_stats(db: Session):
        """Logic nghiệp vụ lấy tất cả đơn vị kèm thống kê thành viên & tài liệu"""
        return UnitRepository.get_all_units_with_stats(db)

    @staticmethod
    def get_unit_detail(db: Session, unit_id: UUID) -> UnitDetailResponse:
        from models.document_model import Document
        
        unit = UnitRepository.get_by_id(db, unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Đơn vị không tồn tại."
            )
            
        users = db.query(User).filter(User.unit_id == unit_id).all()
        documents = db.query(Document).filter(Document.unit_id == unit_id).all()
        
        total_members = len(users)
        total_documents = len(documents)
        used_quota = sum((doc.file_size or 0) for doc in documents)
        total_quota = unit.quota_bytes
        
        members = []
        for user in users:
            members.append(UnitDetailMember(
                full_name=user.full_name,
                role=user.role,
                used_quota=user.storage_used,
                total_quota=user.storage_quota,
                status="active"
            ))
            
        return UnitDetailResponse(
            unit_id=unit.unit_id,
            unit_name=unit.name,
            total_members=total_members,
            total_documents=total_documents,
            used_quota=used_quota,
            total_quota=total_quota,
            members=members
        )
    
    @staticmethod
    def update_unit_info(db: Session, unit_id: UUID, data: UnitUpdate) -> Unit:
        """
        Cập nhật thông tin phòng ban (Tên, Hạn mức, Quản trị viên).
        Đảm bảo kiểm tra ràng buộc logic quản trị viên mới.
        """
        unit = UnitRepository.get_by_id(db, unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Đơn vị phòng ban cần cập nhật không tồn tại."
            )

        if data.name is not None:
            unit.name = data.name
        if data.quota_bytes is not None:
            allocated = db.query(func.sum(User.storage_quota)).filter(User.unit_id == unit_id).scalar() or 0
            if data.quota_bytes < allocated:
                allocated_gb = allocated / (1024**3)
                allocated_str = str(int(allocated_gb)) if allocated_gb.is_integer() else f"{allocated_gb:.2f}".rstrip('0').rstrip('.')
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The unit already has {allocated_str} GB allocated to its users. The unit quota cannot be reduced below this value."
                )
            unit.quota_bytes = data.quota_bytes

        if data.manager_user_id is not None:
            
            new_manager = db.query(User).filter(User.user_id == data.manager_user_id).first()
            
            if not new_manager:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Nhân sự được chỉ định làm quản lý không tồn tại trên hệ thống."
                )
            
            if new_manager.role == "UNIT_MANAGER" and new_manager.unit_id is not None:
                if new_manager.unit_id != unit_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Nhân sự '{new_manager.full_name}' hiện đã là quản lý của một đơn vị khác. Không thể chỉ định lại."
                    )

            new_manager.role = "UNIT_MANAGER"
            new_manager.unit_id = unit_id

        return UnitRepository.commit_and_refresh(db, unit)
    
    @staticmethod
    def get_quota_by_units(db: Session):
        """Logic lấy danh sách phòng ban và quota tương ứng"""
        return UnitRepository.get_units_quota_list(db)

    @staticmethod
    def get_system_all_quota(db: Session):
        """Logic thống kê tổng số quota toàn hệ thống"""
        quota_stats = UnitRepository.get_system_total_quota(db)
        return {
            "total_quota_bytes": quota_stats.total_quota,
            "total_units": quota_stats.total_units
        }
    
    @staticmethod
    def get_company_document_statistics(db: Session) -> CompanyDocumentStatsResponse:
        """Xử lý logic tổng hợp dữ liệu thống kê tài liệu cho Admin"""
        company_total = DocumentRepository.get_company_total_count(db)
        
        raw_stats = DocumentRepository.get_document_counts_grouped_by_unit(db)
        
        details = [
            UnitDocumentStat(
                unit_id=row[0],
                unit_name=row[1],
                total_documents=row[2]
            )
            for row in raw_stats
        ]
        
        return CompanyDocumentStatsResponse(
            company_total_documents=company_total,
            details_by_unit=details
        )
    
    @staticmethod
    def get_unit_id_by_name(db: Session, name: str) -> UnitLookupResponse:
        """Tra cứu unit_id dựa trên tên đơn vị, ném lỗi 404 nếu không thấy"""
        unit = UnitRepository.get_by_name(db, name)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy đơn vị phòng ban nào có tên '{name}'."
            )
        return UnitLookupResponse(name=unit.name, unit_id=unit.unit_id)

    @staticmethod
    def get_analytics_overview(db: Session):
        total_units = db.query(Unit).count()
        total_users = db.query(User).count()
        total_documents = db.query(Document).count()
        
        used_bytes_sum = db.query(func.sum(User.storage_used)).scalar() or 0
        
        return AnalyticsOverviewResponse(
            total_units=total_units,
            total_users=total_users,
            total_documents=total_documents,
            quota_used_bytes=used_bytes_sum
        )