from sqlalchemy import Column, String, Float, DateTime, Date, Integer, BigInteger, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base
from datetime import datetime


class StockIndexMarketData(Base):
    """
    股票市场指数行情数据

    支持港股指数 (HK) 和 A 股指数 (SH/SZ)
    数据来源：AkShare (东方财富/新浪财经)
    """
    __tablename__ = "tb_stock_index_market_data"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, comment="行情 ID")
    index_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True, comment="指数代码 (如：HSI, CSI300)")
    index_name: Mapped[str | None] = mapped_column(String(100), comment="指数名称")
    index_type: Mapped[str | None] = mapped_column(String(20), default="HK", comment="指数类型：HK=港股指数，SH/SZ=A 股指数")

    # 行情数据
    last_price: Mapped[float | None] = mapped_column(Float(20), comment="最新价")
    change_number: Mapped[float | None] = mapped_column(Float(20), comment="涨跌额")
    change_rate: Mapped[float | None] = mapped_column(Float(10), comment="涨跌幅 (%)")
    open_price: Mapped[float | None] = mapped_column(Float(20), comment="开盘价")
    pre_close: Mapped[float | None] = mapped_column(Float(20), comment="前收盘价")
    high_price: Mapped[float | None] = mapped_column(Float(20), comment="当日最高价")
    low_price: Mapped[float | None] = mapped_column(Float(20), comment="当日最低价")
    volume: Mapped[int | None] = mapped_column(BigInteger, comment="成交量 (股/手)")
    turnover: Mapped[float | None] = mapped_column(Float(30), comment="成交额")
    market_cap: Mapped[float | None] = mapped_column(Float(30), comment="总市值")

    # 扩展数据
    week52_high: Mapped[float | None] = mapped_column(Float(20), comment="52 周最高")
    week52_low: Mapped[float | None] = mapped_column(Float(20), comment="52 周最低")
    pe_ratio: Mapped[float | None] = mapped_column(Float(10), comment="市盈率")
    pb_ratio: Mapped[float | None] = mapped_column(Float(10), comment="市净率")
    dividend_yield: Mapped[float | None] = mapped_column(Float(10), comment="股息率 (%)")

    # 时间信息
    quote_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, comment="行情时间")
    market_date: Mapped[Date] = mapped_column(Date, nullable=False, comment="交易日")

    # 数据来源
    data_source: Mapped[str | None] = mapped_column(String(50), comment="数据来源：akshare_em/sina")

    # 扩展字段 (JSON 格式)
    index_str: Mapped[dict | None] = mapped_column(JSON, comment="扩展指标 (JSON 格式)")


class StockIndexHistory(Base):
    """
    股票市场指数历史行情数据

    支持港股指数和 A 股指数的日线/周线/月线历史数据
    """
    __tablename__ = "tb_stock_index_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, comment="历史行情 ID")
    index_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True, comment="指数代码 (如：HSI, CSI300)")
    index_type: Mapped[str | None] = mapped_column(String(20), default="HK", comment="指数类型：HK=港股指数，SH/SZ=A 股指数")

    # 周期信息
    period: Mapped[str] = mapped_column(String(20), default="daily", comment="周期类型：daily=日线, weekly=周线, monthly=月线")
    trade_date: Mapped[Date] = mapped_column(Date, nullable=False, index=True, comment="交易日期")

    # 行情数据
    open_price: Mapped[float | None] = mapped_column(Float(20), comment="开盘价")
    high_price: Mapped[float | None] = mapped_column(Float(20), comment="最高价")
    low_price: Mapped[float | None] = mapped_column(Float(20), comment="最低价")
    close_price: Mapped[float | None] = mapped_column(Float(20), comment="收盘价")
    volume: Mapped[int | None] = mapped_column(BigInteger, comment="成交量 (股/手)")
    turnover: Mapped[float | None] = mapped_column(Float(30), comment="成交额")

    # 涨跌幅相关
    change_number: Mapped[float | None] = mapped_column(Float(20), comment="涨跌额")
    change_rate: Mapped[float | None] = mapped_column(Float(10), comment="涨跌幅 (%)")
    amplitude: Mapped[float | None] = mapped_column(Float(10), comment="振幅 (%)")

    # 数据来源
    data_source: Mapped[str | None] = mapped_column(String(50), comment="数据来源")
