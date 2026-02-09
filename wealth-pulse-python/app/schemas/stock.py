from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional


class StockInfoBase(BaseModel):
    stock_code: str = Field(..., description="股票代码(如: NVDA.US)")
    company_name: str = Field(..., description="公司全名")
    short_name: Optional[str] = Field(None, description="公司简称")
    stock_type: str = Field(default="STOCK", description="股票类型: STOCK/ETF/BOND/INDEX等")
    exchange: Optional[str] = Field(None, description="交易所: NASDAQ/NYSE/SH/SZ/HK等")
    currency: str = Field(default="USD", description="交易货币: USD/HKD/CNY等")
    industry: Optional[str] = Field(None, description="行业分类")
    market_cap: Optional[str] = Field(None, description="市值")
    display_order: int = Field(default=0, description="显示顺序")
    stock_status: int = Field(default=1, description="状态: 1-正常交易")


class StockInfoCreate(StockInfoBase):
    pass


class StockInfoResponse(StockInfoBase):
    class Config:
        from_attributes = True


class StockMarketDataBase(BaseModel):
    stock_code: str = Field(..., description="股票代码(如: NVDA.US)")
    last_price: Optional[float] = Field(None, description="最新价")
    change_number: Optional[float] = Field(None, description="涨跌额")
    change_rate: Optional[float] = Field(None, description="涨跌幅(%)")
    open_price: Optional[float] = Field(None, description="开盘价")
    pre_close: Optional[float] = Field(None, description="前收盘价")
    high_price: Optional[float] = Field(None, description="当日最高价")
    low_price: Optional[float] = Field(None, description="当日最低价")
    volume: Optional[int] = Field(None, description="成交量(股)")
    turnover: Optional[float] = Field(None, description="成交额")
    day_low: Optional[float] = Field(None, description="日内最低(L)")
    day_high: Optional[float] = Field(None, description="日内最高(N)")
    price_range_percent: Optional[float] = Field(None, description="价格区间百分比")
    week52_high: Optional[float] = Field(None, description="52周最高")
    week52_low: Optional[float] = Field(None, description="52周最低")
    market_cap: Optional[float] = Field(None, description="总市值")
    pe_ratio: Optional[float] = Field(None, description="市盈率")
    pb_ratio: Optional[float] = Field(None, description="市净率")
    quote_time: datetime = Field(..., description="行情时间")
    market_date: date = Field(..., description="交易日")
    data_source: Optional[str] = Field(None, description="数据来源")
    bid_price: Optional[float] = Field(None, description="买一价")
    ask_price: Optional[float] = Field(None, description="卖一价")
    bid_size: Optional[int] = Field(None, description="买一量")
    ask_size: Optional[int] = Field(None, description="卖一量")
    index_str: Optional[dict] = Field(None, description="扩展指标(JSON格式)")


class StockMarketDataCreate(StockMarketDataBase):
    pass


class StockMarketDataResponse(StockMarketDataBase):
    id: int

    class Config:
        from_attributes = True


class StockMarketHistoryBase(BaseModel):
    stock_code: str
    trade_date: date
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    close_price: Optional[float] = None
    adj_close: Optional[float] = None
    volume: Optional[int] = None


class StockMarketHistoryResponse(StockMarketHistoryBase):
    id: int

    class Config:
        from_attributes = True
