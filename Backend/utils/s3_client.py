# utils/s3_client.py
# Kết nối và đẩy file trực tiếp/tạo Presigned URL với MinIO hoặc S3

import uuid
from datetime import datetime
from typing import Optional, BinaryIO

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from core.config import get_settings

settings = get_settings()


class S3Client:
    """
    Client kết nối tới MinIO hoặc AWS S3.
    Xử lý upload file, download, và sinh Presigned URL.
    """

    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=f"{'https' if settings.S3_USE_SSL else 'http'}://{settings.S3_ENDPOINT}",
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            config=BotoConfig(signature_version="s3v4"),
            region_name="us-east-1",  # MinIO mặc định
        )
        self.bucket_name = settings.S3_BUCKET_NAME
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Tạo bucket nếu chưa tồn tại"""
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            self.client.create_bucket(Bucket=self.bucket_name)

    def generate_file_path(self, user_id: int, filename: str) -> str:
        """
        Sinh đường dẫn lưu trữ trên S3.
        Format: users/{user_id}/{year}/{month}/{uuid}_{filename}
        """
        now = datetime.utcnow()
        unique_id = uuid.uuid4().hex[:8]
        return f"users/{user_id}/{now.year}/{now.month:02d}/{unique_id}_{filename}"

    def upload_file(self, file_data: BinaryIO, file_path: str, content_type: str = "application/octet-stream") -> str:
        """
        Upload file lên S3/MinIO.
        Trả về file_path đã lưu.
        """
        self.client.upload_fileobj(
            file_data,
            self.bucket_name,
            file_path,
            ExtraArgs={"ContentType": content_type},
        )
        return file_path

    def download_file(self, file_path: str) -> bytes:
        """Tải file từ S3/MinIO"""
        response = self.client.get_object(Bucket=self.bucket_name, Key=file_path)
        return response["Body"].read()

    def generate_presigned_url(self, file_path: str, expires_in: int = 3600) -> str:
        """
        Sinh Presigned URL để client truy cập file trực tiếp.
        - expires_in: thời gian hết hạn (giây), mặc định 1 giờ
        """
        url = self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": file_path,
            },
            ExpiresIn=expires_in,
        )
        return url

    def generate_upload_presigned_url(self, file_path: str, content_type: str, expires_in: int = 3600) -> str:
        """Sinh Presigned URL để client upload file trực tiếp lên S3"""
        url = self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": file_path,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )
        return url

    def delete_file(self, file_path: str) -> bool:
        """Xóa file trên S3/MinIO"""
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=file_path)
            return True
        except ClientError:
            return False

    def get_file_size(self, file_path: str) -> Optional[int]:
        """Lấy dung lượng file trên S3"""
        try:
            response = self.client.head_object(Bucket=self.bucket_name, Key=file_path)
            return response["ContentLength"]
        except ClientError:
            return None
