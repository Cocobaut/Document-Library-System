# utils/file_handlers.py
# Xử lý đọc file dung lượng (file.size), kiểm tra định dạng (.pdf, .docx)

import os
from typing import Optional

from fastapi import UploadFile

from core.exceptions import InvalidFileFormatException

# Danh sách định dạng file được phép upload
ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "txt", "csv", "rtf",
    "png", "jpg", "jpeg", "gif", "bmp", "webp", "svg",
    "zip", "rar", "7z",
}

# MIME types tương ứng
MIME_TYPE_MAP = {
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "txt": "text/plain",
    "csv": "text/csv",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "bmp": "image/bmp",
    "webp": "image/webp",
    "svg": "image/svg+xml",
    "zip": "application/zip",
    "rar": "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
}

# Giới hạn dung lượng file (100MB)
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


def get_file_extension(filename: str) -> Optional[str]:
    """Lấy phần mở rộng của file (không có dấu chấm)"""
    if "." not in filename:
        return None
    return filename.rsplit(".", 1)[1].lower()


def validate_file_format(filename: str) -> str:
    """
    Kiểm tra định dạng file có được phép hay không.
    Trả về extension nếu hợp lệ, raise exception nếu không.
    """
    ext = get_file_extension(filename)
    if not ext or ext not in ALLOWED_EXTENSIONS:
        raise InvalidFileFormatException(
            detail=f"Định dạng file '.{ext}' không được hỗ trợ. "
                   f"Các định dạng cho phép: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    return ext


def get_mime_type(file_extension: str) -> str:
    """Lấy MIME type từ extension"""
    return MIME_TYPE_MAP.get(file_extension, "application/octet-stream")


async def get_file_size(file: UploadFile) -> int:
    """
    Đọc dung lượng thực tế của file upload.
    Di chuyển con trỏ về đầu file sau khi đọc.
    """
    file.file.seek(0, 2)  # Di chuyển tới cuối file
    size = file.file.tell()  # Lấy vị trí = kích thước
    file.file.seek(0)  # Reset về đầu
    return size


async def validate_file_upload(file: UploadFile) -> dict:
    """
    Kiểm tra toàn diện file upload: định dạng và dung lượng.
    Trả về dict chứa thông tin file nếu hợp lệ.
    """
    # Kiểm tra định dạng
    file_ext = validate_file_format(file.filename)

    # Kiểm tra dung lượng
    file_size = await get_file_size(file)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise InvalidFileFormatException(
            detail=f"File vượt quá giới hạn {MAX_FILE_SIZE_BYTES // (1024*1024)}MB. "
                   f"Dung lượng file: {file_size / (1024*1024):.2f}MB"
        )

    return {
        "file_name": file.filename,
        "file_type": file_ext,
        "file_size": file_size,
        "mime_type": get_mime_type(file_ext),
    }
