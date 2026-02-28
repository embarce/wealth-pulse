"""
Google Gemini LLM 提供者

使用 google-generativeai SDK
文档: https://ai.google.dev/docs
"""
from typing import List, Dict, Any, Optional

import google.generativeai as genai

from app.llm.base import BaseLLMProvider, ChatResponse


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini LLM 提供者
    使用 google-generativeai SDK
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
        初始化 Gemini 提供者

        Args:
            api_key: API 密钥 (GOOGLE_API_KEY)
            model: 模型名称，如 gemini-pro, gemini-1.5-pro, gemini-2.0-flash
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
        
        # 配置 API Key
        genai.configure(api_key=api_key)
        
        # 初始化模型
        self._model = genai.GenerativeModel(model)

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
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
        import asyncio
        
        try:
            # 转换消息格式为 Gemini 格式
            gemini_messages = self._convert_messages(messages)
            
            # 配置生成参数
            generation_config = genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                top_p=kwargs.get("top_p", 0.95)
            )

            def sync_chat():
                # 开始聊天会话
                chat = self._model.start_chat(history=gemini_messages[:-1] if len(gemini_messages) > 1 else [])
                # 发送最后一条消息
                last_message = gemini_messages[-1]["parts"][0] if gemini_messages else ""
                response = chat.send_message(
                    last_message,
                    generation_config=generation_config
                )
                return response
            
            # 在线程池中运行同步调用
            response = await asyncio.get_event_loop().run_in_executor(None, sync_chat)

            content = response.text
            
            # Gemini 的 usage 信息
            usage = {
                "prompt_tokens": response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
                "completion_tokens": response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0,
                "total_tokens": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
            }

            self.logger.info(
                f"[Gemini] 调用成功，返回 {len(content)} 字符，"
                f"tokens: {usage.get('total_tokens', 'N/A')}"
            )

            return ChatResponse(
                content=content,
                usage=usage,
                model=self.model,
                raw_response=None
            )

        except Exception as e:
            self.logger.error(f"[Gemini] 调用失败: {str(e)}")
            raise RuntimeError(f"[Gemini] 调用失败: {str(e)}")

    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[Dict]:
        """
        将 OpenAI 格式的消息转换为 Gemini 格式

        Args:
            messages: OpenAI 格式消息列表

        Returns:
            Gemini 格式消息列表
        """
        gemini_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            # Gemini 使用 "user" 和 "model" 角色
            gemini_role = "user" if role == "user" else "model"
            
            gemini_messages.append({
                "role": gemini_role,
                "parts": [content]
            })
        
        return gemini_messages