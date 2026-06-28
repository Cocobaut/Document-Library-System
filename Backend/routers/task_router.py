# routers/task_router.py
# Router xử lý API Tasks

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from core.database import get_db
from core.deps import get_current_user
from models.user_model import User
from schemas.task_schema import TaskCreate, TaskUpdate, TaskResponse
from services.task_service import TaskService

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Tạo một task mới cho tài liệu.
    """
    return TaskService.create_task(db, current_user, payload)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cập nhật một task đã có.
    """
    return TaskService.update_task(db, current_user, task_id, payload)


@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy danh sách các task do user hiện tại tạo.
    """
    return TaskService.get_user_tasks(db, current_user)
