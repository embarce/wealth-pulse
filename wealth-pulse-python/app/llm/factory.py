"""
LLM 提供者工厂
支持动态选择供应商和模型
"""
from typing import Dict, Type, Optional
import logging

from app.llm.base import BaseLLMProvider, ProviderInfo
from app.llm.config import LLMConfig
from app.llm.providers.doubao import DoubaoProvider
from app.llm.providers.openai import OpenAIProvider
from app.llm.providers.qwen import QwenProvider
from app.llm.providers.gemini import GeminiProvider
from app.llm.providers.gitee import GiteeProvider
from app.llm.providers.anthropic import AnthropicProvider
from app.llm.providers.deepseek import DeepSeekProvider
from app.llm.providers.zhipu import ZhipuProvider

logger = logging.getLogger(__name__)


class LLMFactory:
    """
    LLM 提供者工厂

    支持动态选择供应商和模型，按需创建提供者实例
    """

    # 注册的提供者类
    _providers: Dict[str, Type[BaseLLMProvider]] = {
        "doubao": DoubaoProvider,
        "openai": OpenAIProvider,
        "qwen": QwenProvider,
        "gemini": GeminiProvider,
        "gitee": GiteeProvider,
        "anthropic": AnthropicProvider,
        "deepseek": DeepSeekProvider,
        "zhipu": ZhipuProvider,
    }

    # 缓存的提供者实例（按 provider+model 组合缓存）
    _instances: Dict[str, BaseLLMProvider] = {}

    @classmethod
    def register_provider(cls, name: str, provider_class: Type[BaseLLMProvider]):
        """
        注册新的提供者

        Args:
            name: 提供者名称
            provider_class: 提供者类
        """
        cls._providers[name.lower()] = provider_class
        logger.info(f"[LLMFactory] 注册提供者: {name}")

    @classmethod
    def get_provider(
        cls,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> BaseLLMProvider:
        """
        获取 LLM 提供者实例

        Args:
            provider: 供应商名称，为空则使用默认
            model: 模型名称，为空则使用配置中的默认模型

        Returns:
            BaseLLMProvider 实例

        Raises:
            ValueError: 供应商不存在或配置无效
        """
        # 获取供应商名称
        provider_name = (provider or LLMConfig.get_default_provider()).lower()

        # 获取配置
        config = LLMConfig.get_provider_config(provider_name)

        # 确定使用的模型
        actual_model = model or config.model
        if not actual_model:
            raise ValueError(f"未指定模型且供应商 {provider_name} 无默认模型配置")

        # 检查 API Key
        if not config.api_key:
            raise ValueError(f"供应商 {provider_name} 未配置 API Key")

        # 生成缓存 key
        cache_key = f"{provider_name}:{actual_model}"

        # 检查缓存
        if cache_key in cls._instances:
            return cls._instances[cache_key]

        # 创建新实例
        provider_class = cls._providers.get(provider_name)
        if not provider_class:
            raise ValueError(f"不支持的供应商: {provider_name}，支持的供应商: {list(cls._providers.keys())}")

        instance = provider_class(
            api_key=config.api_key,
            model=actual_model,
            base_url=config.base_url,
            **config.extra
        )

        cls._instances[cache_key] = instance
        logger.info(f"[LLMFactory] 创建提供者实例: {provider_name} / {actual_model}")

        return instance

    @classmethod
    def get_provider_info(cls, provider: Optional[str] = None) -> ProviderInfo:
        """
        获取提供者信息

        Args:
            provider: 供应商名称

        Returns:
            ProviderInfo 对象
        """
        provider_name = (provider or LLMConfig.get_default_provider()).lower()
        config = LLMConfig.get_provider_config(provider_name)

        # 从提供者类获取模型列表
        provider_class = cls._providers.get(provider_name)
        if provider_class and hasattr(provider_class, "MODELS"):
            models = provider_class.MODELS
        else:
            models = []

        return ProviderInfo(
            name=provider_name,
            model=config.model,
            models=models,
            available=bool(config.api_key),
            base_url=config.base_url
        )

    @classmethod
    def list_providers(cls) -> Dict[str, ProviderInfo]:
        """
        列出所有支持的供应商及其状态

        Returns:
            供应商名称 -> ProviderInfo 的字典
        """
        result = {}
        for name in cls._providers:
            result[name] = cls.get_provider_info(name)
        return result

    @classmethod
    def list_available_providers(cls) -> list:
        """
        列出所有可用的供应商

        Returns:
            可用供应商列表
        """
        return LLMConfig.list_available_providers()

    @classmethod
    def clear_cache(cls):
        """清除缓存的所有实例"""
        cls._instances.clear()
        logger.info("[LLMFactory] 已清除所有缓存实例")

    @classmethod
    def create_provider(
        cls,
        provider: str,
        api_key: str,
        model: str,
        base_url: Optional[str] = None,
        **kwargs
    ) -> BaseLLMProvider:
        """
        使用自定义参数创建提供者实例

        Args:
            provider: 供应商名称
            api_key: API 密钥
            model: 模型名称
            base_url: API 基础 URL
            **kwargs: 其他参数

        Returns:
            BaseLLMProvider 实例
        """
        provider_name = provider.lower()
        provider_class = cls._providers.get(provider_name)

        if not provider_class:
            raise ValueError(f"不支持的供应商: {provider_name}")

        return provider_class(
            api_key=api_key,
            model=model,
            base_url=base_url,
            **kwargs
        )