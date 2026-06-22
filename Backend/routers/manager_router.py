# controllers/manager.py
# Các API của Unit Manager (Upload vùng chung, Thống kê dung lượng phòng ban)

import uuid

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Path
from sqlalchemy.orm import Session
import os

from services.document_service import DocumentService
from core.database import get_db
from core.deps import get_current_unit_manager
from models.user_model import User
from schemas.manager_schema import UnitStorageStats, UnitDetailedReport, UserStorageStats
from services.user_service import UserService
from services.manager_service import ManagerService
from schemas.document_schema import DocumentResponse, DocumentUpdatePublicPayload
from schemas.user_schema import UserResponse
from repositories.user_repository import UserRepository
from typing import List

from uuid import UUID

router = APIRouter(prefix="/api/manager", tags=["Unit Manager"], dependencies=[Depends(get_current_unit_manager)])


@router.get("/storage/stats", response_model=UnitStorageStats, summary="Thống kê dung lượng đơn vị")
async def get_unit_storage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_unit_manager),
):
    """
    Lấy thống kê dung lượng đơn vị mà Unit Manager đang quản lý.
    
    Quy trình xử lý:
    - Xác thực người dùng thông qua bộ gác cổng `get_current_unit_manager`.
    - Kiểm tra xem người dùng đã được cấu hình phòng ban (`unit_id`) chưa.
    - Gọi tầng Service tính toán các chỉ số: hạn mức, lượng đã dùng, còn trống, tổng số file và nhân sự.
    """
    if not current_user.unit_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản quản trị của bạn chưa được gán cố định vào bất kỳ đơn vị nào.",
        )

    stats = ManagerService.get_unit_storage_stats(db=db, manager=current_user)
    
    return stats


@router.get("/users", response_model=List[UserResponse], summary="Lấy danh sách người dùng trong đơn vị")
async def get_manager_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_unit_manager),
):
    """
    Lấy danh sách tất cả các người dùng (User) thuộc cùng đơn vị với Unit Manager.
    """
    if not current_user.unit_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản quản lý của bạn chưa được chỉ định thuộc về bất kỳ đơn vị nào.",
        )
    users = UserRepository.get_by_unit(db, current_user.unit_id)
    return users


@router.post("/documents/upload", summary="Upload tài liệu vùng chung đơn vị", response_model=DocumentResponse)
async def upload_unit_document(
    file: UploadFile = File(...),
    title: str = Form(None, description="Tiêu đề tùy chọn của tài liệu"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_unit_manager),
):
    if not current_user.unit_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản quản lý của bạn chưa được chỉ định thuộc về bất kỳ đơn vị nào.",
        )

    if hasattr(file, "size") and file.size is not None:
        file_size = file.size
    else:
        try:
            file_size = os.fstat(file.file.fileno()).st_size
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Không thể đọc thông tin kích thước định dạng file hệ thống."
            )

    if hasattr(UserService, "check_user_quota"):
        try:
            UserService.check_user_quota(user=current_user, file_size=file_size)
        except Exception as quota_exc:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=str(quota_exc)
            )

    file_ext = os.path.splitext(file.filename)[1].replace(".", "").lower()
    
    file_info = {
        "file_name": file.filename,
        "file_path": f"storage/units/{current_user.unit_id}/{file.filename}",
        "file_size": file_size,
        "file_type": file_ext,
        "mime_type": file.content_type
    }

    try:
        new_document = ManagerService.create_unit_document(
            db=db,
            title=title,
            file_info=file_info,
            manager=current_user
        )
        
        if hasattr(UserService, "update_used_bytes"):
            UserService.update_used_bytes(db, current_user.user_id, file_size)

        return new_document

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Đã xảy ra lỗi trong quá trình lưu trữ dữ liệu tài liệu: {str(e)}"
        )


@router.post("/upload-folder", summary="User upload nguyên folder (nhiều tài liệu công khai)", response_model=List[DocumentResponse])
async def user_upload_folder(
    files: List[UploadFile] = File(..., description="Danh sách các file trong folder"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_unit_manager),
):
    if not current_user.unit_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản của bạn chưa được chỉ định thuộc về bất kỳ đơn vị/phòng ban nào.",
        )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh sách file trống. Vui lòng chọn folder có chứa tài liệu.",
        )

    total_folder_size = 0
    file_size_mappings = {}

    for file in files:
        if hasattr(file, "size") and file.size is not None:
            file_size = file.size
        else:
            try:
                file_size = os.fstat(file.file.fileno()).st_size
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Không thể đọc thông tin kích thước của file: {file.filename}"
                )
        total_folder_size += file_size
        file_size_mappings[file.filename] = file_size

    if hasattr(UserService, "check_user_quota"):
        try:
            UserService.check_user_quota(user=current_user, file_size=total_folder_size)
        except Exception as quota_exc:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Tổng dung lượng folder vượt quá hạn mức cho phép. Chi tiết: {str(quota_exc)}"
            )

    generated_folder_id = uuid.uuid4()
    
    files_info = []
    for file in files:
        file_ext = os.path.splitext(file.filename)[1].replace(".", "").lower()
        files_info.append({
            "file_name": file.filename,
            "file_path": f"storage/users/{current_user.user_id}/{generated_folder_id}/{file.filename}",
            "file_size": file_size_mappings[file.filename],
            "file_type": file_ext,
            "mime_type": file.content_type
        })

    try:
        new_documents = DocumentService.create_user_shared_folder(
            db=db,
            folder_id=generated_folder_id,
            files_info=files_info,
            user=current_user
        )
        
        if hasattr(UserService, "update_used_bytes"):
            UserService.update_used_bytes(db, current_user.user_id, total_folder_size)

        return new_documents

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Đã xảy ra lỗi trong quá trình lưu trữ dữ liệu folder tài liệu: {str(e)}"
        )
    

@router.delete(
    "/documents/{document_id}", 
    summary="Xóa tài liệu thuộc vùng chung của đơn vị",
    status_code=status.HTTP_200_OK
)
async def delete_unit_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_unit_manager),
):
    """
    API dành riêng cho Unit Manager để xóa mềm (soft delete) một tài liệu 
    nằm trong phòng ban/đơn vị mà mình quản lý.
    """
    if not current_user.unit_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản của bạn chưa được gán vào đơn vị nào để quản lý.",
        )

    success = ManagerService.delete_unit_document(
        db=db, 
        document_id=document_id, 
        manager=current_user
    )
    
    if success:
        return {"message": f"Tài liệu ID {document_id} đã được xóa thành công khỏi đơn vị."} 
    
    
@router.patch(
    "/{document_id}/public", 
    response_model=DocumentResponse, 
    summary="Thay đổi trạng thái công khai tài liệu"
)
async def change_document_public_status(
    document_id: UUID,
    payload: DocumentUpdatePublicPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_unit_manager),
):
    """
    API thay đổi trạng thái hiển thị của tài liệu (Chuyển giữa công khai đơn vị và riêng tư).
    - **is_public = True**: Tài liệu hiển thị công khai cho toàn bộ đơn vị và đơn vị con.
    - **is_public = False**: Tài liệu ẩn đi, chỉ có Chủ sở hữu và những người được Share đích danh mới xem được.
    - *Yêu cầu quyền*: Phải là chủ sở hữu của tài liệu.
    """
    updated_document = ManagerService.update_public_status(
        db=db,
        document_id=document_id,
        is_public=payload.is_public,
        current_user=current_user
    )
    return updated_document