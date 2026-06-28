# repositories/task_repository.py
# Tầng truy cập dữ liệu cho bảng tasks

from sqlalchemy.orm import Session
from models.task_model import Task
from uuid import UUID

class TaskRepository:
    """Repository xử lý truy vấn dữ liệu liên quan đến bảng tasks"""

    @staticmethod
    def get_by_id(db: Session, task_id: UUID | str) -> Task | None:
        """Tìm bản ghi task theo ID"""
        return db.query(Task).filter(Task.task_id == task_id).first()

    @staticmethod
    def get_by_user_and_document(
        db: Session, user_id: UUID | str, document_id: UUID | str
    ) -> Task | None:
        """Tìm bản ghi task theo user_id và document_id."""
        return db.query(Task).filter(
            Task.user_id == user_id,
            Task.document_id == document_id,
        ).first()

    @staticmethod
    def get_all_by_user(db: Session, user_id: UUID | str) -> list[Task]:
        """Lấy tất cả task của một người dùng"""
        return db.query(Task).filter(Task.user_id == user_id).all()

    @staticmethod
    def create(db: Session, task: Task) -> Task:
        """Thêm bản ghi task mới vào cơ sở dữ liệu"""
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def update(db: Session, task: Task) -> Task:
        """Cập nhật bản ghi task trong cơ sở dữ liệu"""
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def delete(db: Session, task: Task) -> None:
        """Xóa hoàn toàn bản ghi task"""
        db.delete(task)
        db.commit()
