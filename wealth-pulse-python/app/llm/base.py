"""
LLM 提供者抽象基类
定义所有 LLM 提供者必须实现的接口
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
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
class ProviderInfo:
    """提供者信息"""
    name: str
    model: str
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
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: float = 60.0
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
        max_tokens: int = 2000,
        **kwargs
    ) -> ChatResponse:
        """
        聊天接口

        Args:
            messages: 消息列表，格式: [{"role": "user", "content": "..."}]
            temperature: 温度参数 (0-1)
            max_tokens: 最大 token 数
            **kwargs: 其他参数

        Returns:
            ChatResponse 对象
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
            available=self.is_available(),
            base_url=self.base_url
        )