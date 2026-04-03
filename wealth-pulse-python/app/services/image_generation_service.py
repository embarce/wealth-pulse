"""
火山引擎豆包图片生成服务
使用 volcengine-python-sdk (Ark Runtime) 调用 Doubao 图片生成 API

文档：https://www.volcengine.com/docs/82379
"""
import logging
import os
from typing import Optional, Dict, Any
from datetime import datetime

from volcenginesdkarkruntime import AsyncArk

logger = logging.getLogger(__name__)


class DoubaoImageService:
    """
    火山引擎豆包图片生成服务
    使用 Ark Runtime SDK 调用图片生成 API
    """

    # 默认的图片生成模型
    DEFAULT_MODEL = "doubao-seedream-4-5-251128"  # 豆包图片生成模型

    def __init__(
        self,
        api_key: str,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 120.0,
        max_retries: int = 3
    ):
        """
        初始化豆包图片生成服务

        Args:
            api_key: API 密钥
            model: 图片生成模型名称
            base_url: API 端点 URL
            timeout: 请求超时时间（秒）
            max_retries: 最大重试次数
        """
        self.api_key = api_key
        self.model = model or self.DEFAULT_MODEL
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.logger = logging.getLogger(__name__)

        # 初始化 Ark 客户端
        self._client = None

    def _get_client(self) -> AsyncArk:
        """获取或创建 Ark 客户端"""
        if self._client is None:
            self._client = AsyncArk(
                api_key=self.api_key,
                timeout=self.timeout,
                max_retries=self.max_retries
            )
        return self._client

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        size: str = "2K",
        sequential_image_generation: str = "disabled",
        response_format: str = "url",
        stream: bool = False,
        watermark: bool = True
    ) -> Dict[str, Any]:
        """
        生成图片

        Args:
            prompt: 图片生成提示词
            negative_prompt: 负面提示词
            size: 图片尺寸（1024x1024, 2K 等）
            sequential_image_generation: 是否启用序列图片生成
            response_format: 响应格式（url 或 b64_json）
            stream: 是否流式输出
            watermark: 是否添加水印

        Returns:
            包含图片 URL 或 Base64 数据的字典
        """
        try:
            client = self._get_client()

            # 构建请求参数
            request_params = {
                "model": self.model,
                "prompt": prompt,
                "sequential_image_generation": sequential_image_generation,
                "response_format": response_format,
                "size": size,
                "stream": stream,
                "watermark": watermark
            }

            # 添加负面提示词（如果提供）
            if negative_prompt:
                request_params["negative_prompt"] = negative_prompt

            self.logger.info(f"[DoubaoImage] 开始生成图片，model={self.model}, size={size}")
            self.logger.debug(f"[DoubaoImage] 提示词：{prompt}")

            # 调用图片生成 API
            response = await client.images.generate(**request_params)

            # 解析响应
            if response.data and len(response.data) > 0:
                image_result = response.data[0]

                result = {
                    "image_url": image_result.url if hasattr(image_result, 'url') else None,
                    "image_b64": image_result.b64_json if hasattr(image_result, 'b64_json') else None,
                    "model": response.model if hasattr(response, 'model') else self.model,
                    "created_at": datetime.now().isoformat()
                }

                self.logger.info(f"[DoubaoImage] 图片生成成功，URL={result['image_url']}")
                return result
            else:
                self.logger.error("[DoubaoImage] 图片生成失败，返回数据为空")
                raise RuntimeError("图片生成失败：返回数据为空")

        except Exception as e:
            self.logger.error(f"[DoubaoImage] 生成图片失败：{str(e)}")
            raise RuntimeError(f"[DoubaoImage] 生成图片失败：{str(e)}")

    async def download_image(self, image_url: str, save_path: str) -> str:
        """
        下载图片到本地

        Args:
            image_url: 图片 URL
            save_path: 保存路径

        Returns:
            保存的文件路径
        """
        import httpx

        try:
            self.logger.info(f"[DoubaoImage] 下载图片：{image_url} -> {save_path}")

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(image_url)
                response.raise_for_status()

                # 确保目录存在
                os.makedirs(os.path.dirname(save_path), exist_ok=True)

                # 保存图片
                with open(save_path, 'wb') as f:
                    f.write(response.content)

                self.logger.info(f"[DoubaoImage] 图片下载成功：{save_path}")
                return save_path

        except Exception as e:
            self.logger.error(f"[DoubaoImage] 下载图片失败：{str(e)}")
            raise RuntimeError(f"[DoubaoImage] 下载图片失败：{str(e)}")

    async def close(self):
        """关闭客户端连接"""
        if self._client:
            await self._client.close()
            self._client = None
            self.logger.info("[DoubaoImage] 已关闭客户端连接")
