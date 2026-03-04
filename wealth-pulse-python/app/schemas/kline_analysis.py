"""
K 线分析相关的 Pydantic Schema
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from decimal import Decimal


# ==================== 请求模型 ====================

class KlineData(BaseModel):
    """K 线数据"""
    date: str = Field(..., description="日期", example="2026-02-24")
    open: Decimal = Field(..., description="开盘价", example="150.5")
    high: Decimal = Field(..., description="最高价", example="155.0")
    low: Decimal = Field(..., description="最低价", example="149.0")
    close: Decimal = Field(..., description="收盘价", example="152.3")
    volume: int = Field(..., description="成交量", example="1000000")
    amount: Optional[Decimal] = Field(None, description="成交额", example="152300000")


class StockInfo(BaseModel):
    """股票基本信息（可选）"""
    stock_code: str = Field(..., description="股票代码", example="03900.HK")
    company_name: Optional[str] = Field(None, description="公司名称", example="腾讯控股有限公司")
    industry: Optional[str] = Field(None, description="所属行业", example="互联网")
    market_cap: Optional[str] = Field(None, description="市值", example="5000 亿")


class KlineAnalysisRequest(BaseModel):
    """K 线分析请求"""
    stock_code: str = Field(..., description="股票代码", example="03900.HK")
    stock_info: Optional[StockInfo] = Field(None, description="股票基本信息（可选）")
    current_price: Optional[Decimal] = Field(None, description="当前价格（可选，不传则使用 K 线数据最新收盘价）")
    kline_data: List[KlineData] = Field(..., description="K 线数据列表", min_length=1)
    period: str = Field(default="daily", description="分析周期", example="daily")
    provider: Optional[str] = Field(default=None, description="LLM 供应商：doubao/openai/qwen 等")
    model: Optional[str] = Field(default=None, description="模型名称，如：gpt-4o-mini, ep-xxx, qwen-turbo")


# ==================== 响应模型 ====================

class TechnicalPointVo(BaseModel):
    """技术点位"""
    type: str = Field(..., description="类型：support=支撑位，resistance=压力位，stop_loss=止损位，take_profit=止盈位", example="support")
    price: str = Field(..., description="价格", example="145.5")
    strength: int = Field(..., description="强度 (1-5)", example="4", ge=1, le=5)
    description: str = Field(..., description="描述", example="前期低点形成的支撑位")


class KlineAnalysisVo(BaseModel):
    """K 线分析结果"""
    stock_code: str = Field(default="", description="股票代码", example="03900.HK")
    current_price: str = Field(default="0", description="当前价格", example="152.3")
    trend: str = Field(default="unknown", description="趋势判断：uptrend=上涨趋势，downtrend=下跌趋势，sideways=横盘整理", example="uptrend")
    trend_description: str = Field(default="暂无分析", description="趋势说明", example="近期连续突破多个压力位，呈现明显上涨趋势")
    technical_points: List[TechnicalPointVo] = Field(default_factory=list, description="技术点位列表")
    recommendation: str = Field(default="hold", description="综合建议：strong_buy=强烈买入，buy=买入，hold=持有，sell=卖出，strong_sell=强烈卖出", example="buy")
    recommendation_reason: str = Field(default="暂无分析", description="建议说明", example="技术面突破，成交量配合，建议买入")
    risk_level: str = Field(default="medium", description="风险等级：low=低，medium=中，high=高", example="medium")
    target_price_range: str = Field(default="N/A", description="目标价格区间", example="160-170")
    analysis_note: str = Field(default="以上分析基于技术指标，仅供参考", description="分析说明", example="以上分析基于技术指标，仅供参考")


# ==================== 辅助模型 ====================

class KlineTrendStats(BaseModel):
    """K 线趋势统计"""
    highest_price: Decimal = Field(..., description="最高价")
    lowest_price: Decimal = Field(..., description="最低价")
    average_price: Decimal = Field(..., description="平均价")
    price_change_percent: Decimal = Field(..., description="价格变化百分比")
    average_volume: int = Field(..., description="平均成交量")
    volatility: Decimal = Field(..., description="波动率")
