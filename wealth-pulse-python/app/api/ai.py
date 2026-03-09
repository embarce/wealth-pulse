"""
AI 分析 API
提供股票 AI 分析相关的接口
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.exceptions import ApiException
from app.core.security import get_current_user
from app.db.session import get_db
from app.llm import llm_service
from app.schemas.common import success_response, ResponseCode
from app.schemas.hkstock_news import HKStockMarketAnalysisRequest
from app.schemas.kline_analysis import KlineAnalysisRequest
from app.services.sina_hkstock_crawler import SinaHKStockCrawler
from app.services.stock_analysis_service import StockAnalysisService
from app.services.stock_kline_analysis_service import StockKlineAnalysisService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai-analysis"])


# ==================== 请求模型 ====================

class StockAnalysisRequest(BaseModel):
    """股票分析请求"""
    stock_code: str = Field(..., description="股票代码", example="0700.HK")
    period: str = Field(default="daily", description="周期：daily/weekly/monthly", pattern="^(daily|weekly|monthly)$")
    days: int = Field(default=60, description="获取多少天的历史数据", ge=10, le=365)
    force_refresh: bool = Field(default=False, description="是否强制刷新（跳过缓存）")
    provider: Optional[str] = Field(default=None, description="LLM 供应商：doubao/openai")
    model: Optional[str] = Field(default=None, description="模型名称，如：gpt-4o-mini, ep-xxx")


class PositionItem(BaseModel):
    """持仓项"""
    stock_code: str = Field(..., description="股票代码", example="0700.HK")
    buy_price: float = Field(..., description="买入价格", ge=0)
    quantity: int = Field(..., description="持仓数量（股）", ge=1)
    buy_date: Optional[str] = Field(default=None, description="买入日期，格式：YYYY-MM-DD")


class PositionAnalysisRequest(BaseModel):
    """持仓分析请求"""
    positions: List[PositionItem] = Field(..., description="持仓列表", min_length=1, max_length=20)
    analysis_depth: str = Field(default="standard", description="分析深度：quick(快速)/standard(标准)/deep(深度)")
    provider: Optional[str] = Field(default=None, description="LLM 供应商：doubao/openai")
    model: Optional[str] = Field(default=None, description="模型名称")


class LLMProviderInfo(BaseModel):
    """LLM 供应商信息"""
    name: str = Field(..., description="供应商名称")
    model: str = Field(..., description="默认模型")
    models: list = Field(default_factory=list, description="支持的模型列表")
    available: bool = Field(..., description="是否可用")
    base_url: Optional[str] = Field(None, description="API 地址")


# ==================== LLM 管理接口 ====================

@router.get("/providers", summary="获取 LLM 供应商列表")
async def list_providers(
        current_user: dict = Depends(get_current_user)
):
    """
    获取所有支持的 LLM 供应商列表

    返回每个供应商的名称、默认模型、支持的模型列表和可用状态
    """
    providers = llm_service.list_providers()
    provider_list = [
        LLMProviderInfo(
            name=name,
            model=info.model,
            models=info.models,
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
    - `period`: 周期类型（daily=日线，weekly=周线，monthly=月线）
    - `days`: 获取多少天的历史数据（默认 60 天）
    - `force_refresh`: 是否强制刷新（默认 false）
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
        logger.info(f"[AI] 收到股票分析请求：{request.stock_code}, provider={request.provider}, model={request.model}")

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
        logger.error(f"[AI] 分析请求参数错误：{str(e)}")
        raise ApiException(
            msg=str(e),
            code=ResponseCode.BAD_REQUEST
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[AI] 分析股票失败：{str(e)}")
        raise ApiException(
            msg=f"分析失败：{str(e)}",
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
    1. 组合整体评分（0-100 分）
    2. 每只股票的单独评分（A/B/C/D/E 等级）
    3. 持仓建议（持有/加仓/减仓/清仓）
    4. 风险评估和提示

    **请求参数：**
    - `positions`: 持仓列表，每项包含：
      - `stock_code`: 股票代码（如：0700.HK）
      - `buy_price`: 买入价格
      - `quantity`: 持仓数量（股）
      - `buy_date`: 买入日期（可选，格式：YYYY-MM-DD）
    - `analysis_depth`: 分析深度（quick=快速，standard=标准，deep=深度）
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
        logger.info(f"[AI] 收到持仓分析请求：{len(request.positions)} 只股票，depth={request.analysis_depth}")

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
        logger.error(f"[AI] 持仓分析请求参数错误：{str(e)}")
        raise ApiException(
            msg=str(e),
            code=ResponseCode.BAD_REQUEST
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[AI] 持仓分析失败：{str(e)}")
        raise ApiException(
            msg=f"分析失败：{str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


# ==================== K 线分析接口（通用，无需认证） ====================

@router.post("/analyze-kline", summary="AI 分析 K 线（无需认证）")
async def analyze_kline(request: KlineAnalysisRequest):
    """
    AI 分析 K 线（**无需认证**，通用接口）

    此接口基于用户提供的 K 线数据进行技术分析：
    1. 趋势判断（上涨/下跌/横盘）
    2. 技术点位（支撑位、压力位、止损位、止盈位）
    3. 买卖建议（强烈买入/买入/持有/卖出/强烈卖出）
    4. 风险评估（低/中/高）
    5. 目标价格区间

    **特点：**
    - 无需数据库，所有数据由调用方提供
    - 无需认证，方便 Java 等服务调用
    - 支持 LLM 供应商和模型切换

    **请求参数：**
    - `stock_code`: 股票代码（如：0700.HK, 09868.HK）
    - `stock_info`: 股票基本信息（可选，包含公司名称、行业等）
    - `current_price`: 当前价格（可选，不传则使用 K 线数据最新收盘价）
    - `kline_data`: K 线数据列表，每项包含：
      - `date`: 日期（格式：YYYY-MM-DD）
      - `open`: 开盘价
      - `high`: 最高价
      - `low`: 最低价
      - `close`: 收盘价
      - `volume`: 成交量
      - `amount`: 成交额（可选）
    - `period`: 周期类型（daily=日线，weekly=周线，monthly=月线）
    - `provider`: LLM 供应商（可选：doubao, openai, qwen 等）
    - `model`: 模型名称（可选，不指定则使用供应商默认模型）

    **示例请求：**
    ```json
    {
      "stock_code": "0700.HK",
      "stock_info": {
        "stock_code": "0700.HK",
        "company_name": "腾讯控股有限公司",
        "industry": "互联网"
      },
      "current_price": 446.0,
      "kline_data": [
        {
          "date": "2026-02-20",
          "open": 420.5,
          "high": 428.0,
          "low": 418.0,
          "close": 425.6,
          "volume": 15000000,
          "amount": 6350000000
        },
        {
          "date": "2026-02-21",
          "open": 426.0,
          "high": 432.5,
          "low": 424.0,
          "close": 430.2,
          "volume": 18000000,
          "amount": 7720000000
        }
      ],
      "period": "daily",
      "provider": "doubao",
      "model": "ep-20250226185244-dxp9w"
    }
    ```

    **返回结果示例：**
    ```json
    {
      "stock_code": "0700.HK",
      "current_price": "446.0",
      "trend": "uptrend",
      "trend_description": "近期连续突破多个压力位，呈现明显上涨趋势",
      "technical_points": [
        {
          "type": "support",
          "price": "438.0",
          "strength": 4,
          "description": "前期高点形成的支撑位"
        },
        {
          "type": "resistance",
          "price": "455.0",
          "strength": 3,
          "description": "前期高点形成的压力位"
        }
      ],
      "recommendation": "buy",
      "recommendation_reason": "技术面突破，成交量配合，建议买入",
      "risk_level": "medium",
      "target_price_range": "455-465",
      "analysis_note": "以上分析基于技术指标，仅供参考"
    }
    ```
    """
    try:
        logger.info(
            f"[Kline] 收到 K 线分析请求：{request.stock_code}, 数据条数={len(request.kline_data)}, provider={request.provider}, model={request.model}")

        # 验证 K 线数据
        if not request.kline_data or len(request.kline_data) < 5:
            raise ValueError("K 线数据不足，请提供至少 5 条 K 线数据")

        # 创建分析服务（无需数据库）
        kline_analysis_service = StockKlineAnalysisService()

        # 执行 K 线分析
        result = await kline_analysis_service.analyze_kline(
            stock_code=request.stock_code,
            kline_data=request.kline_data,
            stock_info=request.stock_info,
            current_price=request.current_price,
            period=request.period,
            provider=request.provider,
            model=request.model
        )

        return success_response(
            data=result,
            msg=f"股票 {request.stock_code} K 线分析完成"
        )

    except ValueError as e:
        logger.error(f"[Kline] 分析请求参数错误：{str(e)}")
        raise ApiException(
            msg=str(e),
            code=ResponseCode.BAD_REQUEST
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[Kline] 分析 K 线失败：{str(e)}")
        raise ApiException(
            msg=f"分析失败：{str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


# ==================== 港股市场分析接口 ====================

@router.post("/analyze-hkstock-market", summary="AI 分析港股市场")
async def analyze_hkstock_market(
        request: HKStockMarketAnalysisRequest,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    AI 分析港股市场新闻，给出投资建议（需要认证）

    基于新浪财经爬取的港股新闻（要闻 + 大行研报 + 公司新闻），
    通过 LLM 分析最近的投资方向、政策变动、经济状况等，
    并提供投资策略建议

    **分析维度：**
    1. 市场要闻解读 - 热点话题、政策变动、宏观经济信号
    2. 行业趋势分析 - 机构关注方向、行业政策、产业链动态
    3. 大行观点汇总 - 投行评级倾向、重点推荐板块
    4. 公司动态分析 - 龙头企业动向、业绩披露、资本运作
    5. 风险因素识别 - 政策/市场/汇率/地缘政治风险
    6. 投资策略建议 - 仓位建议、配置方向、操作策略

    **请求参数：**
    - `provider`: LLM 供应商（可选：doubao, openai 等）
    - `model`: 模型名称（可选）

    **返回内容：**
    - `report`: Markdown 格式的投资建议报告
    - `news_summary`: 新闻摘要统计信息（新闻数量等）

    **示例请求：**
    ```json
    {
      "provider": "openai",
      "model": "gpt-4o-mini"
    }
    ```

    **返回示例：**
    ```markdown
    # 港股市场投资策略报告

    ## 一、市场要闻解读

    当前市场关注焦点集中在以下几个方面：
    - **政策面**：...
    - **宏观经济**：...

    ## 二、行业趋势分析

    ### 热门板块
    1. 科技股：...
    2. 金融股：...

    ## 三、投资策略建议

    - **总体仓位**：建议保持 70% 左右仓位
    - **重点配置**：...
    - **关注时点**：...
    ```
    """
    try:
        logger.info(f"[HKStockMarket] 收到港股市场分析请求，provider={request.provider}, model={request.model}")

        # 创建分析服务（需要 db 会话，但此功能不实际使用 db）
        analysis_service = StockAnalysisService(db)

        # 获取新闻数据并进行分析
        report = await analysis_service.analyze_hkstock_market(
            news_data=None,  # None 表示自动获取
            provider=request.provider,
            model=request.model
        )

        # 获取新闻统计信息（使用异步方法）
        crawler = SinaHKStockCrawler()
        news_data = await crawler.fetch_all_news()
        news_summary = news_data.get('summary', {})

        return success_response(
            data={
                "report": report,
                "news_summary": news_summary
            },
            msg="港股市场分析完成"
        )

    except ValueError as e:
        logger.error(f"[HKStockMarket] 分析请求参数错误：{str(e)}")
        raise ApiException(
            msg=str(e),
            code=ResponseCode.BAD_REQUEST
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[HKStockMarket] 分析港股市场失败：{str(e)}")
        raise ApiException(
            msg=f"分析失败：{str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )
