"""
LLM 提供者抽象基类
定义所有 LLM 提供者必须实现的接口
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncIterator
from dataclasses import dataclass, field
import logging


@dataclass
class ChatResponse:
    """聊天响应结果"""
    content: str
    usage: Dict[str, int]
    model: str
    raw_response: Optional[Dict[str, Any]] = None

    @property
    def total_tokens(self) -> int:
        return self.usage.get("total_tokens", 0)


@dataclass
class StreamChunk:
    """流式响应 chunk"""
    content: str = ""  # 当前 chunk 的内容
    finish_reason: Optional[str] = None  # 结束原因：stop, length, etc.
    usage: Optional[Dict[str, int]] = None  # token 使用统计（通常在最后一个 chunk）


@dataclass
class ProviderInfo:
    """提供者信息"""
    name: str
    model: str
    models: list  # 支持的模型列表
    available: bool
    base_url: Optional[str] = None


class BaseLLMProvider(ABC):
    """
    LLM 提供者抽象基类
    所有 LLM 提供者（豆包、OpenAI 等）必须实现此接口
    """

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: Optional[str] = None,
        max_retries: int = 2,  # 减少默认重试次数
        retry_delay: float = 0.5,  # 减少默认延迟
        timeout: float = 120.0  # 默认 2 分钟超时
    ):
        """
        初始化 LLM 提供者

        Args:
            api_key: API 密钥
            model: 模型名称
            base_url: API 基础 URL（可选）
            max_retries: 最大重试次数
            retry_delay: 重试延迟（秒）
            timeout: 请求超时时间（秒）
        """
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
        self.provider_name = self.__class__.__name__
        self.logger = logging.getLogger(f"llm.{self.provider_name}")

    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 5000,
        **kwargs
    ) -> ChatResponse:
        """
        聊天接口（非流式）

        Args:
            messages: 消息列表
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数
            **kwargs: 其他参数

        Returns:
            ChatResponse 对象
        """
        pass

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 5000,
        **kwargs
    ) -> AsyncIterator[StreamChunk]:
        """
        聊天接口（流式）- 生成器形式返回

        默认实现：通过非流式 chat() 包装，适用于没有原生流式支持的 provider

        Args:
            messages: 消息列表
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数
            **kwargs: 其他参数

        Yields:
            StreamChunk 对象

        Note:
            - 每个 chunk 包含一部分内容
            - 最后一个 chunk 可能包含 usage 统计
            - finish_reason 为 'stop' 表示正常结束
        """
        # 默认实现：调用非流式接口，然后按字符返回
        # 子类应该覆盖此方法以提供真正的流式支持
        response = await self.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )

        # 按字符模拟流式返回
        for char in response.content:
            yield StreamChunk(content=char)

        # 返回 final chunk
        yield StreamChunk(
            content="",
            finish_reason="stop",
            usage=response.usage
        )

    @abstractmethod
    def get_available_models(self) -> List[str]:
        """
        获取该供应商支持的模型列表

        Returns:
            模型列表
        """
        pass

    def is_available(self) -> bool:
        """
        检查提供者是否可用

        Returns:
            是否可用
        """
        return bool(self.api_key)

    def get_info(self) -> ProviderInfo:
        """
        获取提供者信息

        Returns:
            ProviderInfo 对象
        """
        return ProviderInfo(
            name=self.provider_name,
            model=self.model,
            models=self.get_available_models(),
            available=self.is_available(),
            base_url=self.base_url
        )
