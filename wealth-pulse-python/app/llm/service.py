"""
LLM 服务入口
提供统一的 LLM 调用接口

支持两种调用方式：
1. chat() - 非流式，一次性返回完整结果
2. chat_stream() - 流式，逐步返回内容，适合长文本生成
"""
from typing import List, Dict, Any, Optional, AsyncIterator
import logging

from app.llm.base import BaseLLMProvider, ChatResponse, ProviderInfo, StreamChunk
from app.llm.factory import LLMFactory
from app.llm.config import LLMConfig

logger = logging.getLogger(__name__)


class LLMService:
    """
    LLM 服务入口

    提供统一的 LLM 调用接口，支持动态选择供应商和模型
    """

    def __init__(self):
        self._default_provider: Optional[BaseLLMProvider] = None

    @property
    def default_provider(self) -> BaseLLMProvider:
        """获取默认提供者（延迟初始化）"""
        if self._default_provider is None:
            self._default_provider = LLMFactory.get_provider()
        return self._default_provider

    async def chat(
        self,
        messages: List[Dict[str, str]],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 5000,
        **kwargs
    ) -> ChatResponse:
        """
        发送聊天消息（非流式）

        Args:
            messages: 消息列表
            provider: 供应商名称（可选，默认使用配置）
            model: 模型名称（可选，默认使用配置）
            temperature: 温度参数
            max_tokens: 最大 token 数
            **kwargs: 其他参数

        Returns:
            ChatResponse 对象
        """
        if provider or model:
            llm_provider = LLMFactory.get_provider(provider=provider, model=model)
        else:
            llm_provider = self.default_provider

        return await llm_provider.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 5000,
        **kwargs
    ) -> AsyncIterator[StreamChunk]:
        """
        发送聊天消息（流式）

        Args:
            messages: 消息列表
            provider: 供应商名称（可选，默认使用配置）
            model: 模型名称（可选，默认使用配置）
            temperature: 温度参数
            max_tokens: 最大 token 数
            **kwargs: 其他参数

        Yields:
            StreamChunk 对象
        """
        if provider or model:
            llm_provider = LLMFactory.get_provider(provider=provider, model=model)
        else:
            llm_provider = self.default_provider

        async for chunk in llm_provider.chat_stream(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        ):
            yield chunk

    async def chat_text(
        self,
        messages: List[Dict[str, str]],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        发送聊天消息（仅返回文本）

        Args:
            messages: 消息列表
            provider: 供应商名称
            model: 模型名称
            **kwargs: 其他参数

        Returns:
            回复文本
        """
        response = await self.chat(messages, provider=provider, model=model, **kwargs)
        return response.content

    async def chat_stream_text(
        self,
        messages: List[Dict[str, str]],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        发送聊天消息（流式，收集完整文本返回）

        Args:
            messages: 消息列表
            provider: 供应商名称
            model: 模型名称
            **kwargs: 其他参数

        Returns:
            完整回复文本
        """
        content_parts = []
        async for chunk in self.chat_stream(
            messages=messages,
            provider=provider,
            model=model,
            **kwargs
        ):
            if chunk.content:
                content_parts.append(chunk.content)
        return "".join(content_parts)

    def get_provider(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> BaseLLMProvider:
        """
        获取 LLM 提供者实例

        Args:
            provider: 供应商名称
            model: 模型名称

        Returns:
            BaseLLMProvider 实例
        """
        return LLMFactory.get_provider(provider=provider, model=model)

    def get_provider_info(self, provider: Optional[str] = None) -> ProviderInfo:
        """
        获取提供者信息

        Args:
            provider: 供应商名称

        Returns:
            ProviderInfo 对象
        """
        return LLMFactory.get_provider_info(provider)

    def list_providers(self) -> Dict[str, ProviderInfo]:
        """
        列出所有支持的供应商

        Returns:
            供应商信息字典
        """
        return LLMFactory.list_providers()

    def list_available_providers(self) -> list:
        """
        列出所有可用的供应商

        Returns:
            可用供应商列表
        """
        return LLMFactory.list_available_providers()

    def is_available(self, provider: Optional[str] = None) -> bool:
        """
        检查服务是否可用

        Args:
            provider: 供应商名称

        Returns:
            是否可用
        """
        try:
            info = self.get_provider_info(provider)
            return info.available
        except Exception:
            return False

    def switch_default_provider(self, provider: str, model: Optional[str] = None):
        """
        切换默认供应商

        Args:
            provider: 供应商名称
            model: 模型名称
        """
        self._default_provider = LLMFactory.get_provider(provider=provider, model=model)
        logger.info(f"[LLMService] 切换默认供应商：{provider}")


# 全局单例
llm_service = LLMService()
