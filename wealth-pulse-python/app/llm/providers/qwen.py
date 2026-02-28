"""
阿里云通义千问 LLM 提供者

使用阿里云 dashscope SDK
文档: https://help.aliyun.com/zh/dashscope/
"""
from typing import List, Dict, Any, Optional

from dashscope import Generation

from app.llm.base import BaseLLMProvider, ChatResponse


class QwenProvider(BaseLLMProvider):
    """
    阿里云通义千问 LLM 提供者
    使用 dashscope SDK
    """

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: Optional[str] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: float = 60.0,
        top_p: float = 0.8
    ):
        """
        初始化通义千问提供者

        Args:
            api_key: API 密钥 (DASHSCOPE_API_KEY)
            model: 模型名称，如 qwen-turbo, qwen-plus, qwen-max
            base_url: API 端点 URL（dashscope SDK 内置）
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

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> ChatResponse:
        """
        调用通义千问聊天接口

        Args:
            messages: 消息列表
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数

        Returns:
            ChatResponse 对象
        """
        import asyncio
        
        try:
            # dashscope 使用同步 API，需要在异步环境中运行
            def sync_chat():
                response = Generation.call(
                    api_key=self.api_key,
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=kwargs.get("top_p", self.top_p),
                    result_format='message'
                )
                return response
            
            # 在线程池中运行同步调用
            response = await asyncio.get_event_loop().run_in_executor(None, sync_chat)

            if response.status_code != 200:
                raise RuntimeError(f"[Qwen] API 错误: {response.code} - {response.message}")

            content = response.output.choices[0].message.content
            usage = {
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.total_tokens
            }

            self.logger.info(
                f"[Qwen] 调用成功，返回 {len(content)} 字符，"
                f"tokens: {usage.get('total_tokens', 'N/A')}"
            )

            return ChatResponse(
                content=content,
                usage=usage,
                model=self.model,
                raw_response=response.__dict__ if hasattr(response, '__dict__') else None
            )

        except Exception as e:
            self.logger.error(f"[Qwen] 调用失败: {str(e)}")
            raise RuntimeError(f"[Qwen] 调用失败: {str(e)}")