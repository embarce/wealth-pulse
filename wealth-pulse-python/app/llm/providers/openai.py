"""
OpenAI LLM 提供者

使用官方 openai SDK
支持 OpenAI API 格式的兼容服务
"""
from typing import List, Dict, Any, Optional

from openai import AsyncOpenAI

from app.llm.base import BaseLLMProvider, ChatResponse


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI LLM 提供者

    使用官方 openai SDK，支持 OpenAI API 格式的兼容服务
    """

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: Optional[str] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: float = 60.0
    ):
        """
        初始化 OpenAI 提供者

        Args:
            api_key: API 密钥
            model: 模型名称
            base_url: API 基础 URL
            max_retries: 最大重试次数
            retry_delay: 重试延迟（秒）
            timeout: 请求超时时间（秒）
        """
        super().__init__(
            api_key=api_key,
            model=model,
            base_url=base_url or "https://api.openai.com/v1",
            max_retries=max_retries,
            retry_delay=retry_delay,
            timeout=timeout
        )
        # 初始化 OpenAI 客户端
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
        max_tokens: int = 2000,
        **kwargs
    ) -> ChatResponse:
        """
        调用 OpenAI 聊天接口

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
            
            # 添加可选参数
            if "top_p" in kwargs:
                request_params["top_p"] = kwargs["top_p"]
            if "presence_penalty" in kwargs:
                request_params["presence_penalty"] = kwargs["presence_penalty"]
            if "frequency_penalty" in kwargs:
                request_params["frequency_penalty"] = kwargs["frequency_penalty"]

            # 调用 API
            response = await self._client.chat.completions.create(**request_params)

            content = response.choices[0].message.content
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

            self.logger.info(
                f"[OpenAI] 调用成功，返回 {len(content)} 字符，"
                f"tokens: {usage.get('total_tokens', 'N/A')}"
            )

            return ChatResponse(
                content=content,
                usage=usage,
                model=response.model,
                raw_response=response.model_dump() if hasattr(response, 'model_dump') else None
            )

        except Exception as e:
            self.logger.error(f"[OpenAI] 调用失败: {str(e)}")
            raise RuntimeError(f"[OpenAI] 调用失败: {str(e)}")

    async def close(self):
        """关闭客户端连接"""
        await self._client.close()