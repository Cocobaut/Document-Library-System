# services/search_service.py
# Xử lý bóc tách ruột file và đẩy/tìm trên Elasticsearch/Meilisearch

from typing import Optional

from core.config import get_settings

settings = get_settings()


class SearchService:
    """
    Service xử lý full-text search trên Elasticsearch hoặc Meilisearch.
    Bao gồm: bóc tách nội dung file (text extraction), index, và tìm kiếm.
    """

    def __init__(self):
        """Khởi tạo kết nối tới search engine"""
        self.engine_url = settings.SEARCH_ENGINE_URL
        self.index_name = "documents"
        # TODO: Khởi tạo client Elasticsearch/Meilisearch

    async def extract_text(self, file_path: str, file_type: str) -> str:
        """
        Bóc tách nội dung text từ file.
        Hỗ trợ: PDF, DOCX, XLSX, TXT, ...
        """
        # TODO: Implement text extraction logic
        # - PDF: sử dụng PyPDF2 hoặc pdfplumber
        # - DOCX: sử dụng python-docx
        # - XLSX: sử dụng openpyxl
        # - TXT: đọc trực tiếp
        raise NotImplementedError("Text extraction chưa được implement")

    async def index_document(
        self,
        document_id: int,
        title: str,
        content: str,
        metadata: Optional[dict] = None,
    ) -> bool:
        """
        Đẩy nội dung tài liệu lên search engine để index.
        """
        doc_body = {
            "id": document_id,
            "title": title,
            "content": content,
            "metadata": metadata or {},
        }
        # TODO: Gọi API Elasticsearch/Meilisearch để index
        raise NotImplementedError("Document indexing chưa được implement")

    async def search(
        self,
        keyword: str,
        filters: Optional[dict] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        """
        Tìm kiếm tài liệu theo từ khóa.
        Trả về danh sách document_id kèm điểm relevance.
        """
        # TODO: Gọi API Elasticsearch/Meilisearch để search
        raise NotImplementedError("Search chưa được implement")

    async def delete_document(self, document_id: int) -> bool:
        """Xóa tài liệu khỏi search index"""
        # TODO: Gọi API xóa document
        raise NotImplementedError("Delete from index chưa được implement")
