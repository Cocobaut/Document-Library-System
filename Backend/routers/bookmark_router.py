from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.user_model import User
from models.bookmark_model import Bookmark
from schemas.document_schema import DocumentResponse, DocumentListResponse
from services.document_service import DocumentService
from repositories.bookmark_repository import BookmarkRepository

router = APIRouter(prefix="/api/bookmark", tags=["Tài liệu"])


@router.get("/", response_model=list[UUID], summary="Lấy danh sách tài liệu đã đánh dấu sao")
async def get_bookmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookmarks = BookmarkRepository.get_all_by_user(db, current_user.user_id)
    return [b.document_id for b in bookmarks]


@router.post("/{document_id}", status_code=status.HTTP_201_CREATED, summary="Đánh dấu sao")
async def add_bookmark(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đánh dấu sao cho tài liệu"""
    DocumentService.check_document_access(db, current_user, document_id)

    existing = BookmarkRepository.get_by_user_and_document(
        db, current_user.user_id, document_id
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tài liệu đã được đánh dấu sao",
        )

    bookmark = Bookmark(user_id=current_user.user_id, document_id=document_id)
    BookmarkRepository.create(db, bookmark)
    return {"message": "Đánh dấu sao thành công"}


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Bỏ đánh dấu sao")
async def remove_bookmark(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bỏ đánh dấu sao cho tài liệu"""
    bookmark = BookmarkRepository.get_by_user_and_document(
        db, current_user.user_id, document_id
    )

    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài liệu chưa được đánh dấu sao",
        )

    BookmarkRepository.delete(db, bookmark)