# services/document_service.py
# Xử lý quét gộp 3 nguồn quyền (Cá nhân, Share, Kế thừa đơn vị) phù hợp Postgres Schema

from typing import Optional

from sqlalchemy.orm import Session

from models.document_model import Document
from models.document_share_model import DocumentShare
from models.user_model import User
from schemas.document_schema import DocumentCreate, DocumentSharePayload
from core.exceptions import AccessDeniedException, DocumentNotFoundException
from repositories.document_repository import DocumentRepository
from repositories.document_share_repository import DocumentShareRepository
from repositories.unit_repository import UnitRepository
from repositories.user_repository import UserRepository
from fastapi import HTTPException, status
from uuid import UUID

class DocumentService:
    """Service xử lý logic nghiệp vụ liên quan đến tài liệu"""

    @staticmethod
    def get_categorized_documents(
        db: Session,
        user: User,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[dict, dict]:
        """
        Lấy danh sách tài liệu phân tách rõ ràng làm 3 nguồn:
        1. Cá nhân (personal): Do chính user upload lên
        2. Được chia sẻ (shared): Được chia sẻ đích danh qua bảng document_share
        3. Kế thừa đơn vị (unit_inherited): Tài liệu công khai (is_public=True) từ đơn vị cha/bản thân
        """
        offset = (page - 1) * page_size
        
        # Nguồn 1: Tài liệu cá nhân 
        personal_docs, personal_total = DocumentRepository.get_personal_documents(
            db, user.user_id, offset, page_size
        )

        # Nguồn 2: Tài liệu được chia sẻ đích danh
        shared_docs, shared_total = DocumentRepository.get_shared_documents(
            db, user.user_id, offset, page_size
        )

        # Nguồn 3: Tài liệu kế thừa từ cơ cấu đơn vị (Cấp trên đổ xuống)
        unit_docs = []
        unit_total = 0
        
        if user.unit_id:
            user_unit = UnitRepository.get_by_id(db, user.unit_id)
            if user_unit:
                all_units = UnitRepository.get_all(db)
                ancestor_unit_ids = [u.unit_id for u in all_units if user_unit.path.startswith(u.path)]
                
                if ancestor_unit_ids:
                    unit_inherited_docs, unit_inherited_total = DocumentRepository.get_unit_inherited_documents(
                        db, ancestor_unit_ids, user.user_id, offset, page_size
                    )
                    unit_docs = unit_inherited_docs
                    unit_total = unit_inherited_total

        items = {
            "personal": personal_docs,
            "shared": shared_docs,
            "unit_inherited": unit_docs
        }
        
        totals = {
            "personal": personal_total,
            "shared": shared_total,
            "unit_inherited": unit_total
        }

        return items, totals

    @staticmethod
    def check_document_access(db: Session, user: User, document_id) -> Document:
        """
        Kiểm tra nghiêm ngặt quyền truy cập chi tiết tài liệu theo cấp bậc vai trò (Role):
        1. Manager: Xem được toàn bộ tài liệu thuộc đơn vị/phòng ban của mình.
        2. Owner / Shared User: Xem được tài liệu cá nhân sở hữu hoặc được share đích danh.
        3. Regular User: Chỉ xem được tài liệu cùng đơn vị khi tài liệu được cấu hình PUBLIC.
        """
        document = DocumentRepository.get_by_id(db, document_id)

        if not document:
            raise DocumentNotFoundException()

        if getattr(user, "role", None) == "manager" and user.unit_id and document.unit_id:
            if user.unit_id == document.unit_id:
                return document

        if document.owner_id == user.user_id:
            return document

        share = DocumentShareRepository.get_by_document_and_user(db, document_id, user.user_id)
        if share:
            return document

        if document.is_public and document.unit_id and user.unit_id:
            user_unit = UnitRepository.get_by_id(db, user.unit_id)
            doc_unit = UnitRepository.get_by_id(db, document.unit_id)
            
            if user_unit and doc_unit and user_unit.path.startswith(doc_unit.path):
                return document

        raise AccessDeniedException()

    @staticmethod
    def create_document(db: Session, data: DocumentCreate, file_info: dict, owner: User) -> Document:
        """Tạo metadata tài liệu mới"""
        document = Document(
            title=data.title,
            file_path=file_info["file_path"],
            file_size=file_info["file_size"],
            file_type=file_info["file_type"],
            owner_id=owner.user_id,
            unit_id=data.unit_id,
            is_public=data.is_public,
            folder_id=data.folder_id,
        )
        return DocumentRepository.create(db, document)

    @staticmethod
    def share_document_to_user(
        db: Session,
        document_id,
        payload: DocumentSharePayload,
        current_user: User
    ) -> DocumentShare:
        """
        Chia sẻ tài liệu cho một cá nhân dựa theo username và phòng ban.
        Ràng buộc: Chỉ chủ sở hữu tài liệu mới có quyền chia sẻ.
        """
        document = DocumentRepository.get_by_id(db, document_id)
        
        if not document:
            raise DocumentNotFoundException()

        if document.owner_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chỉ được quyền chia sẻ tài liệu do chính bản thân tải lên hệ thống."
            )

        target_user = UserRepository.get_by_username_and_unit(
            db, payload.username, payload.unit_id
        )

        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người nhận phù hợp với username và phòng ban đã chọn."
            )

        if target_user.user_id == current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn không thể chia sẻ tài liệu cho chính bản thân."
            )

        existing_share = DocumentShareRepository.get_by_document_and_user(
            db, document_id, target_user.user_id
        )

        if existing_share:
            return existing_share

        new_share = DocumentShare(
            document_id=document_id,
            shared_with_user_id=target_user.user_id,
            shared_by=current_user.user_id
        )
        
        return DocumentShareRepository.create(db, new_share)
    
    @staticmethod
    def create_user_shared_document(
        db: Session, 
        title: str, 
        folder_id: Optional[UUID], 
        file_info: dict, 
        user: User
    ) -> Document:
        """
        Tạo tài liệu do User upload nhưng ở trạng thái Public nội bộ đơn vị,
        cho phép toàn bộ nhân sự cùng phòng ban hoặc phòng ban con kế thừa quyền xem.
        """
        document_data = Document(
            title=title,
            file_path=file_info["file_path"],
            file_size=file_info["file_size"],
            file_type=file_info["file_type"],
            owner_id=user.user_id,
            unit_id=user.unit_id,      
            is_public=True,          
            folder_id=folder_id,      
        )
        
        return DocumentRepository.create(db, document_data)
    
    @staticmethod
    def create_user_shared_folder(
        db: Session, 
        folder_id: UUID, 
        files_info: list[dict], 
        user: User
    ) -> list[Document]:
        """
        Lưu hàng loạt tài liệu thuộc cùng một folder do User tải lên.
        Tất cả tài liệu sẽ chia sẻ chung một folder_id và ở trạng thái Public nội bộ phòng ban.
        """
        inserted_documents = []
        
        for file_info in files_info:
            document_data = Document(
                title=file_info["file_name"],
                file_path=file_info["file_path"],
                file_size=file_info["file_size"],
                file_type=file_info["file_type"],
                owner_id=user.user_id,
                unit_id=user.unit_id,
                is_public=True,                
                folder_id=folder_id,       
            )
            
            new_doc = DocumentRepository.create(db, document_data)
            inserted_documents.append(new_doc)
            
        return inserted_documents