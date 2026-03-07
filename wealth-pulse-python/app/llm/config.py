"""
LLM 配置管理
从环境变量读取各供应商的配置信息
"""
from typing import Dict, Any, Optional
from pydantic import BaseModel
import os


class ProviderConfig(BaseModel):
    """单个供应商配置"""
    api_key: Optional[str] = None
    model: str = ""
    base_url: Optional[str] = None
    extra: Dict[str, Any] = {}


class LLMConfig:
    """
    LLM 配置管理类

    从环境变量读取各供应商的配置，支持动态获取
    """

    # 支持的供应商列表
    PROVIDERS = ["doubao", "openai", "qwen", "gemini", "gitee", "anthropic", "deepseek", "zhipu"]

    @classmethod
    def get_provider_config(cls, provider: str) -> ProviderConfig:
        """
        获取指定供应商的配置

        Args:
            provider: 供应商名称 (doubao, openai, qwen, gemini, gitee, etc.)

        Returns:
            ProviderConfig 实例
        """
        provider = provider.lower()

        if provider == "doubao":
            return ProviderConfig(
                api_key=os.getenv("DOUBAO_API_KEY"),
                model=os.getenv("DOUBAO_MODEL", "doubao-seed-2-0-pro-260215"),
                base_url=os.getenv(
                    "DOUBAO_ENDPOINT",
                    "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
                ),
                extra={
                    "top_p": float(os.getenv("DOUBAO_TOP_P", "0.9"))
                }
            )

        elif provider == "openai":
            return ProviderConfig(
                api_key=os.getenv("OPENAI_API_KEY"),
                model=os.getenv("OPENAI_MODEL", "gpt-5"),
                base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
                extra={}
            )

        elif provider == "qwen":
            return ProviderConfig(
                api_key=os.getenv("QWEN_API_KEY") or os.getenv("DASHSCOPE_API_KEY"),
                model=os.getenv("QWEN_MODEL", "qwen3-max"),
                base_url=os.getenv(
                    "QWEN_BASE_URL",
                    "https://dashscope.aliyuncs.com/compatible-mode/v1"
                ),
                extra={
                    "top_p": float(os.getenv("QWEN_TOP_P", "0.8"))
                }
            )

        elif provider == "gemini":
            return ProviderConfig(
                api_key=os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"),
                model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
                base_url=os.getenv("GEMINI_BASE_URL"),
                extra={}
            )

        elif provider == "gitee":
            return ProviderConfig(
                api_key=os.getenv("GITEE_API_KEY"),
                model=os.getenv("GITEE_MODEL", "Qwen2.5-72B-Instruct"),
                base_url=os.getenv("GITEE_BASE_URL", "https://ai.gitee.com/v1"),
                extra={}
            )

        elif provider == "anthropic":
            return ProviderConfig(
                api_key=os.getenv("ANTHROPIC_API_KEY"),
                model=os.getenv("ANTHROPIC_MODEL", "claude-5"),
                base_url=os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com"),
                extra={}
            )

        elif provider == "deepseek":
            return ProviderConfig(
                api_key=os.getenv("DEEPSEEK_API_KEY"),
                model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
                base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
                extra={}
            )

        elif provider == "zhipu":
            return ProviderConfig(
                api_key=os.getenv("ZHIPU_API_KEY"),
                model=os.getenv("ZHIPU_MODEL", "glm-5"),
                base_url=os.getenv("ZHIPU_BASE_URL", "https://open.bigmodel.cn/api/paas/v4"),
                extra={}
            )

        else:
            # 尝试从通用环境变量获取
            return ProviderConfig(
                api_key=os.getenv(f"{provider.upper()}_API_KEY"),
                model=os.getenv(f"{provider.upper()}_MODEL", ""),
                base_url=os.getenv(f"{provider.upper()}_BASE_URL"),
                extra={}
            )

    @classmethod
    def get_default_provider(cls) -> str:
        """获取默认供应商名称"""
        return os.getenv("LLM_PROVIDER", "doubao").lower()

    @classmethod
    def is_provider_available(cls, provider: str) -> bool:
        """
        检查供应商是否可用（是否有 API Key）

        Args:
            provider: 供应商名称

        Returns:
            是否可用
        """
        config = cls.get_provider_config(provider)
        return bool(config.api_key)

    @classmethod
    def list_available_providers(cls) -> list:
        """
        列出所有可用的供应商

        Returns:
            可用供应商列表
        """
        available = []
        for provider in cls.PROVIDERS:
            if cls.is_provider_available(provider):
                available.append(provider)
        return available
