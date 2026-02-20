import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.lock import distributed_lock
from app.db.redis import RedisClient
from app.db.session import SessionLocal
from app.services.stock_data_provider_base import BaseStockDataProvider
from app.services.stock_data_provider_factory import get_stock_data_provider, StockDataProviderFactory
from app.services.stock_service import StockService

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

    # Trading hours: Monday to Friday, 9:00 AM to 7:00 PM
    TRADING_START_HOUR = 9
    TRADING_END_HOUR = 19

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
            logger.info(f"Initializing stock data provider: {settings.STOCK_DATA_PROVIDER}")
            self._data_provider = get_stock_data_provider()
        return self._data_provider

    def _refresh_data_provider(self):
        """Force refresh the data provider (useful for config changes)"""
        StockDataProviderFactory.reset_cache()
        self._data_provider = get_stock_data_provider()
        logger.info(f"Data provider refreshed: {settings.STOCK_DATA_PROVIDER}")

    @staticmethod
    def is_trading_hours(now: datetime = None) -> bool:
        """
        Check if current time is within trading hours.

        Trading hours: Monday to Friday, 9:00 AM to 7:00 PM (exclusive)

        Args:
            now: Current datetime (defaults to current time)

        Returns:
            True if within trading hours, False otherwise
        """
        if now is None:
            now = datetime.now()

        # Check if weekday (Monday=0, Friday=4)
        if now.weekday() > 4:  # Saturday (5) or Sunday (6)
            return False

        # Check if within trading hours (9:00 - 19:00)
        # We use 18:55 as the cutoff to ensure the last update runs before 19:00
        return MarketDataScheduler.TRADING_START_HOUR <= now.hour < MarketDataScheduler.TRADING_END_HOUR

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

        Trading hours: Monday to Friday, 9:00 AM to 7:00 PM
        """
        # Check if within trading hours
        if not self.is_trading_hours():
            current_time = datetime.now()
            logger.info(
                f"Skipping market data update - outside trading hours. "
                f"Current: {current_time.strftime('%Y-%m-%d %H:%M:%S (%A)')}, "
                f"Trading: Mon-Fri {self.TRADING_START_HOUR}:00-{self.TRADING_END_HOUR}:00"
            )
            return

        # Use distributed lock to prevent concurrent updates
        lock_name = "market_data_refresh"
        lock_timeout = 600  # 10 minutes (should be longer than the actual task)

        try:
            with distributed_lock(lock_name, timeout=lock_timeout, blocking=False):
                logger.info("Starting market data update... (Lock acquired)")

                db: Session = SessionLocal()
                try:
                    import json

                    # Get symbols from database - run in thread pool
                    symbols = await asyncio.to_thread(self._get_active_stock_symbols, db)

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

        stock_service = StockService(db)

        # Convert symbols to stock_codes
        stock_codes = []
        for symbol in symbols:
            stock_codes.append(symbol)

        # Get market data in batch using the new provider interface with retry
        # Use asyncio.to_thread to run blocking I/O in a separate thread
        logger.info(f"Fetching market data for {len(stock_codes)} stock_codes using {provider.__class__.__name__}")
        results = await asyncio.to_thread(provider.get_batch_market_data_with_retry, stock_codes)

        # Process results - also run in thread pool to avoid blocking
        success_count = 0
        for result in results:
            try:
                if result.success and result.data:
                    await asyncio.to_thread(stock_service.update_market_data, result.stock_code, result.data)
                    logger.info(f"Updated market data: {result.stock_code}")
                    success_count += 1
                else:
                    logger.warning(f"No market data available for {result.stock_code}: {result.error_message}")

            except Exception as e:
                logger.error(f"Error updating market data for {result.stock_code}: {str(e)}")
                continue

        logger.info(f"Batch market data update completed: {success_count}/{len(stock_codes)} succeeded")

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

                    # Get symbols from database - run in thread pool
                    symbols = await asyncio.to_thread(self._get_active_stock_symbols, db)

                    if not symbols:
                        logger.warning("No active stocks found in database")
                        return

                    logger.info(
                        f"Fetching historical data for {len(symbols)} symbols "
                        f"using '{provider_type}' provider"
                    )

                    # Convert symbols to stock_codes
                    stock_codes = []
                    for symbol in symbols:
                        if '.' in symbol:
                            stock_codes.append(symbol)  # Already in stock_code format (e.g., '0700.HK')
                        else:
                            stock_codes.append(f"{symbol}.US")  # Convert to stock_code format

                    # Filter out stocks that don't exist in database
                    valid_stock_codes = []
                    for stock_code in stock_codes:
                        stock = await asyncio.to_thread(stock_service.get_stock_by_code, stock_code)
                        if stock:
                            valid_stock_codes.append(stock_code)
                        else:
                            logger.warning(f"Stock {stock_code} not found in database, skipping")

                    # Update financial indicators (market_cap) for HK stocks
                    logger.info("Updating financial indicators for HK stocks...")
                    financial_update_count = 0
                    for stock_code in valid_stock_codes:
                        if stock_code.endswith('.HK'):
                            result = await asyncio.to_thread(stock_service.update_financial_indicator, stock_code)
                            if result:
                                financial_update_count += 1

                    logger.info(f"Financial indicators update completed: {financial_update_count} HK stocks updated")

                    if not valid_stock_codes:
                        logger.warning("No valid stocks to update historical data")
                        return

                    # Get historical date range (last 3 months)
                    from datetime import date, timedelta
                    start_date = date.today() - timedelta(days=90)
                    end_date = date.today()

                    logger.info(
                        f"Fetching batch historical data for {len(valid_stock_codes)} stocks from {start_date} to {end_date}")

                    # Use BATCH method for much better performance!
                    # Run in thread pool to avoid blocking event loop
                    batch_results = await asyncio.to_thread(
                        provider.get_batch_history_data,
                        valid_stock_codes,
                        start_date=start_date,
                        end_date=end_date
                    )

                    # Process batch results
                    success_count = 0
                    total_records = 0
                    for stock_code, history_list in batch_results.items():
                        try:
                            if history_list:
                                await asyncio.to_thread(stock_service.update_history_data, stock_code, history_list)
                                logger.info(f"Updated historical data: {stock_code}, {len(history_list)} records")
                                success_count += 1
                                total_records += len(history_list)
                            else:
                                logger.warning(f"No historical data available for {stock_code}")
                        except Exception as e:
                            logger.error(f"Error updating historical data for {stock_code}: {str(e)}")
                            continue

                    logger.info(
                        f"Historical data batch update completed: {success_count}/{len(valid_stock_codes)} succeeded, {total_records} total records")

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
            logger.info(f"  - Trading Hours: Mon-Fri {self.TRADING_START_HOUR}:00-{self.TRADING_END_HOUR}:00")
            logger.info("Scheduled jobs:")
            logger.info(f"  - Market Data Update: Every {settings.MARKET_DATA_UPDATE_INTERVAL}s (trading hours only)")
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
