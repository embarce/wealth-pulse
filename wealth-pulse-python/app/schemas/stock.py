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


class StockMarketHistoryEnhancedBase(BaseModel):
    """港股增强型历史数据（来自 AkShare stock_hk_hist 接口）"""
    stock_code: str = Field(..., description="股票代码")
    period: str = Field(default='daily', description="周期类型: daily=日线, weekly=周线, monthly=月线")
    trade_date: date = Field(..., description="交易日期")
    open_price: Optional[float] = Field(None, description="开盘价(港元)")
    close_price: Optional[float] = Field(None, description="收盘价(港元)")
    high_price: Optional[float] = Field(None, description="最高价(港元)")
    low_price: Optional[float] = Field(None, description="最低价(港元)")
    volume: Optional[int] = Field(None, description="成交量(股)")
    turnover: Optional[float] = Field(None, description="成交额(港元)")
    amplitude: Optional[float] = Field(None, description="振幅(%)")
    change_rate: Optional[float] = Field(None, description="涨跌幅(%)")
    change_number: Optional[float] = Field(None, description="涨跌额(港元)")
    turnover_rate: Optional[float] = Field(None, description="换手率(%)")


class StockMarketHistoryEnhancedResponse(StockMarketHistoryEnhancedBase):
    """港股增强型日线历史数据响应模型"""
    class Config:
        from_attributes = True


class StockSecurityProfileBase(BaseModel):
    """港股证券资料（来自 AkShare stock_hk_security_profile_em 接口）"""
    stock_code: str = Field(..., description="证券代码")
    security_name: str = Field(..., description="证券简称")
    listing_date: Optional[str] = Field(None, description="上市日期")
    security_type: Optional[str] = Field(None, description="证券类型")
    issue_price: Optional[float] = Field(None, description="发行价")
    issue_volume: Optional[int] = Field(None, description="发行量(股)")
    lot_size: Optional[int] = Field(None, description="每手股数")
    par_value: Optional[str] = Field(None, description="每股面值")
    exchange: Optional[str] = Field(None, description="交易所")
    sector: Optional[str] = Field(None, description="板块")
    year_end_date: Optional[str] = Field(None, description="年结日")
    isin_code: Optional[str] = Field(None, description="ISIN（国际证券识别编码）")
    is_sh_hk_stock: Optional[str] = Field(None, description="是否沪港通标的")


class StockSecurityProfileResponse(StockSecurityProfileBase):
    """港股证券资料响应模型"""
    class Config:
        from_attributes = True


class StockCompanyProfileBase(BaseModel):
    """港股公司资料（来自 AkShare stock_hk_company_profile_em 接口）"""
    stock_code: str = Field(..., description="证券代码")
    company_name: str = Field(..., description="公司名称")
    company_name_en: str = Field(..., description="英文名称")
    registration_place: Optional[str] = Field(None, description="注册地")
    establishment_date: Optional[str] = Field(None, description="公司成立日期")
    industry: Optional[str] = Field(None, description="所属行业")
    chairman: Optional[str] = Field(None, description="董事长")
    company_secretary: Optional[str] = Field(None, description="公司秘书")
    employee_count: Optional[int] = Field(None, description="员工人数")
    office_address: Optional[str] = Field(None, description="办公地址")
    website: Optional[str] = Field(None, description="公司网址")
    email: Optional[str] = Field(None, description="E-MAIL")
    year_end_date: Optional[str] = Field(None, description="年结日")
    phone: Optional[str] = Field(None, description="联系电话")
    auditor: Optional[str] = Field(None, description="核数师")
    fax: Optional[str] = Field(None, description="传真")
    company_introduction: Optional[str] = Field(None, description="公司介绍")


class StockCompanyProfileResponse(StockCompanyProfileBase):
    """港股公司资料响应模型"""
    class Config:
        from_attributes = True


class StockFinancialIndicatorBase(BaseModel):
    """港股财务指标（来自 AkShare stock_hk_financial_indicator_em 接口）"""
    stock_code: str = Field(..., description="证券代码")
    basic_eps: Optional[str] = Field(None, description="基本每股收益(元)")
    net_assets_per_share: Optional[str] = Field(None, description="每股净资产(元)")
    legal_capital: Optional[str] = Field(None, description="法定股本(股)")
    lot_size: Optional[str] = Field(None, description="每手股")
    dividend_per_share_ttm: Optional[str] = Field(None, description="每股股息TTM(港元)")
    payout_ratio: Optional[str] = Field(None, description="派息比率(%)")
    issued_capital: Optional[str] = Field(None, description="已发行股本(股)")
    issued_capital_h_shares: Optional[int] = Field(None, description="已发行股本-H股(股)")
    operating_cash_flow_per_share: Optional[str] = Field(None, description="每股经营现金流(元)")
    dividend_yield_ttm: Optional[str] = Field(None, description="股息率TTM(%)")
    total_market_cap_hkd: Optional[str] = Field(None, description="总市值(港元)")
    hk_market_cap_hkd: Optional[str] = Field(None, description="港股市值(港元)")
    total_operating_revenue: Optional[str] = Field(None, description="营业总收入")
    operating_revenue_growth_yoy: Optional[str] = Field(None, description="营业总收入滚动环比增长(%)")
    net_profit_margin: Optional[str] = Field(None, description="销售净利率(%)")
    net_profit: Optional[str] = Field(None, description="净利润")
    net_profit_growth_yoy: Optional[str] = Field(None, description="净利润滚动环比增长(%)")
    roe: Optional[str] = Field(None, description="股东权益回报率(%)")
    pe_ratio: Optional[str] = Field(None, description="市盈率")
    pb_ratio: Optional[str] = Field(None, description="市净率")
    roa: Optional[str] = Field(None, description="总资产回报率(%)")


class StockFinancialIndicatorResponse(StockFinancialIndicatorBase):
    """港股财务指标响应模型"""
    class Config:
        from_attributes = True


class StockMinuteHistoryBase(BaseModel):
    """港股分钟级历史数据"""
    trade_time: datetime = Field(..., description="交易时间")
    stock_code: str = Field(..., description="股票代码")
    period: str = Field(..., description="周期: 1=1分钟, 5=5分钟, 15=15分钟, 30=30分钟, 60=60分钟")

    # 基础字段
    open_price: Optional[float] = Field(None, description="开盘价(港元)")
    close_price: Optional[float] = Field(None, description="收盘价(港元)")
    high_price: Optional[float] = Field(None, description="最高价(港元)")
    low_price: Optional[float] = Field(None, description="最低价(港元)")

    # 1分钟数据字段
    latest_price: Optional[float] = Field(None, description="最新价(港元)")

    # 其他周期字段
    change_rate: Optional[float] = Field(None, description="涨跌幅(%)")
    change_number: Optional[float] = Field(None, description="涨跌额(港元)")
    amplitude: Optional[float] = Field(None, description="振幅(%)")
    turnover_rate: Optional[float] = Field(None, description="换手率(%)")

    # 通用字段
    volume: Optional[float] = Field(None, description="成交量(股)")
    turnover: Optional[float] = Field(None, description="成交额(港元)")


class StockMinuteHistoryResponse(StockMinuteHistoryBase):
    """港股分钟级历史数据响应模型"""
    class Config:
        from_attributes = True


