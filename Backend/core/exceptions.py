# core/exceptions.py
# Trình bắt lỗi tập trung (Global Exception Handler) cho Quota, Quyền truy cập

from fastapi import Request, status
from fastapi.responses import JSONResponse


class QuotaExceededException(Exception):
    """Lỗi khi người dùng vượt quá hạn mức dung lượng cho phép"""

    def __init__(self, detail: str = "Bạn đã vượt quá hạn mức dung lượng cho phép"):
        self.detail = detail


class AccessDeniedException(Exception):
    """Lỗi khi người dùng không có quyền truy cập tài nguyên"""

    def __init__(self, detail: str = "Bạn không có quyền truy cập tài nguyên này"):
        self.detail = detail


class DocumentNotFoundException(Exception):
    """Lỗi khi không tìm thấy tài liệu"""

    def __init__(self, detail: str = "Không tìm thấy tài liệu"):
        self.detail = detail


class InvalidFileFormatException(Exception):
    """Lỗi khi định dạng file không được hỗ trợ"""

    def __init__(self, detail: str = "Định dạng file không được hỗ trợ"):
        self.detail = detail


# --- Global Exception Handlers ---

async def quota_exceeded_handler(request: Request, exc: QuotaExceededException):
    """Handler xử lý lỗi vượt hạn mức"""
    return JSONResponse(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        content={"detail": exc.detail},
    )


async def access_denied_handler(request: Request, exc: AccessDeniedException):
    """Handler xử lý lỗi quyền truy cập"""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": exc.detail},
    )


async def document_not_found_handler(request: Request, exc: DocumentNotFoundException):
    """Handler xử lý lỗi không tìm thấy tài liệu"""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.detail},
    )


async def invalid_file_format_handler(request: Request, exc: InvalidFileFormatException):
    """Handler xử lý lỗi định dạng file"""
    return JSONResponse(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        content={"detail": exc.detail},
    )
