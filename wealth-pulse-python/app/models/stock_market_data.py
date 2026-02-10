from sqlalchemy import Column, String, Float, DateTime, Date, Integer, BigInteger, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class StockMarketData(Base):
    __tablename__ = "tb_stock_market_data"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, comment="行情ID")
    stock_code: Mapped[str] = mapped_column(String(10), nullable=False, comment="股票代码(如: NVDA.US)")
    last_price: Mapped[float | None] = mapped_column(Float(20), comment="最新价")
    change_number: Mapped[float | None] = mapped_column(Float(20), comment="涨跌额")
    change_rate: Mapped[float | None] = mapped_column(Float(10), comment="涨跌幅(%)")
    open_price: Mapped[float | None] = mapped_column(Float(20), comment="开盘价")
    pre_close: Mapped[float | None] = mapped_column(Float(20), comment="前收盘价")
    high_price: Mapped[float | None] = mapped_column(Float(20), comment="当日最高价")
    low_price: Mapped[float | None] = mapped_column(Float(20), comment="当日最低价")
    volume: Mapped[int | None] = mapped_column(BigInteger, comment="成交量(股)")
    turnover: Mapped[float | None] = mapped_column(Float(20), comment="成交额")
    week52_high: Mapped[float | None] = mapped_column(Float(20), comment="52周最高")
    week52_low: Mapped[float | None] = mapped_column(Float(20), comment="52周最低")
    market_cap: Mapped[float | None] = mapped_column(Float(30), comment="总市值")
    pe_ratio: Mapped[float | None] = mapped_column(Float(10), comment="市盈率")
    pb_ratio: Mapped[float | None] = mapped_column(Float(10), comment="市净率")
    quote_time: Mapped[DateTime] = mapped_column(DateTime, nullable=False, comment="行情时间")
    market_date: Mapped[Date] = mapped_column(Date, nullable=False, comment="交易日")
    data_source: Mapped[str | None] = mapped_column(String(50), comment="数据来源")
    index_str: Mapped[dict | None] = mapped_column(JSON, comment="扩展指标(JSON格式)")
