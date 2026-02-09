from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
import logging

from app.db.session import SessionLocal
from app.services.yfinance_service import yfinance_service
from app.services.stock_service import StockService
from app.db.redis import RedisClient
from app.core.config import settings

logger = logging.getLogger(__name__)

# List of stocks to monitor (yfinance format)
MONITORED_STOCKS = [
    '0700.HK',  # Tencent
    '9988.HK',  # Alibaba
    '0941.HK',  # China Mobile
    '1299.HK',  # AIA
    '0960.HK',  # Longfor Group
    '2018.HK',  # AAC Tech
    '1876.HK',  # Budweiser APAC
    '1024.HK',  # BOE Visual Technology
    '2020.HK',  # ANTA Sports
    '0883.HK',  # CNOOC
    'NVDA',     # NVIDIA
    'AAPL',     # Apple
    'MSFT',     # Microsoft
    'TSLA',     # Tesla
]


class MarketDataScheduler:
    """Scheduler for updating market data"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.redis_client = None

    async def update_market_data(self):
        """Update market data for all monitored stocks"""
        logger.info("Starting market data update...")

        db: Session = SessionLocal()

        try:
            for symbol in MONITORED_STOCKS:
                try:
                    # Get stock info
                    stock_info = yfinance_service.get_stock_info(symbol)
                    if stock_info:
                        stock_service = StockService(db)
                        stock = stock_service.get_or_create_stock(stock_info)
                        logger.info(f"Updated stock info: {symbol} - {stock.stock_code}")

                    # Get market data
                    market_data = yfinance_service.get_market_data(symbol)
                    if market_data and stock_info:
                        stock_service = StockService(db)
                        stock_service.update_market_data(stock_info['stock_code'], market_data)
                        logger.info(f"Updated market data: {stock_info['stock_code']}")

                    # Cache in Redis
                    if self.redis_client and market_data:
                        cache_key = f"market_data:{market_data['stock_code']}"
                        import json
                        self.redis_client.setex(
                            cache_key,
                            settings.MARKET_DATA_UPDATE_INTERVAL,
                            json.dumps(market_data, default=str)
                        )

                except Exception as e:
                    logger.error(f"Error updating {symbol}: {str(e)}")
                    continue

            logger.info("Market data update completed")

        except Exception as e:
            logger.error(f"Error in market data update: {str(e)}")
        finally:
            db.close()

    async def update_historical_data(self):
        """Update historical data (run daily)"""
        logger.info("Starting historical data update...")

        db: Session = SessionLocal()

        try:
            stock_service = StockService(db)

            for symbol in MONITORED_STOCKS:
                try:
                    # Get stock info to get stock_code
                    stock_info = yfinance_service.get_stock_info(symbol)
                    if not stock_info:
                        continue

                    stock = stock_service.get_stock_by_code(stock_info['stock_code'])
                    if not stock:
                        # Create stock first
                        stock = stock_service.get_or_create_stock(stock_info)

                    # Get historical data for the last month
                    hist_df = yfinance_service.get_historical_data(symbol, period="1mo", interval="1d")

                    if hist_df is not None:
                        for _, row in hist_df.iterrows():
                            hist_data = {
                                'trade_date': row['trade_date'],
                                'open_price': float(row['open_price']) if row['open_price'] else None,
                                'high_price': float(row['high_price']) if row['high_price'] else None,
                                'low_price': float(row['low_price']) if row['low_price'] else None,
                                'close_price': float(row['close_price']) if row['close_price'] else None,
                                'adj_close': float(row['adj_close']) if row['adj_close'] else None,
                                'volume': int(row['volume']) if row['volume'] else None,
                            }
                            stock_service.save_historical_data(stock.stock_code, hist_data)

                        logger.info(f"Updated historical data: {stock.stock_code}")

                except Exception as e:
                    logger.error(f"Error updating historical data for {symbol}: {str(e)}")
                    continue

            logger.info("Historical data update completed")

        except Exception as e:
            logger.error(f"Error in historical data update: {str(e)}")
        finally:
            db.close()

    def start(self):
        """Start the scheduler"""
        if not settings.SCHEDULER_ENABLED:
            logger.info("Scheduler is disabled")
            return

        try:
            self.redis_client = RedisClient.get_client()

            # Schedule market data updates every 5 minutes
            self.scheduler.add_job(
                self.update_market_data,
                trigger=IntervalTrigger(seconds=settings.MARKET_DATA_UPDATE_INTERVAL),
                id='market_data_update',
                name='Update Market Data',
                replace_existing=True
            )

            # Schedule historical data updates daily at 6 AM
            self.scheduler.add_job(
                self.update_historical_data,
                trigger='cron',
                hour=6,
                minute=0,
                id='historical_data_update',
                name='Update Historical Data',
                replace_existing=True
            )

            self.scheduler.start()
            logger.info("Scheduler started successfully")

        except Exception as e:
            logger.error(f"Error starting scheduler: {str(e)}")

    def shutdown(self):
        """Shutdown the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduler shutdown")

        if self.redis_client:
            RedisClient.close()


# Global scheduler instance
scheduler = MarketDataScheduler()
