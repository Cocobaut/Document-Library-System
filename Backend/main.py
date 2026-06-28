# main.py
# Điểm khởi chạy ứng dụng FastAPI, cấu hình CORS, kết nối router

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import admin_router, auth_router, document_router, bookmark_router, task_router
from core.config import get_settings
from core.exceptions import (
    QuotaExceededException,
    AccessDeniedException,
    DocumentNotFoundException,
    InvalidFileFormatException,
    quota_exceeded_handler,
    access_denied_handler,
    document_not_found_handler,
    invalid_file_format_handler,
)
from routers import manager_router

settings = get_settings()

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Hệ thống quản lý tài liệu nội bộ Viettel",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký Global Exception Handlers
app.add_exception_handler(QuotaExceededException, quota_exceeded_handler)
app.add_exception_handler(AccessDeniedException, access_denied_handler)
app.add_exception_handler(DocumentNotFoundException, document_not_found_handler)
app.add_exception_handler(InvalidFileFormatException, invalid_file_format_handler)

# Đăng ký Routers
app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(manager_router.router)
app.include_router(document_router.router)
app.include_router(bookmark_router.router)
app.include_router(task_router.router)


@app.get("/", tags=["Health Check"])
async def root():
    """Health check endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health", tags=["Health Check"])
async def health_check():
    """Health check chi tiết"""
    return {
        "status": "healthy",
        "database": "connected",
    }
