"""
火山引擎豆包 LLM 提供者

使用火山引擎 volcengine-python-sdk
文档：https://www.volcengine.com/docs/82379
"""
from typing import List, Dict, Any, Optional, AsyncIterator

from volcenginesdkarkruntime import AsyncArk

from app.llm.base import BaseLLMProvider, ChatResponse, StreamChunk
from app.services.image_generation_service import DoubaoImageService


class DoubaoProvider(BaseLLMProvider):
    """
    火山引擎豆包 LLM 提供者
    使用 volcengine-python-sdk (Ark Runtime)
    """

    # 豆包支持的模型列表
    MODELS = [
        "doubao-seed-2-0-pro-260215",
        "doubao-seed-2-0-lite-260215",
        "doubao-seed-2-0-mini-260215",
        "doubao-seed-2-0-code-preview-260215",
        "glm-4-7-251222",
        "deepseek-v3-2-251201",
    ]

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: Optional[str] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: float = 180.0,
        top_p: float = 0.9
    ):
        """
        初始化豆包提供者

        Args:
            api_key: API 密钥
            model: 模型 endpoint ID
            base_url: API 端点 URL（火山引擎使用 region）
            max_retries: 最大重试次数
            retry_delay: 重试延迟（秒）
            timeout: 请求超时时间（秒）
            top_p: top_p 采样参数
        """
        super().__init__(
            api_key=api_key,
            model=model,
            base_url=base_url,
            max_retries=max_retries,
            retry_delay=retry_delay,
            timeout=timeout
        )
        self.top_p = top_p

        # 初始化 Ark 客户端
        self._client = AsyncArk(
            api_key=api_key,
            timeout=timeout,
            max_retries=max_retries
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 5000,
        **kwargs
    ) -> ChatResponse:
        """
        调用豆包聊天接口

        Args:
            messages: 消息列表
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数

        Returns:
            ChatResponse 对象
        """
        try:
            # 调用 Ark API
            response = await self._client.chat.completions.create(
                model=self.model,  # endpoint ID
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=kwargs.get("top_p", self.top_p)
            )

            content = response.choices[0].message.content
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

            self.logger.info(
                f"[Doubao] 调用成功，返回 {len(content)} 字符，"
                f"tokens: {usage.get('total_tokens', 'N/A')}"
            )

            return ChatResponse(
                content=content,
                usage=usage,
                model=response.model,
                raw_response=response.model_dump() if hasattr(response, 'model_dump') else None
            )

        except Exception as e:
            self.logger.error(f"[Doubao] 调用失败：{str(e)}")
            raise RuntimeError(f"[Doubao] 调用失败：{str(e)}")

    def get_available_models(self) -> List[str]:
        """获取支持的模型列表"""
        return self.MODELS

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 5000,
        **kwargs
    ) -> AsyncIterator[StreamChunk]:
        """
        调用豆包流式聊天接口

        Args:
            messages: 消息列表
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数

        Yields:
            StreamChunk 对象
        """
        try:
            # 构建请求参数，启用流式
            request_params = {
                "model": self.model,  # endpoint ID
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "top_p": kwargs.get("top_p", self.top_p),
                "stream": True
            }

            # 流式调用
            stream = await self._client.chat.completions.create(**request_params)

            # 异步迭代响应
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                content = delta.content if delta and delta.content else ""

                if content:
                    self.logger.info(f"[Doubao] 流式调用，返回 {content}")
                    yield StreamChunk(content=content)

                # 检查是否结束
                finish_reason = chunk.choices[0].finish_reason if chunk.choices else None
                if finish_reason:
                    # 尝试获取 usage 信息
                    usage = None
                    if hasattr(chunk, 'usage') and chunk.usage:
                        usage = {
                            "prompt_tokens": chunk.usage.prompt_tokens,
                            "completion_tokens": chunk.usage.completion_tokens,
                            "total_tokens": chunk.usage.total_tokens
                        }
                    yield StreamChunk(
                        content="",
                        finish_reason=finish_reason,
                        usage=usage
                    )
                    break

        except Exception as e:
            self.logger.error(f"[Doubao] 流式调用失败：{str(e)}")
            raise RuntimeError(f"[Doubao] 流式调用失败：{str(e)}")

    async def close(self):
        """关闭客户端连接"""
        await self._client.close()
