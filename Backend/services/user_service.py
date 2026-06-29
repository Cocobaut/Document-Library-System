# services/user_service.py
# Xử lý hạn mức Quota, băm mật khẩu phù hợp Postgres Schema

from sqlalchemy.orm import Session

from models.user_model import User
from schemas.user_schema import UserCreate, UserLookupResponse, UserUpdate
from core.security import get_password_hash, verify_password
from core.exceptions import QuotaExceededException, DocumentNotFoundException
from schemas.auth_schema import ChangePasswordPayload
from repositories.user_repository import UserRepository
from fastapi import HTTPException, status
from schemas.user_schema import UserLookupResponse

class UserService:
    """Service xử lý logic nghiệp vụ liên quan đến người dùng"""

    @staticmethod
    def create_user(db: Session, data: UserCreate) -> User:
        """Tạo người dùng mới với mật khẩu đã được băm (Có kiểm tra trùng username)"""
        
        existing_user = UserRepository.get_by_username(db, data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tên tài khoản '{data.username}' đã tồn tại trên hệ thống."
            )
            
        hashed_password = get_password_hash(data.password)
        
        user = User(
            username=data.username,
            password_hash=hashed_password,
            full_name=data.full_name,
            role=data.role,
            unit_id=data.unit_id,
            storage_quota=data.quota_bytes,
        )
        return UserRepository.create(db, user)
    
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> User | None:
        """Xác thực người dùng bằng username và password"""
        user = UserRepository.get_by_username(db, username)
        if not user:
            return None
            
        if not verify_password(password, user.password_hash):
            return None
        return user

    @staticmethod
    def check_user_quota(user: User, file_size: int) -> bool:
        """
        Kiểm tra hạn mức dung lượng cá nhân.
        Trả về True nếu còn đủ dung lượng, raise exception nếu vượt.
        """
        if user.storage_quota > 0 and (user.storage_used + file_size) > user.storage_quota:
            raise QuotaExceededException(
                detail=f"Dung lượng cá nhân đã đầy. "
                       f"Đã dùng: {user.storage_used} bytes, "
                       f"Hạn mức: {user.storage_quota} bytes, "
                       f"File upload: {file_size} bytes"
            )
        return True

    @staticmethod
    def update_used_bytes(db: Session, user_id, delta_bytes: int) -> User:
        """Cập nhật dung lượng đã sử dụng (cộng/trừ)"""
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise DocumentNotFoundException(detail="Người dùng không tồn tại")
        return UserRepository.update_used_bytes(db, user, delta_bytes)

    @staticmethod
    def update_quota(db: Session, user_id, new_quota: int) -> User:
        """Admin cập nhật hạn mức dung lượng cho người dùng"""
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise DocumentNotFoundException(detail="Người dùng không tồn tại")
        return UserRepository.update_quota(db, user, new_quota)

    @staticmethod
    def get_user_by_id(db: Session, user_id) -> User | None:
        """Lấy thông tin user theo ID"""
        return UserRepository.get_by_id(db, user_id)

    @staticmethod
    def get_users_by_unit(db: Session, unit_id) -> list[User]:
        """Lấy danh sách user thuộc đơn vị"""
        return UserRepository.get_by_unit(db, unit_id)

    @staticmethod
    def change_password(db: Session, user: User, data: ChangePasswordPayload) -> bool:
        """
        Xử lý logic đổi mật khẩu cho người dùng hiện tại.
        Trả về True nếu thành công, raise HTTPException nếu mật khẩu cũ sai.
        """
        if not verify_password(data.old_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu hiện tại không chính xác"
            )
            
        if data.old_password == data.new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu mới không được trùng với mật khẩu cũ"
            )

        hashed_password = get_password_hash(data.new_password)
        UserRepository.update_password(db, user, hashed_password)
        return True
    
    @staticmethod
    def get_all_users(db: Session) -> list[User]:
        """Logic nghiệp vụ lấy tất cả người dùng dành cho Admin"""
        return UserRepository.get_all(db)
    
    @staticmethod
    def get_user_id_by_username(db: Session, username: str) -> UserLookupResponse:
        """Tra cứu user_id dựa trên username, ném lỗi 404 nếu không thấy"""
        user = UserRepository.get_by_username(db, username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy người dùng có tài khoản '{username}' trên hệ thống."
            )
        return UserLookupResponse(username=user.username, user_id=user.user_id)

    @staticmethod
    def update_user(db: Session, user_id, data: UserUpdate) -> User:
        """Cập nhật thông tin người dùng"""
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại")
            
        if data.username and data.username != user.username:
            existing_user = UserRepository.get_by_username(db, data.username)
            if existing_user:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên người dùng đã được sử dụng")
            user.username = data.username
            
        if data.full_name is not None:
            user.full_name = data.full_name
            
        if data.unit_id is not None:
            user.unit_id = data.unit_id
            
        if data.role is not None:
            user.role = data.role
            
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id) -> None:
        """Xóa người dùng"""
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại")
        
        db.delete(user)
        db.commit()