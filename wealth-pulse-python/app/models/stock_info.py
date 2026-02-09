from sqlalchemy import Column, String, Integer, BigInteger
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class StockInfo(Base):
    __tablename__ = "tb_stock_info"

    stock_code: Mapped[str] = mapped_column(String(20), primary_key=True, comment="股票代码(如: NVDA.US)")
    company_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="公司全名")
    short_name: Mapped[str | None] = mapped_column(String(50), comment="公司简称")
    stock_type: Mapped[str] = mapped_column(String(20), nullable=False, default="STOCK", comment="股票类型: STOCK/ETF/BOND/INDEX等")
    exchange: Mapped[str | None] = mapped_column(String(20), comment="交易所: NASDAQ/NYSE/SH/SZ/HK等")
    currency: Mapped[str] = mapped_column(String(10), default="USD", comment="交易货币: USD/HKD/CNY等")
    industry: Mapped[str | None] = mapped_column(String(50), comment="行业分类")
    market_cap: Mapped[str | None] = mapped_column(String(255), comment="市值")
    display_order: Mapped[int] = mapped_column(Integer, default=0, comment="显示顺序")
    stock_status: Mapped[int] = mapped_column(Integer, default=1, comment="状态: 1-正常交易")
