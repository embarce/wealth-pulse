"""
DeepSeek LLM 提供者

使用 OpenAI SDK 兼容接口
文档：https://platform.deepseek.com/docs
"""
from typing import List, Dict, Optional, AsyncIterator

from openai import AsyncOpenAI

from app.llm.base import BaseLLMProvider, ChatResponse, StreamChunk


class DeepSeekProvider(BaseLLMProvider):
    """
    DeepSeek LLM 提供者
    使用 OpenAI SDK 兼容接口
    """

    # DeepSeek 支持的模型列表
    MODELS = [
        "deepseek-chat",
    ]

    # DeepSeek 默认端点
    DEFAULT_BASE_URL = "https://api.deepseek.com"

    def __init__(
            self,
            api_key: str,
            model: str,
            base_url: Optional[str] = None,
            max_retries: int = 2,
            retry_delay: float = 0.5,
            timeout: float = 120.0
    ):
        """
        初始化 DeepSeek 提供者

        Args:
            api_key: API 密钥
            model: 模型名称，如 deepseek-chat, deepseek-coder
            base_url: API 端点 URL
            max_retries: 最大重试次数
            retry_delay: 重试延迟（秒）
            timeout: 请求超时时间（秒）
        """
        super().__init__(
            api_key=api_key,
            model=model,
            base_url=base_url or self.DEFAULT_BASE_URL,
            max_retries=max_retries,
            retry_delay=retry_delay,
            timeout=timeout
        )

        # 初始化 OpenAI 兼容客户端
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=self.base_url,
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
        调用 DeepSeek 聊天接口

        Args:
            messages: 消息列表
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数

        Returns:
            ChatResponse 对象
        """
        try:
            # 构建请求参数
            request_params = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }

            # 调用 API
            response = await self._client.chat.completions.create(**request_params)

            content = response.choices[0].message.content
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

            self.logger.info(
                f"[DeepSeek] 调用成功，返回 {len(content)} 字符，"
                f"tokens: {usage.get('total_tokens', 'N/A')}"
            )

            return ChatResponse(
                content=content,
                usage=usage,
                model=response.model,
                raw_response=response.model_dump() if hasattr(response, 'model_dump') else None
            )

        except Exception as e:
            self.logger.error(f"[DeepSeek] 调用失败：{str(e)}")
            raise RuntimeError(f"[DeepSeek] 调用失败：{str(e)}")

    async def chat_stream(
            self,
            messages: List[Dict[str, str]],
            temperature: float = 0.7,
            max_tokens: int = 5000,
            **kwargs
    ) -> AsyncIterator[StreamChunk]:
        """
        调用 DeepSeek 流式聊天接口

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
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True
            }

            # 流式调用
            stream = await self._client.chat.completions.create(**request_params)

            # 异步迭代响应
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                content = delta.content if delta and delta.content else ""

                if content:
                    self.logger.info(
                        f"[DeepSeek] 流式调用，返回 {content}"
                    )
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
            self.logger.error(f"[DeepSeek] 流式调用失败：{str(e)}")
            raise RuntimeError(f"[DeepSeek] 流式调用失败：{str(e)}")

    def get_available_models(self) -> List[str]:
        """获取支持的模型列表"""
        return self.MODELS

    async def close(self):
        """关闭客户端连接"""
        await self._client.close()
