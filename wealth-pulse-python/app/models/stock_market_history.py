from sqlalchemy import Column, String, Float, Date, BigInteger
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class StockMarketHistory(Base):
    __tablename__ = "tb_stock_market_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, comment="History ID")
    stock_code: Mapped[str] = mapped_column(String(20), nullable=False, comment="股票代码")
    trade_date: Mapped[Date] = mapped_column(Date, nullable=False, comment="交易日期")
    open_price: Mapped[float | None] = mapped_column(Float(20), comment="开盘价")
    high_price: Mapped[float | None] = mapped_column(Float(20), comment="最高价")
    low_price: Mapped[float | None] = mapped_column(Float(20), comment="最低价")
    close_price: Mapped[float | None] = mapped_column(Float(20), comment="收盘价")
    adj_close: Mapped[float | None] = mapped_column(Float(20), comment="复权收盘价")
    volume: Mapped[int | None] = mapped_column(BigInteger, comment="成交量")
