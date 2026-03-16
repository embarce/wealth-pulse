"""
微信相关 API
包括微信公众号自动发布、图片生成等功能
"""
import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.exceptions import ApiException
from app.schemas.common import success_response, ResponseCode
from app.services.image_generation_service import DoubaoImageService
from app.services.prompt_generation_service import PromptGenerationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/wechat", tags=["wechat"])


class WechatGenerateImageRequest(BaseModel):
    """微信图片生成请求"""
    markdown_content: str = Field(..., description="Markdown 格式的报告内容")
    report_date: str = Field(..., description="报告日期，格式：YYYY-MM-DD")


class WechatGenerateImageResponse(BaseModel):
    """微信图片生成响应"""
    image_url: str = Field(..., description="生成的图片 URL")
    prompt_used: str = Field(..., description="使用的图片生成提示词")


@router.post("/generate-analysis-image", summary="生成微信分析图片")
async def generate_wechat_analysis_image(request: WechatGenerateImageRequest):
    """
    生成微信分析图片

    基于 Markdown 内容，通过 LLM 生成图片提示词，再调用豆包图片生成 API

    **请求参数：**
    - `markdown_content`: Markdown 格式的报告内容
    - `report_date`: 报告日期（格式：YYYY-MM-DD）

    **返回：**
    - `image_url`: 生成的图片 URL（Java 端自行下载）
    - `prompt_used`: 使用的图片生成提示词
    """
    try:
        logger.info(f"[Wechat] 收到微信图片生成请求，date={request.report_date}")

        # 步骤 1: 使用 LLM 生成图片提示词
        prompt_service = PromptGenerationService(provider="doubao")
        prompt = await prompt_service.generate_prompt(
            markdown_content=request.markdown_content,
            report_date=request.report_date
        )

        logger.info(f"[Wechat] LLM 生成的提示词：{prompt}")

        # 步骤 2: 调用豆包图片生成 API
        image_service = get_image_service()

        try:
            # 生成图片
            result = await image_service.generate_image(
                prompt=prompt,
                size="2K",
                response_format="url",
                watermark=True
            )

            image_url = result.get("image_url")
            if not image_url:
                raise ApiException(
                    msg="图片生成失败：未返回 URL",
                    code=ResponseCode.INTERNAL_ERROR
                )

            logger.info(f"[Wechat] 图片生成成功，URL={image_url}")

            # 不再下载图片，直接返回 URL 给 Java 端
            return success_response(
                data={
                    "image_url": image_url,
                    "prompt_used": prompt
                },
                msg="图片生成成功"
            )

        finally:
            # 关闭服务连接
            await image_service.close()

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[Wechat] 生成图片失败：{str(e)}")
        raise ApiException(
            msg=f"图片生成失败：{str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


def get_image_service() -> DoubaoImageService:
    """
    获取图片生成服务实例

    从环境变量读取 API Key 配置
    """
    api_key = os.getenv("DOUBAO_API_KEY", "")
    if not api_key:
        raise ApiException(
            msg="未配置 DOUBAO_API_KEY 环境变量",
            code=ResponseCode.INTERNAL_ERROR
        )

    return DoubaoImageService(
        api_key=api_key,
        model=os.getenv("DOUBAO_IMAGE_MODEL", "doubao-seedart-250819"),
        base_url=os.getenv("DOUBAO_BASE_URL"),
        timeout=120.0,
        max_retries=3
    )
