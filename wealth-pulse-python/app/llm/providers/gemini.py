"""
Google Gemini LLM 提供者

使用新的 google-genai SDK
文档：https://ai.google.dev/docs
"""
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.llm.base import BaseLLMProvider, ChatResponse


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini LLM 提供者
    使用 google-genai SDK
    """

    # Gemini 支持的模型列表
    MODELS = [
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-pro",
    ]

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
        初始化 Gemini 提供者

        Args:
            api_key: API 密钥
            model: 模型名称
            base_url: API 端点 URL（可选）
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

        # 初始化客户端
        self._client = genai.Client(api_key=api_key)

    async def chat(
            self,
            messages: List[Dict[str, str]],
            temperature: float = 0.7,
            max_tokens: int = 5000,
            **kwargs
    ) -> ChatResponse:
        """
        调用 Gemini 聊天接口

        Args:
            messages: 消息列表
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数

        Returns:
            ChatResponse 对象
        """
        try:
            # 转换为 Gemini 格式
            prompt = messages[-1]["content"]

            # 异步调用
            response = await self._client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens
                )
            )

            content = response.text
            usage = {
                "prompt_tokens": response.usage_metadata.prompt_token_count,
                "completion_tokens": response.usage_metadata.candidates_token_count,
                "total_tokens": response.usage_metadata.total_token_count
            }

            self.logger.info(
                f"[Gemini] 调用成功，返回 {len(content)} 字符，"
                f"tokens: {usage.get('total_tokens', 'N/A')}"
            )

            return ChatResponse(
                content=content,
                usage=usage,
                model=self.model,
                raw_response={"text": content}
            )

        except Exception as e:
            self.logger.error(f"[Gemini] 调用失败：{str(e)}")
            raise RuntimeError(f"[Gemini] 调用失败：{str(e)}")

    def get_available_models(self) -> List[str]:
        """获取支持的模型列表"""
        return self.MODELS

    async def close(self):
        """关闭客户端连接（Gemini 无需额外操作）"""
        pass
