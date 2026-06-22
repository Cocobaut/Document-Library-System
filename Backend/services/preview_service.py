# services/preview_service.py
# Logic sinh Presigned URL (Ảnh/PDF) hoặc convert Office (.docx, .xlsx)

from typing import Optional

from utils.s3_client import S3Client
from core.config import get_settings

settings = get_settings()


class PreviewService:
    """
    Service xử lý xem trước tài liệu.
    - Ảnh/PDF: sinh Presigned URL cho client truy cập trực tiếp.
    - Office files (.docx, .xlsx): convert sang PDF để preview.
    """

    def __init__(self):
        self.s3_client = S3Client()

    async def get_preview_url(self, file_path: str, file_type: str) -> dict:
        """
        Sinh URL xem trước tài liệu.
        Trả về dict chứa preview_url và loại preview (direct / converted).
        """
        # File ảnh và PDF: trả về Presigned URL trực tiếp
        direct_preview_types = {"pdf", "png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"}

        if file_type and file_type.lower() in direct_preview_types:
            presigned_url = self.s3_client.generate_presigned_url(
                file_path=file_path,
                expires_in=3600,  # 1 giờ
            )
            return {
                "preview_url": presigned_url,
                "preview_type": "direct",
                "file_type": file_type,
            }

        # File Office: cần convert sang PDF
        office_types = {"docx", "doc", "xlsx", "xls", "pptx", "ppt"}
        if file_type and file_type.lower() in office_types:
            converted_url = await self._convert_and_get_url(file_path, file_type)
            return {
                "preview_url": converted_url,
                "preview_type": "converted",
                "file_type": "pdf",
            }

        # Loại file không hỗ trợ preview
        return {
            "preview_url": None,
            "preview_type": "unsupported",
            "file_type": file_type,
        }

    async def _convert_and_get_url(self, file_path: str, file_type: str) -> Optional[str]:
        """
        Convert file Office sang PDF và trả về Presigned URL.
        Sử dụng LibreOffice hoặc dịch vụ convert bên ngoài.
        """
        # TODO: Implement Office to PDF conversion
        # 1. Tải file từ S3
        # 2. Convert sang PDF (LibreOffice / Gotenberg / unoconv)
        # 3. Upload PDF preview lên S3
        # 4. Trả về Presigned URL của file PDF
        raise NotImplementedError("Office to PDF conversion chưa được implement")

    async def get_download_url(self, file_path: str, expires_in: int = 3600) -> str:
        """Sinh Presigned URL để tải file gốc"""
        return self.s3_client.generate_presigned_url(
            file_path=file_path,
            expires_in=expires_in,
        )
