# controllers/admin.py
# Các API tối cao của Admin (Cây đơn vị, Quota người dùng)

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_active_admin
from schemas.unit_schema import CompanyDocumentStatsResponse, UnitCreate, UnitLookupResponse, UnitResponse, UnitStatResponse, UnitUpdate, TotalQuotaSystemResponse, UnitQuotaResponse, UnitDetailResponse, AnalyticsOverviewResponse
from schemas.user_schema import UserCreate, UserLookupResponse, UserResponse, UserUpdate
from services.unit_service import UnitService
from services.user_service import UserService

from uuid import UUID

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(get_current_active_admin)])


# --- Quản lý Cây đơn vị ---

@router.get("/analytics/overview", response_model=AnalyticsOverviewResponse, summary="Lấy thống kê tổng quan toàn hệ thống")
async def get_analytics_overview(db: Session = Depends(get_db)):
    """Admin lấy các chỉ số KPI tổng quát: đơn vị, người dùng, tài liệu, quota"""
    return UnitService.get_analytics_overview(db)

@router.post("/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED, summary="Tạo đơn vị mới")
async def create_unit(data: UnitCreate, db: Session = Depends(get_db)):
    """Admin tạo đơn vị mới trong cây tổ chức"""
    unit = UnitService.create_unit(db, data)
    return unit


@router.get("/units/tree", summary="Lấy cây đơn vị")
async def get_unit_tree(root_id: int = None, db: Session = Depends(get_db)):
    """Lấy toàn bộ cây đơn vị hoặc cây con từ root_id"""
    return UnitService.get_unit_tree(db, root_id)


@router.put("/units/{unit_id}/move", response_model=UnitResponse, summary="Di chuyển đơn vị")
async def move_unit(unit_id: UUID, new_parent_id: UUID, db: Session = Depends(get_db)):
    """Dịch chuyển đơn vị sang nhánh cha mới"""
    return UnitService.move_unit(db, unit_id, new_parent_id)


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Xóa đơn vị")
async def delete_unit(unit_id: UUID, db: Session = Depends(get_db)):
    """Xóa đơn vị và tất cả đơn vị con"""
    UnitService.delete_unit(db, unit_id)


# --- Quản lý Người dùng ---

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Tạo người dùng mới")
async def create_user(data: UserCreate, db: Session = Depends(get_db)):
    """Admin tạo tài khoản người dùng"""
    return UserService.create_user(db, data)


@router.put("/users/{user_id}", response_model=UserResponse, summary="Cập nhật người dùng")
async def update_user(user_id: UUID, data: UserUpdate, db: Session = Depends(get_db)):
    """Admin cập nhật thông tin người dùng"""
    return UserService.update_user(db, user_id, data)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Xóa người dùng")
async def delete_user(user_id: UUID, db: Session = Depends(get_db)):
    """Admin xóa người dùng"""
    UserService.delete_user(db, user_id)


@router.put("/users/{user_id}/quota", response_model=UserResponse, summary="Cập nhật hạn mức dung lượng")
async def update_user_quota(user_id: UUID, quota_bytes: int, db: Session = Depends(get_db)):
    """Admin cập nhật hạn mức dung lượng cá nhân cho người dùng"""
    return UserService.update_quota(db, user_id, quota_bytes)


@router.get(
    "/users", 
    response_model=List[UserResponse], 
    summary="Lấy danh sách tất cả người dùng",
    status_code=status.HTTP_200_OK
)
async def get_all_users(db: Session = Depends(get_db)):
    """
    [Đặc quyền Admin] Lấy toàn bộ danh sách tài khoản người dùng trên hệ thống.
    Dữ liệu trả về tự động ẩn mật khẩu băm thông qua UserResponse Schema.
    """
    users = UserService.get_all_users(db)
    return users


@router.get(
    "/units/stats", 
    response_model=List[UnitStatResponse], 
    summary="Lấy danh sách đơn vị kèm thống kê số liệu",
    status_code=status.HTTP_200_OK
)
async def get_all_units_with_stats(db: Session = Depends(get_db)):
    """
    [Đặc quyền Admin] Lấy toàn bộ danh sách phòng ban, hệ thống tự động tính toán gộp:
    - Số lượng thành viên (user_count) hiện tại.
    - Số lượng tài liệu (document_count) đã lưu trữ thuộc đơn vị đó.
    """
    units_stats = UnitService.get_all_units_with_stats(db)
    return units_stats


@router.put(
    "/units/{unit_id}", 
    response_model=UnitResponse, 
    summary="Cập nhật thông tin đơn vị phòng ban",
    status_code=status.HTTP_200_OK
)
async def update_unit_information(
    unit_id: UUID, 
    data: UnitUpdate, 
    db: Session = Depends(get_db)
):
    """
    [Đặc quyền Admin] Chỉnh sửa linh hoạt thông tin phòng ban:
    - Có thể cập nhật riêng lẻ hoặc đồng thời: Tên (`name`), Dung lượng lưu trữ (`quota_bytes`), hoặc Quản lý (`manager_user_id`).
    - Hệ thống tự động kiểm tra chặn lỗi nếu Quản lý mới được gán hiện đang dẫn dắt một phòng ban khác.
    """
    updated_unit = UnitService.update_unit_info(db, unit_id, data)
    return updated_unit


@router.get(
    "/quota/system", 
    response_model=TotalQuotaSystemResponse, 
    summary="Lấy tổng hạn mức quota toàn hệ thống",
    status_code=status.HTTP_200_OK
)
async def get_all_quota_system(db: Session = Depends(get_db)):
    """
    [Đặc quyền Admin] Trả về tổng dung lượng lưu trữ (Bytes) của toàn bộ hệ thống 
    bằng cách cộng dồn quota của tất cả các đơn vị lại với nhau.
    """
    return UnitService.get_system_all_quota(db)


@router.get(
    "/quota/units", 
    response_model=List[UnitQuotaResponse], 
    summary="Lấy danh sách quota theo từng đơn vị phòng ban",
    status_code=status.HTTP_200_OK
)
async def get_quota_by_individual_units(db: Session = Depends(get_db)):
    """
    [Đặc quyền Admin] Trả về danh sách chi tiết tất cả các phòng ban 
    kèm theo mã ID, tên phòng ban và hạn mức quota lưu trữ tương ứng của từng nơi.
    """
    return UnitService.get_quota_by_units(db)


@router.get(
    "/documents/statistics", 
    response_model=CompanyDocumentStatsResponse, 
    summary="[Admin] Lấy thống kê số lượng tài liệu toàn công ty và từng đơn vị"
)
async def get_company_document_stats(db: Session = Depends(get_db)):
    """
    API dành riêng cho Admin tối cao để theo dõi tổng số lượng tài liệu
    đang được lưu trữ trên toàn hệ thống và bóc tách cụ thể theo từng phòng ban.
    """
    return UnitService.get_company_document_statistics(db)


@router.get(
    "/users/lookup-id",
    response_model=UserLookupResponse,
    summary="[Admin] Tra cứu nhanh user_id qua username"
)
async def lookup_user_id(username: str, db: Session = Depends(get_db)):
    """
    [Đặc quyền Admin] Truyền vào tham số query `username` để lấy ra mã `user_id` (UUID).
    Rất hữu ích khi Admin cần lấy ID cấu hình phân quyền hoặc update dữ liệu.
    """
    return UserService.get_user_id_by_username(db, username)


@router.get(
    "/units/lookup-id",
    response_model=UnitLookupResponse,
    summary="[Admin] Tra cứu nhanh unit_id qua tên phòng ban"
)
async def lookup_unit_id(name: str, db: Session = Depends(get_db)):
    """
    [Đặc quyền Admin] Truyền vào tham số query `name` (Tên phòng ban chính xác) để lấy ra mã `unit_id` (UUID).
    Giúp Admin rút ngắn quy trình tìm kiếm ID khi quản lý cây đơn vị tổ chức.
    """
    return UnitService.get_unit_id_by_name(db, name)


@router.get(
    "/units/{unit_id}",
    response_model=UnitDetailResponse,
    summary="Lấy chi tiết đơn vị và danh sách thành viên",
    status_code=status.HTTP_200_OK
)
async def get_unit_detail(unit_id: UUID, db: Session = Depends(get_db)):
    """
    [Đặc quyền Admin] Lấy thông tin chi tiết một phòng ban bao gồm:
    - Các số liệu thống kê (thành viên, tài liệu, quota)
    - Danh sách thành viên trực thuộc phòng ban đó.
    """
    return UnitService.get_unit_detail(db, unit_id)