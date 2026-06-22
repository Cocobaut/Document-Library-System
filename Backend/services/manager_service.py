# services/manager_service.py
from sqlalchemy.orm import Session
from models.unit_model import Unit
from models.user_model import User
from models.document_model import Document
from schemas.manager_schema import UserStorageStats, UnitDetailedReport, UnitStorageStats
from fastapi import HTTPException, status
from core.exceptions import DocumentNotFoundException, AccessDeniedException
from repositories.unit_repository import UnitRepository
from repositories.user_repository import UserRepository
from repositories.document_repository import DocumentRepository
from uuid import UUID

class ManagerService:
    @staticmethod
    def get_unit_storage_stats(db: Session, unit_id: UUID) -> UnitStorageStats:
        """
        Tính toán và tổng hợp các chỉ số dung lượng lưu trữ của một đơn vị phòng ban.
        """
        unit = UnitRepository.get_by_id(db, unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Đơn vị không tồn tại trên hệ thống."
            )

        total_users = UserRepository.count_by_unit(db, unit_id)

        total_documents = DocumentRepository.count_by_unit_users(db, unit_id)

        total_used_bytes = UserRepository.sum_used_bytes_by_unit(db, unit_id)

        quota_bytes = getattr(unit, "quota_bytes", 0) or 0
        free_bytes = max(0, quota_bytes - total_used_bytes)
        
        usage_percent = 0.0
        if quota_bytes > 0:
            usage_percent = round((total_used_bytes / quota_bytes) * 100, 2)

        return UnitStorageStats(
            unit_id=unit.unit_id,
            unit_name=unit.name,
            quota_bytes=quota_bytes,
            used_bytes=total_used_bytes,
            free_bytes=free_bytes,
            usage_percent=usage_percent,
            total_documents=total_documents,
            total_users=total_users
        )

    @staticmethod
    def get_unit_storage_detail(db: Session, manager_user: User) -> UnitDetailedReport:
        unit = UnitRepository.get_by_id(db, manager_user.unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy thông tin đơn vị"
            )

        users_data = UserRepository.get_users_with_doc_count_by_unit(db, unit.id)

        user_stats_list = []
        total_unit_used_bytes = 0
        total_unit_documents = 0
        total_unit_users = len(users_data)

        for u in users_data:
            u_quota = u.quota_bytes if u.quota_bytes > 0 else 1
            u_usage_percent = round((u.used_bytes / u_quota) * 100, 2)

            user_stats_list.append(
                UserStorageStats(
                    user_id=u.id,
                    username=u.username,
                    full_name=u.full_name,
                    quota_bytes=u.quota_bytes,
                    used_bytes=u.used_bytes,
                    usage_percent=u_usage_percent,
                    document_count=u.document_count
                )
            )
            total_unit_used_bytes += u.used_bytes
            total_unit_documents += u.document_count

        unit_quota = getattr(unit, "quota_bytes", 0) 
        unit_free_bytes = max(0, unit_quota - total_unit_used_bytes)
        
        unit_quota_for_calc = unit_quota if unit_quota > 0 else 1
        unit_usage_percent = round((total_unit_used_bytes / unit_quota_for_calc) * 100, 2)

        unit_stats = UnitStorageStats(
            unit_id=unit.unit_id,
            unit_name=unit.name,
            quota_bytes=unit_quota,
            used_bytes=total_unit_used_bytes,
            free_bytes=unit_free_bytes,
            usage_percent=unit_usage_percent,
            total_documents=total_unit_documents,
            total_users=total_unit_users
        )

        return UnitDetailedReport(
            unit=unit_stats,
            users=user_stats_list
        )
    
    @staticmethod
    def create_unit_document(db: Session, title: str, file_info: dict, manager: User) -> Document:
        doc_title = title if title and title.strip() else file_info["file_name"]

        document = Document(
            title=doc_title,
            file_path=file_info["file_path"],
            file_size=file_info["file_size"],
            file_type=file_info["file_type"],
            owner_id=manager.user_id,   
            unit_id=manager.unit_id, 
            is_public=True, 
        )
        
        return DocumentRepository.create(db, document)
    

    @staticmethod
    def delete_unit_document(db: Session, document_id: int, manager: User) -> bool:
        """
        Xóa mềm (Soft delete) tài liệu thuộc phòng ban do Unit Manager quản lý.
        """
        document = DocumentRepository.get_by_id(db, document_id)

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài liệu hoặc tài liệu đã bị xóa trước đó."
            )

        if not document.unit_id or document.unit_id != manager.unit_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa tài liệu này vì nó không thuộc đơn vị của bạn."
            )

        DocumentRepository.delete(db, document)
        return True
    
    @staticmethod
    def update_public_status(db: Session, document_id: int, is_public: bool, current_user: User) -> Document:
        """
        Thay đổi trạng thái công khai/riêng tư của tài liệu.
        Chỉ cho phép chủ sở hữu tài liệu thực hiện hành động này.
        """
        document = DocumentRepository.get_by_id(db, document_id)

        if not document:
            raise DocumentNotFoundException("Không tìm thấy tài liệu yêu cầu hoặc tài liệu đã bị xóa")

        if document.owner_id != current_user.user_id:
            raise AccessDeniedException("Bạn không có quyền thay đổi trạng thái công khai của tài liệu này")

        return DocumentRepository.update_public_status(db, document, is_public)