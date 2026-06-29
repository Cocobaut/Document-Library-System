# services/task_service.py
# Chứa logic nghiệp vụ liên quan đến Tasks

from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException, status

from models.user_model import User
from models.task_model import Task
from schemas.task_schema import TaskCreate, TaskUpdate
from repositories.task_repository import TaskRepository
from repositories.document_repository import DocumentRepository

class TaskService:
    @staticmethod
    def get_user_tasks(db: Session, user: User) -> list[Task]:
        """Lấy tất cả task của current_user"""
        return TaskRepository.get_all_by_user(db, user.user_id)

    @staticmethod
    def create_task(db: Session, user: User, payload: TaskCreate) -> Task:
        """Tạo task mới cho tài liệu. Một user chỉ được có 1 task trên 1 document."""
        # Kiểm tra document tồn tại
        document = DocumentRepository.get_by_id(db, payload.document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tài liệu không tồn tại."
            )

        # Kiểm tra xem user đã gắn task cho document này chưa
        existing_task = TaskRepository.get_by_user_and_document(db, user.user_id, payload.document_id)
        if existing_task:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tài liệu này đã được gắn nhãn bởi bạn. Vui lòng cập nhật thay vì tạo mới."
            )

        new_task = Task(
            user_id=user.user_id,
            document_id=payload.document_id,
            task_name=payload.task_name,
            color=payload.color
        )
        return TaskRepository.create(db, new_task)

    @staticmethod
    def update_task(db: Session, user: User, task_id: UUID, payload: TaskUpdate) -> Task:
        """Cập nhật task. Chỉ chủ sở hữu mới được cập nhật."""
        task = TaskRepository.get_by_id(db, task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nhãn (task) không tồn tại."
            )
        
        if task.user_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền sửa nhãn của người khác."
            )

        if payload.task_name is not None:
            task.task_name = payload.task_name
        if payload.color is not None:
            task.color = payload.color

        return TaskRepository.update(db, task)

    @staticmethod
    def delete_task(db: Session, user: User, task_id: UUID) -> None:
        """Xóa task. Chỉ chủ sở hữu mới được xóa."""
        task = TaskRepository.get_by_id(db, task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nhãn (task) không tồn tại."
            )
        
        if task.user_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa nhãn của người khác."
            )

        TaskRepository.delete(db, task)
