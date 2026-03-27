"""
图片生成请求和响应 Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class WechatAnalysisImageRequest(BaseModel):
    """微信分析图片生成请求"""
    html_content: str = Field(..., description="HTML 内容")
    report_date: str = Field(..., description="报告日期，格式：YYYY-MM-DD")
    provider: Optional[str] = Field(default="doubao", description="LLM 供应商")
    model: Optional[str] = Field(default=None, description="模型名称")


class WechatAnalysisImageResponse(BaseModel):
    """微信分析图片生成响应"""
    image_path: str = Field(..., description="生成的图片文件路径")
    image_url: Optional[str] = Field(None, description="图片 URL（如果有）")
    width: Optional[int] = Field(None, description="图片宽度")
    height: Optional[int] = Field(None, description="图片高度")


class ImageGenerationRequest(BaseModel):
    """通用图片生成请求"""
    prompt: str = Field(..., description="图片生成提示词")
    negative_prompt: Optional[str] = Field(None, description="负面提示词")
    provider: Optional[str] = Field(default="doubao", description="LLM 供应商")
    model: Optional[str] = Field(default=None, description="模型名称")
    size: Optional[str] = Field(default="2K", description="图片尺寸")
    sequential_image_generation: Optional[str] = Field(default="disabled", description="是否启用序列图片生成")
    response_format: Optional[str] = Field(default="url", description="响应格式：url/b64_json")
    stream: Optional[bool] = Field(default=False, description="是否流式输出")
    watermark: Optional[bool] = Field(default=True, description="是否添加水印")


class ImageGenerationResponse(BaseModel):
    """通用图片生成响应"""
    image_url: str = Field(..., description="图片 URL")
    image_path: Optional[str] = Field(None, description="本地文件路径（如果已下载）")
    prompt_used: str = Field(..., description="使用的提示词")
    model: str = Field(..., description="使用的模型")
