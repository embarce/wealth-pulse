"""
AI 分析 API
提供股票 AI 分析相关的接口
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, Path
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.exceptions import ApiException
from app.core.security import get_current_user
from app.db.session import get_db
from app.schemas.common import success_response, ResponseCode
from app.services.stock_analysis_service import StockAnalysisService
from app.llm import llm_service, LLMFactory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai-analysis"])


# ==================== 请求模型 ====================

class StockAnalysisRequest(BaseModel):
    """股票分析请求"""
    stock_code: str = Field(..., description="股票代码", example="0700.HK")
    period: str = Field(default="daily", description="周期: daily/weekly/monthly", pattern="^(daily|weekly|monthly)$")
    days: int = Field(default=60, description="获取多少天的历史数据", ge=10, le=365)
    force_refresh: bool = Field(default=False, description="是否强制刷新（跳过缓存）")
    provider: Optional[str] = Field(default=None, description="LLM 供应商: doubao/openai")
    model: Optional[str] = Field(default=None, description="模型名称，如: gpt-4o-mini, ep-xxx")


class PositionItem(BaseModel):
    """持仓项"""
    stock_code: str = Field(..., description="股票代码", example="0700.HK")
    buy_price: float = Field(..., description="买入价格", ge=0)
    quantity: int = Field(..., description="持仓数量（股）", ge=1)
    buy_date: Optional[str] = Field(default=None, description="买入日期，格式: YYYY-MM-DD")


class PositionAnalysisRequest(BaseModel):
    """持仓分析请求"""
    positions: List[PositionItem] = Field(..., description="持仓列表", min_length=1, max_length=20)
    analysis_depth: str = Field(default="standard", description="分析深度: quick(快速)/standard(标准)/deep(深度)")
    provider: Optional[str] = Field(default=None, description="LLM 供应商: doubao/openai")
    model: Optional[str] = Field(default=None, description="模型名称")


class LLMProviderInfo(BaseModel):
    """LLM 供应商信息"""
    name: str = Field(..., description="供应商名称")
    model: str = Field(..., description="默认模型")
    available: bool = Field(..., description="是否可用")
    base_url: Optional[str] = Field(None, description="API 地址")


# ==================== LLM 管理接口 ====================

@router.get("/providers", summary="获取 LLM 供应商列表")
async def list_providers(
    current_user: dict = Depends(get_current_user)
):
    """
    获取所有支持的 LLM 供应商列表

    返回每个供应商的名称、默认模型和可用状态
    """
    providers = llm_service.list_providers()
    provider_list = [
        LLMProviderInfo(
            name=name,
            model=info.model,
            available=info.available,
            base_url=info.base_url
        )
        for name, info in providers.items()
    ]
    return success_response(
        data=provider_list,
        msg="获取供应商列表成功"
    )


@router.get("/available-providers", summary="获取可用的 LLM 供应商")
async def list_available_providers(
    current_user: dict = Depends(get_current_user)
):
    """
    获取所有可用的 LLM 供应商（已配置 API Key）

    返回可用的供应商名称列表
    """
    available = llm_service.list_available_providers()
    return success_response(
        data=available,
        msg=f"共有 {len(available)} 个可用供应商"
    )


# ==================== 股票分析接口 ====================

@router.post("/analyze-stock", summary="AI 分析股票")
async def analyze_stock(
    request: StockAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    AI 分析股票（需要认证）

    此接口会收集以下信息并通过 LLM 进行综合分析：
    1. 股票基本信息
    2. 实时市场数据
    3. 历史 K 线数据
    4. 公司信息（新浪财经）
    5. 财务指标（新浪财经）
    6. 最近新闻（新浪财经）
    7. 最近公告（新浪财经）

    **请求参数：**
    - `stock_code`: 股票代码（如：0700.HK, 09868.HK）
    - `period`: 周期类型（daily=日线, weekly=周线, monthly=月线）
    - `days`: 获取多少天的历史数据（默认60天）
    - `force_refresh`: 是否强制刷新（默认false）
    - `provider`: LLM 供应商（可选：doubao, openai）
    - `model`: 模型名称（可选，不指定则使用供应商默认模型）

    **示例请求：**
    ```json
    {
      "stock_code": "0700.HK",
      "period": "daily",
      "days": 60,
      "provider": "openai",
      "model": "gpt-4o-mini"
    }
    ```
    """
    try:
        logger.info(f"[AI] 收到股票分析请求: {request.stock_code}, provider={request.provider}, model={request.model}")

        # 创建分析服务
        analysis_service = StockAnalysisService(db)

        # 执行分析
        result = await analysis_service.analyze_stock(
            stock_code=request.stock_code,
            period=request.period,
            days=request.days,
            force_refresh=request.force_refresh,
            provider=request.provider,
            model=request.model
        )

        return success_response(
            data=result,
            msg=f"股票 {request.stock_code} 分析完成"
        )

    except ValueError as e:
        logger.error(f"[AI] 分析请求参数错误: {str(e)}")
        raise ApiException(
            msg=str(e),
            code=ResponseCode.BAD_REQUEST
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[AI] 分析股票失败: {str(e)}")
        raise ApiException(
            msg=f"分析失败: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


# ==================== 持仓分析接口 ====================

@router.post("/analyze-position", summary="AI 分析持仓")
async def analyze_position(
    request: PositionAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    AI 分析持仓（需要认证）

    此接口会对用户的持仓进行综合分析，给出评分和建议：
    1. 组合整体评分（0-100分）
    2. 每只股票的单独评分（A/B/C/D/E 等级）
    3. 持仓建议（持有/加仓/减仓/清仓）
    4. 风险评估和提示

    **请求参数：**
    - `positions`: 持仓列表，每项包含：
      - `stock_code`: 股票代码（如：0700.HK）
      - `buy_price`: 买入价格
      - `quantity`: 持仓数量（股）
      - `buy_date`: 买入日期（可选，格式：YYYY-MM-DD）
    - `analysis_depth`: 分析深度（quick=快速, standard=标准, deep=深度）
    - `provider`: LLM 供应商（可选：doubao, openai）
    - `model`: 模型名称（可选）

    **示例请求：**
    ```json
    {
      "positions": [
        {
          "stock_code": "0700.HK",
          "buy_price": 350.0,
          "quantity": 100,
          "buy_date": "2024-01-15"
        },
        {
          "stock_code": "09868.HK",
          "buy_price": 85.0,
          "quantity": 200,
          "buy_date": "2024-02-01"
        }
      ],
      "analysis_depth": "standard",
      "provider": "openai"
    }
    ```

    **返回结果示例：**
    ```json
    {
      "portfolio_summary": {
        "overall_score": 82,
        "overall_rating": "良好",
        "risk_level": "中",
        "diversification": "一般",
        "investment_style": "成长"
      },
      "position_scores": [
        {
          "stock_code": "0700.HK",
          "score": 85,
          "grade": "B",
          "holding_quality": "良好",
          "profit_prospect": "看涨",
          "risk_warning": "估值偏高，注意回调风险"
        }
      ],
      "position_recommendations": [
        {
          "stock_code": "0700.HK",
          "action": "持有",
          "reason": "基本面稳健，短期有上涨空间",
          "target_price_range": "380-420",
          "stop_loss_price": 320,
          "confidence": "medium"
        }
      ]
    }
    ```
    """
    try:
        logger.info(f"[AI] 收到持仓分析请求: {len(request.positions)} 只股票, depth={request.analysis_depth}")

        # 创建分析服务
        analysis_service = StockAnalysisService(db)

        # 转换持仓数据
        positions = [pos.model_dump() for pos in request.positions]

        # 执行分析
        result = await analysis_service.analyze_position(
            positions=positions,
            analysis_depth=request.analysis_depth,
            provider=request.provider,
            model=request.model
        )

        return success_response(
            data=result,
            msg=f"持仓分析完成，共 {len(request.positions)} 只股票"
        )

    except ValueError as e:
        logger.error(f"[AI] 持仓分析请求参数错误: {str(e)}")
        raise ApiException(
            msg=str(e),
            code=ResponseCode.BAD_REQUEST
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[AI] 持仓分析失败: {str(e)}")
        raise ApiException(
            msg=f"分析失败: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )