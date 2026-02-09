from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime, date

from app.models.stock_info import StockInfo
from app.models.stock_market_data import StockMarketData
from app.models.stock_market_history import StockMarketHistory
from app.schemas.stock import StockInfoCreate, StockMarketDataCreate
import logging

logger = logging.getLogger(__name__)


class StockService:
    """Service for managing stock data in database"""

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_stock(self, stock_data: dict) -> StockInfo:
        """Get existing stock or create new one"""
        stock = self.db.query(StockInfo).filter(
            StockInfo.stock_code == stock_data['stock_code']
        ).first()

        if stock:
            # Update stock info
            for key, value in stock_data.items():
                if key != 'stock_code' and hasattr(stock, key):
                    setattr(stock, key, value)
        else:
            # Create new stock
            stock = StockInfo(**stock_data)
            self.db.add(stock)

        self.db.commit()
        self.db.refresh(stock)
        return stock

    def update_market_data(self, stock_code: str, market_data: dict) -> StockMarketData:
        """Update or create market data for today"""
        today = date.today()

        # Check if data exists for this stock and today
        data = self.db.query(StockMarketData).filter(
            and_(
                StockMarketData.stock_code == stock_code,
                StockMarketData.market_date == today
            )
        ).first()

        if data:
            # Update existing data
            for key, value in market_data.items():
                if key not in ['stock_code', 'market_date'] and hasattr(data, key):
                    setattr(data, key, value)
        else:
            # Create new market data
            market_data['stock_code'] = stock_code
            data = StockMarketData(**market_data)
            self.db.add(data)

        self.db.commit()
        self.db.refresh(data)
        return data

    def save_historical_data(self, stock_code: str, hist_data: dict) -> StockMarketHistory:
        """Save historical data point"""
        # Check if data already exists for this date
        existing = self.db.query(StockMarketHistory).filter(
            and_(
                StockMarketHistory.stock_code == stock_code,
                StockMarketHistory.trade_date == hist_data['trade_date']
            )
        ).first()

        if existing:
            # Update existing record
            for key, value in hist_data.items():
                if key != 'trade_date' and hasattr(existing, key):
                    setattr(existing, key, value)
            history = existing
        else:
            # Create new record
            history_data = {
                'stock_code': stock_code,
                **hist_data
            }
            history = StockMarketHistory(**history_data)
            self.db.add(history)

        self.db.commit()
        self.db.refresh(history)
        return history

    def get_all_stocks(self, skip: int = 0, limit: int = 100) -> List[StockInfo]:
        """Get all stocks"""
        return self.db.query(StockInfo).filter(
            StockInfo.stock_status == 1
        ).offset(skip).limit(limit).all()

    def get_stock_by_code(self, stock_code: str) -> Optional[StockInfo]:
        """Get stock by stock_code"""
        return self.db.query(StockInfo).filter(
            and_(
                StockInfo.stock_code == stock_code,
                StockInfo.stock_status == 1
            )
        ).first()

    def get_market_data(self, stock_code: str, market_date: Optional[date] = None) -> Optional[StockMarketData]:
        """Get market data for stock_code and date"""
        if market_date is None:
            market_date = date.today()

        return self.db.query(StockMarketData).filter(
            and_(
                StockMarketData.stock_code == stock_code,
                StockMarketData.market_date == market_date
            )
        ).first()

    def get_latest_market_data(self, stock_code: str) -> Optional[StockMarketData]:
        """Get latest market data for stock_code"""
        return self.db.query(StockMarketData).filter(
            StockMarketData.stock_code == stock_code
        ).order_by(StockMarketData.quote_time.desc()).first()

    def get_historical_data(
        self,
        stock_code: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100
    ) -> List[StockMarketHistory]:
        """Get historical data for stock_code"""
        query = self.db.query(StockMarketHistory).filter(
            StockMarketHistory.stock_code == stock_code
        )

        if start_date:
            query = query.filter(StockMarketHistory.trade_date >= start_date)
        if end_date:
            query = query.filter(StockMarketHistory.trade_date <= end_date)

        return query.order_by(
            StockMarketHistory.trade_date.desc()
        ).limit(limit).all()
