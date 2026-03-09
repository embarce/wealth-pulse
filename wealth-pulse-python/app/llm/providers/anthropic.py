"""
Anthropic LLM 提供者

使用 anthropic SDK
文档：https://docs.anthropic.com/claude/reference
"""
from typing import List, Dict, Optional, AsyncIterator

from anthropic import AsyncAnthropic

from app.llm.base import BaseLLMProvider, ChatResponse, StreamChunk


class AnthropicProvider(BaseLLMProvider):
    """
    Anthropic LLM 提供者
    使用 Anthropic SDK
    """

    # Anthropic 支持的模型列表
    MODELS = [
        "claude-5-sonnet",
    ]

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
        初始化 Anthropic 提供者

        Args:
            api_key: API 密钥
            model: 模型名称
            base_url: API 端点 URL
            max_retries: 最大重试次数
            retry_delay: 重试延迟（秒）
            timeout: 请求超时时间（秒）
        """
        super().__init__(
            api_key=api_key,
            model=model,
            base_url=base_url,
            max_retries=max_retries,
            retry_delay=retry_delay,
            timeout=timeout
        )

        # 初始化 Anthropic 客户端
        self._client = AsyncAnthropic(
            api_key=api_key,
            base_url=base_url or "https://api.anthropic.com",
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
        调用 Anthropic 聊天接口

        Args:
            messages: 消息列表
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数

        Returns:
            ChatResponse 对象
        """
        try:
            # Anthropic 使用 system + messages 格式
            system_prompt = ""
            user_messages = []

            for msg in messages:
                if msg["role"] == "system":
                    system_prompt = msg["content"]
                else:
                    user_messages.append(msg)

            # 调用 API
            response = await self._client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt if system_prompt else None,
                messages=user_messages,
                temperature=temperature
            )

            content = response.content[0].text
            usage = {
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens
            }

            self.logger.info(
                f"[Anthropic] 调用成功，返回 {len(content)} 字符，"
                f"tokens: {usage.get('total_tokens', 'N/A')}"
            )

            return ChatResponse(
                content=content,
                usage=usage,
                model=response.model,
                raw_response=response.model_dump() if hasattr(response, 'model_dump') else None
            )

        except Exception as e:
            self.logger.error(f"[Anthropic] 调用失败：{str(e)}")
            raise RuntimeError(f"[Anthropic] 调用失败：{str(e)}")

    async def chat_stream(
            self,
            messages: List[Dict[str, str]],
            temperature: float = 0.7,
            max_tokens: int = 5000,
            **kwargs
    ) -> AsyncIterator[StreamChunk]:
        """
        调用 Anthropic 流式聊天接口

        Args:
            messages: 消息列表
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数

        Yields:
            StreamChunk 对象
        """
        try:
            # Anthropic 使用 system + messages 格式
            system_prompt = ""
            user_messages = []

            for msg in messages:
                if msg["role"] == "system":
                    system_prompt = msg["content"]
                else:
                    user_messages.append(msg)

            # 流式调用
            async with self._client.messages.stream(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt if system_prompt else None,
                messages=user_messages,
                temperature=temperature
            ) as stream:
                async for text in stream.text_stream:
                    if text:
                        self.logger.info(f"[Anthropic] 流式调用返回 {text}")
                        yield StreamChunk(content=text)

                # 获取最终响应（包含 usage）
                response = await stream.get_final_response()
                usage = {
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                }
                yield StreamChunk(
                    content="",
                    finish_reason="stop",
                    usage=usage
                )

        except Exception as e:
            self.logger.error(f"[Anthropic] 流式调用失败：{str(e)}")
            raise RuntimeError(f"[Anthropic] 流式调用失败：{str(e)}")

    def get_available_models(self) -> List[str]:
        """获取支持的模型列表"""
        return self.MODELS

    async def close(self):
        """关闭客户端连接"""
        await self._client.close()
