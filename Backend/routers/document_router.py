# controllers/document.py
# Các API dùng chung cho User (Load Main Page, Tìm kiếm, Đánh dấu sao)

import os
from uuid import UUID
import uuid

from fastapi import APIRouter, Depends, Form, UploadFile, File, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from services.user_service import UserService
from core.database import get_db
from core.deps import get_current_user
from models.user_model import User
from schemas.document_schema import DocumentResponse, DocumentListResponse, DocumentSharePayload, DocumentShareResponse
from services.document_service import DocumentService

router = APIRouter(prefix="/api/documents", tags=["Tài liệu"])


@router.get("/", response_model=DocumentListResponse, summary="Trang chính - Danh sách tài liệu")
async def get_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Load trang chính: lấy danh sách tài liệu mà user có quyền truy cập.
    Gộp 3 nguồn: cá nhân, được chia sẻ, kế thừa đơn vị.
    """
    items, totals = DocumentService.get_categorized_documents(
        db=db, 
        user=current_user, 
        page=page, 
        page_size=page_size
    )

    total_records = totals["personal"] + totals["shared"] + totals["unit_inherited"]
    total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 1

    return {
        "items": items,         
        "totals": totals,       
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/units", summary="Lấy danh sách tất cả phòng ban (đơn vị)")
async def get_all_units(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.unit_model import Unit
    units = db.query(Unit).all()
    return [{"unit_id": str(u.unit_id), "name": u.name} for u in units]




@router.get("/{document_id}", response_model=DocumentResponse, summary="Chi tiết tài liệu")
async def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy thông tin chi tiết tài liệu (kiểm tra quyền truy cập)"""
    document = DocumentService.check_document_access(db, current_user, document_id)
    return document


@router.post("/{document_id}/share", response_model=DocumentShareResponse, status_code=status.HTTP_201_CREATED, summary="Chia sẻ tài liệu")
async def share_document(
    document_id: UUID,
    payload: DocumentSharePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    API thực hiện chia sẻ tài liệu cho một nhân sự bất kỳ trong cơ quan.
    """
    share_result = DocumentService.share_document_to_user(
        db=db,
        document_id=document_id,
        payload=payload,
        current_user=current_user
    )
    
    return {
        "message": "Chia sẻ tài liệu thành công.",
        "share_id": share_result.shared_id,              
        "document_id": share_result.document_id,
        "shared_by": share_result.shared_by,            
        "shared_with_user_id": share_result.shared_with_user_id,
        "shared_at": share_result.shared_at        
    }


@router.post("/upload", summary="User upload tài liệu công khai nội bộ phòng ban", response_model=DocumentResponse)
async def user_upload_document(
    file: UploadFile = File(...),
    title: str = Form(None, description="Tiêu đề tùy chọn của tài liệu"),
    folder_id: Optional[UUID] = Form(None, description="ID của folder nếu file thuộc folder nào đó"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.unit_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản của bạn chưa được chỉ định thuộc về bất kỳ đơn vị/phòng ban nào.",
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
        "file_path": f"storage/users/{current_user.user_id}/{file.filename}",
        "file_size": file_size,
        "file_type": file_ext,
        "mime_type": file.content_type
    }

    try:
        new_document = DocumentService.create_user_shared_document(
            db=db,
            title=title if title else file.filename,
            folder_id=folder_id,
            file_info=file_info,
            user=current_user
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
    current_user: User = Depends(get_current_user),
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
    
# @router.get("/search", response_model=DocumentListResponse, summary="Tìm kiếm tài liệu")
# async def search_documents(
#     keyword: str = Query(..., min_length=1, description="Từ khóa tìm kiếm"),
#     file_type: str = Query(None, description="Lọc theo loại file"),
#     page: int = Query(default=1, ge=1),
#     page_size: int = Query(default=20, ge=1, le=100),
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     """
#     Tìm kiếm tài liệu theo từ khóa (full-text search).
#     Kết quả được lọc theo quyền truy cập của user.
#     """
#     # TODO: Tích hợp SearchService cho full-text search
#     raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Chưa implement")


# @router.get("/{document_id}/preview", summary="Xem trước tài liệu")
# async def preview_document(
#     document_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     """Lấy URL xem trước tài liệu (Presigned URL hoặc PDF converted)"""
#     document = DocumentService.check_document_access(db, current_user, document_id)
#     # TODO: Tích hợp PreviewService
#     raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Chưa implement")


