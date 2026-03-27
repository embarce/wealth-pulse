"""
LLM 图片提示词生成服务
使用 LLM 分析内容并生成适合图片生成的提示词
"""
import logging
from typing import Optional, Dict, Any

from app.llm.factory import LLMFactory

logger = logging.getLogger(__name__)


class PromptGenerationService:
    """
    提示词生成服务
    使用 LLM 分析 Markdown 内容，生成适合图片生成的提示词
    """

    # 默认的图片生成提示词模板
    DEFAULT_IMAGE_PROMPT_TEMPLATE = """
你是一个专业的 AI 图片提示词生成专家。请根据以下港股市场分析报告内容，生成一个适合用作微信公众号文章封面的图片提示词。

## 报告内容
{markdown_content}

## 报告日期
{report_date}

## 要求
1. 提取报告中的核心情绪和关键词（如：上涨、下跌、震荡、突破等）
2. 根据市场情绪生成对应的视觉风格：
   - 上涨/利好：明亮、温暖色调、上升箭头、金色/红色元素
   - 下跌/利空：冷静、深蓝色调、下降趋势、紫色/灰色元素
   - 震荡/中性：平衡、渐变色、波动线条

## 输出格式
直接输出图片提示词，不要有任何解释。提示词应包含：
- 视觉风格描述（如：金融数据可视化、K 线图、蜡烛图、资金流向等）
- 色彩描述（如：蓝色紫色渐变、金色红色对比等）
- 情绪氛围（如：专业、现代、科技感等）
- 日期标识（{report_date}）

提示词示例：
金融数据可视化风格，港股市场分析报告封面，专业投资分析图表元素，K 线图，蜡烛图，资金流向箭头，现代科技感，蓝色紫色渐变色调，高分辨率，细节丰富，2026-03-15 日期标识
"""

    def __init__(self, provider: str = "doubao", model: Optional[str] = None):
        """
        初始化提示词生成服务

        Args:
            provider: LLM 供应商，默认使用 doubao
            model: 模型名称，不指定则使用默认模型
        """
        self.provider = provider
        self.model = model
        self.logger = logger

    async def generate_prompt(self, markdown_content: str, report_date: str) -> str:
        """
        根据 Markdown 内容生成图片提示词

        Args:
            markdown_content: Markdown 格式的报告内容
            report_date: 报告日期

        Returns:
            生成的图片提示词
        """
        try:
            self.logger.info(f"[PromptGen] 开始生成图片提示词，date={report_date}")

            # 获取 LLM 提供者实例（使用 doubao）
            llm = LLMFactory.get_provider(
                provider=self.provider,
                model=self.model
            )

            # 构建提示词
            prompt = self.DEFAULT_IMAGE_PROMPT_TEMPLATE.format(
                markdown_content=markdown_content[:3000],  # 限制内容长度
                report_date=report_date
            )

            # 调用 LLM 生成提示词
            messages = [
                {"role": "system", "content": "你是一个专业的 AI 图片提示词生成专家，擅长根据金融分析报告生成高质量的图片提示词。"},
                {"role": "user", "content": prompt}
            ]

            response = await llm.chat(
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )

            generated_prompt = response.content.strip()
            self.logger.info(f"[PromptGen] 提示词生成成功：{generated_prompt}")

            return generated_prompt

        except Exception as e:
            self.logger.error(f"[PromptGen] 生成提示词失败：{str(e)}")
            # 返回默认提示词
            return self._get_default_prompt(report_date)

    def _get_default_prompt(self, report_date: str) -> str:
        """
        获取默认提示词（当 LLM 调用失败时使用）

        Args:
            report_date: 报告日期

        Returns:
            默认图片提示词
        """
        return f"""
想感，夸张的广角透视效果，耀光，反射，极致的光影，强引力，吞噬，
金融数据可视化风格，港股市场分析报告封面，
专业投资分析图表元素，K 线图，蜡烛图，资金流向箭头，
现代科技感，蓝色紫色渐变色调，
高分辨率，细节丰富，{report_date} 日期标识
""".strip()
