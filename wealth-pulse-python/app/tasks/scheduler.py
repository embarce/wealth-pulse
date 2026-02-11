from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
import logging

from app.db.session import SessionLocal
from app.services import (
    get_stock_data_provider,
    get_default_provider,
    reset_provider
)
from app.services.stock_data_provider_base import BaseStockDataProvider
from app.services.stock_service import StockService
from app.db.redis import RedisClient
from app.db.lock import distributed_lock
from app.core.config import settings

logger = logging.getLogger(__name__)


class MarketDataScheduler:
    """
    Scheduler for updating stock data.

    Jobs:
    1. Market Data Update - Every 5 minutes (only prices, volumes, etc.)
    2. Stock Info Update - Daily at 8 AM (only company names, industries, etc.)
    3. Historical Data Update - Daily at 6 AM (historical price data)

    Data Provider:
    - Automatically selected based on STOCK_DATA_PROVIDER environment variable
    - Supports 'yfinance' (default) and 'akshare'
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.redis_client = None
        self._data_provider: BaseStockDataProvider = None

    def _get_data_provider(self) -> BaseStockDataProvider:
        """
        Get the stock data provider based on environment configuration.

        Returns:
            BaseStockDataProvider instance
        """
        if self._data_provider is None:
            provider_type = getattr(settings, 'STOCK_DATA_PROVIDER', 'yfinance')
            logger.info(f"Initializing stock data provider: {provider_type}")
            self._data_provider = get_default_provider()
        return self._data_provider

    def _refresh_data_provider(self):
        """Force refresh the data provider (useful for config changes)"""
        reset_provider()
        self._data_provider = get_default_provider()
        logger.info(f"Data provider refreshed: {settings.STOCK_DATA_PROVIDER}")

    def _get_active_stock_symbols(self, db: Session) -> list[str]:
        """
        Get all active stock symbols from database.

        Returns:
            List of stock codes in yfinance format (e.g., '0700.HK', 'NVDA')
        """
        try:
            from app.models.stock_info import StockInfo

            # Query all active stocks
            stocks = db.query(StockInfo.stock_code).filter(
                StockInfo.stock_status == 1
            ).all()

            # Convert to yfinance format (remove .US suffix if exists)
            symbols = []
            for (stock_code,) in stocks:
                # Convert from stock_code format to yfinance symbol format
                # e.g., 'NVDA.US' -> 'NVDA', '0700.HK' -> '0700.HK'
                if stock_code.endswith('.US'):
                    symbol = stock_code[:-3]
                else:
                    symbol = stock_code
                symbols.append(symbol)

            logger.info(f"Found {len(symbols)} active stocks in database")
            return symbols

        except Exception as e:
            logger.error(f"Error getting stock symbols from database: {str(e)}")
            return []

    async def update_market_data(self):
        """
        Update market data for all stocks in database (every 5 minutes).

        This job ONLY updates market_data (prices, volumes, etc.)
        It does NOT update stock_info (company names, industries, etc.)
        """
        # Use distributed lock to prevent concurrent updates
        lock_name = "market_data_refresh"
        lock_timeout = 600  # 10 minutes (should be longer than the actual task)

        try:
            with distributed_lock(lock_name, timeout=lock_timeout, blocking=False):
                logger.info("Starting market data update... (Lock acquired)")

                db: Session = SessionLocal()
                try:
                    import json

                    # Get symbols from database
                    symbols = self._get_active_stock_symbols(db)

                    if not symbols:
                        logger.warning("No active stocks found in database")
                        return

                    # Get data provider
                    provider = self._get_data_provider()
                    provider_type = settings.STOCK_DATA_PROVIDER

                    logger.info(
                        f"Using '{provider_type}' provider for {len(symbols)} symbols "
                        f"(market_data update)"
                    )

                    # Use batch mode (optimized for all providers)
                    await self._update_market_data_batch(db, symbols, provider)

                    logger.info("Market data update completed")

                except Exception as e:
                    logger.error(f"Error in market data update: {str(e)}")
                finally:
                    db.close()

        except RuntimeError:
            # Failed to acquire lock (another instance is already running)
            logger.info(
                "Market data update is already running in another instance. "
                "Skipping this scheduled execution."
            )
        except Exception as e:
            logger.error(f"Unexpected error in market data update: {str(e)}")

    async def _update_market_data_batch(
        self,
        db: Session,
        symbols: list[str],
        provider: BaseStockDataProvider
    ):
        """
        Update market data using batch requests (recommended).

        Only updates market_data, does NOT update stock_info.

        Args:
            db: Database session
            symbols: List of stock symbols
            provider: Stock data provider instance
        """
        import json

        stock_service = StockService(db)

        # Get market data in batch
        logger.info(f"Fetching market data for {len(symbols)} symbols using {provider.__class__.__name__}")
        batch_results = provider.get_batch_market_data(symbols)

        # Process results
        success_count = 0
        for symbol, market_data in batch_results.items():
            try:
                if market_data:
                    stock_service.update_market_data(market_data['stock_code'], market_data)
                    logger.info(f"Updated market data: {market_data['stock_code']}")
                    success_count += 1

                    # Cache in Redis
                    if self.redis_client:
                        cache_key = f"market_data:{market_data['stock_code']}"
                        self.redis_client.setex(
                            cache_key,
                            settings.MARKET_DATA_UPDATE_INTERVAL,
                            json.dumps(market_data, default=str)
                        )
                else:
                    logger.warning(f"No market data available for {symbol}")

            except Exception as e:
                logger.error(f"Error updating market data for {symbol}: {str(e)}")
                continue

        logger.info(f"Batch market data update completed: {success_count}/{len(symbols)} succeeded")

    async def update_stock_info(self):
        """
        Update stock info for all stocks in database (daily at 8 AM).

        This job ONLY updates stock_info (company names, industries, etc.)
        It does NOT update market_data (prices, volumes, etc.)
        """
        # Use distributed lock to prevent concurrent updates
        lock_name = "stock_info_refresh"
        lock_timeout = 1800  # 30 minutes (stock_info updates may take longer)

        try:
            with distributed_lock(lock_name, timeout=lock_timeout, blocking=False):
                logger.info("Starting stock_info update... (Lock acquired)")

                db: Session = SessionLocal()
                try:
                    # Get data provider
                    provider = self._get_data_provider()
                    provider_type = settings.STOCK_DATA_PROVIDER

                    # Get symbols from database
                    symbols = self._get_active_stock_symbols(db)

                    if not symbols:
                        logger.warning("No active stocks found in database")
                        return

                    # Get stock info in batch
                    logger.info(
                        f"Fetching stock_info for {len(symbols)} symbols "
                        f"using '{provider_type}' provider"
                    )
                    batch_results = provider.get_batch_stock_info(symbols)

                    # Process results
                    success_count = 0
                    for symbol, stock_info in batch_results.items():
                        try:
                            if stock_info:
                                stock_service = StockService(db)
                                # Update existing stock info
                                stock = stock_service.get_stock_by_code(stock_info['stock_code'])

                                if stock:
                                    # Update existing stock
                                    stock.company_name = stock_info['company_name']
                                    stock.short_name = stock_info['short_name']
                                    stock.stock_type = stock_info['stock_type']
                                    stock.exchange = stock_info['exchange']
                                    stock.currency = stock_info['currency']
                                    stock.industry = stock_info['industry']
                                    stock.market_cap = stock_info['market_cap']
                                    db.commit()
                                    logger.debug(f"Updated stock info: {symbol} - {stock.stock_code}")
                                    success_count += 1
                                else:
                                    logger.warning(f"Stock {stock_info['stock_code']} not found in database")

                            else:
                                logger.warning(f"No stock info available for {symbol}")

                        except Exception as e:
                            logger.error(f"Error updating stock info for {symbol}: {str(e)}")
                            db.rollback()
                            continue

                    logger.info(f"Stock_info update completed: {success_count}/{len(symbols)} succeeded")

                except Exception as e:
                    logger.error(f"Error in stock_info update: {str(e)}")
                finally:
                    db.close()

        except RuntimeError:
            # Failed to acquire lock (another instance is already running)
            logger.info(
                "Stock_info update is already running in another instance. "
                "Skipping this scheduled execution."
            )
        except Exception as e:
            logger.error(f"Unexpected error in stock_info update: {str(e)}")

    async def update_historical_data(self):
        """Update historical data (run daily at 6 AM)"""
        # Use distributed lock to prevent concurrent updates
        lock_name = "historical_data_refresh"
        lock_timeout = 3600  # 1 hour (historical data may take longer)

        try:
            with distributed_lock(lock_name, timeout=lock_timeout, blocking=False):
                logger.info("Starting historical data update... (Lock acquired)")

                db: Session = SessionLocal()

                try:
                    # Get data provider
                    provider = self._get_data_provider()
                    provider_type = settings.STOCK_DATA_PROVIDER

                    stock_service = StockService(db)

                    # Get symbols from database
                    symbols = self._get_active_stock_symbols(db)

                    if not symbols:
                        logger.warning("No active stocks found in database")
                        return

                    logger.info(
                        f"Fetching historical data for {len(symbols)} symbols "
                        f"using '{provider_type}' provider"
                    )

                    for symbol in symbols:
                        try:
                            # Get stock info to get stock_code
                            stock_info = provider.get_batch_stock_info([symbol]).get(symbol)
                            if not stock_info:
                                logger.warning(f"No stock info available for {symbol}, skipping")
                                continue

                            stock = stock_service.get_stock_by_code(stock_info['stock_code'])
                            if not stock:
                                logger.warning(f"Stock {stock_info['stock_code']} not found in database, skipping")
                                continue

                            # Get historical data for the last month
                            hist_df = provider.get_historical_data(symbol, period="1mo", interval="1d")

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

        except RuntimeError:
            # Failed to acquire lock (another instance is already running)
            logger.info(
                "Historical data update is already running in another instance. "
                "Skipping this scheduled execution."
            )
        except Exception as e:
            logger.error(f"Unexpected error in historical data update: {str(e)}")

    def start(self):
        """Start the scheduler"""
        if not settings.SCHEDULER_ENABLED:
            logger.info("Scheduler is disabled")
            return

        try:
            self.redis_client = RedisClient.get_client()

            # Initialize data provider and log configuration
            provider = self._get_data_provider()
            provider_type = settings.STOCK_DATA_PROVIDER
            logger.info(f"Stock data provider: {provider_type} ({provider.__class__.__name__})")

            # Schedule market data updates every 5 minutes
            self.scheduler.add_job(
                self.update_market_data,
                trigger=IntervalTrigger(seconds=settings.MARKET_DATA_UPDATE_INTERVAL),
                id='market_data_update',
                name='Update Market Data (Every 5 min)',
                replace_existing=True
            )

            # Schedule stock info updates daily at 8 AM
            self.scheduler.add_job(
                self.update_stock_info,
                trigger=CronTrigger(hour=8, minute=0),
                id='stock_info_update',
                name='Update Stock Info (Daily at 8 AM)',
                replace_existing=True
            )

            # Schedule historical data updates daily at 6 AM
            self.scheduler.add_job(
                self.update_historical_data,
                trigger=CronTrigger(hour=6, minute=0),
                id='historical_data_update',
                name='Update Historical Data (Daily at 6 AM)',
                replace_existing=True
            )

            self.scheduler.start()
            logger.info("Scheduler started successfully")
            logger.info("Configuration:")
            logger.info(f"  - Data Provider: {provider_type}")
            logger.info(f"  - Update Interval: {settings.MARKET_DATA_UPDATE_INTERVAL}s")
            logger.info("Scheduled jobs:")
            logger.info("  - Market Data Update: Every 5 minutes")
            logger.info("  - Stock Info Update: Daily at 8:00 AM")
            logger.info("  - Historical Data Update: Daily at 6:00 AM")

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
