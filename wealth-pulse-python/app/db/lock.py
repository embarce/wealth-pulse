import uuid
import contextlib
import logging
from typing import Optional
from app.db.redis import RedisClient

logger = logging.getLogger(__name__)


class RedisDistributedLock:
    """
    Redis-based distributed lock implementation.

    Uses SET key value NX PX timeout to acquire locks and Lua script
    for safe release. Prevents multiple instances from running the same
    critical section concurrently.
    """

    # Lua script to safely release lock (only if owned by us)
    _RELEASE_SCRIPT = """
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
    """

    def __init__(
        self,
        lock_name: str,
        timeout: int = 60,
        blocking: bool = False,
        blocking_timeout: Optional[int] = None
    ):
        """
        Initialize the distributed lock.

        Args:
            lock_name: Name of the lock (will be prefixed with 'lock:')
            timeout: Lock expiration time in seconds (auto-release if not released)
            blocking: Whether to block while waiting for lock
            blocking_timeout: Max seconds to wait for lock (None = infinite, only if blocking=True)
        """
        self.lock_name = f"lock:{lock_name}"
        self.timeout = timeout * 1000  # Convert to milliseconds for Redis PX option
        self.blocking = blocking
        self.blocking_timeout = blocking_timeout
        self.redis_client = None
        self.identifier = str(uuid.uuid4())
        self._acquired = False

    def acquire(self) -> bool:
        """
        Acquire the lock.

        Returns:
            bool: True if lock was acquired, False otherwise
        """
        self.redis_client = RedisClient.get_client()

        if self.blocking:
            # Blocking mode with retry
            import time
            start_time = time.time()

            while True:
                acquired = self._try_acquire()
                if acquired:
                    self._acquired = True
                    logger.info(f"Lock '{self.lock_name}' acquired (blocking mode)")
                    return True

                # Check blocking timeout
                if self.blocking_timeout is not None:
                    elapsed = time.time() - start_time
                    if elapsed >= self.blocking_timeout:
                        logger.warning(
                            f"Failed to acquire lock '{self.lock_name}' "
                            f"after {self.blocking_timeout}s"
                        )
                        return False

                # Wait a bit before retrying
                time.sleep(0.1)
        else:
            # Non-blocking mode
            acquired = self._try_acquire()
            if acquired:
                self._acquired = True
                logger.info(f"Lock '{self.lock_name}' acquired")
            else:
                logger.info(f"Lock '{self.lock_name}' is already held")
            return acquired

    def _try_acquire(self) -> bool:
        """
        Try to acquire lock once (internal method).

        Returns:
            bool: True if successful
        """
        try:
            # SET key value NX PX timeout
            # NX: Only set if key doesn't exist
            # PX: Set expiration in milliseconds
            result = self.redis_client.set(
                self.lock_name,
                self.identifier,
                nx=True,
                px=self.timeout
            )
            return result is True
        except Exception as e:
            logger.error(f"Error acquiring lock '{self.lock_name}': {str(e)}")
            return False

    def release(self) -> bool:
        """
        Release the lock.

        Returns:
            bool: True if lock was released, False otherwise
        """
        if not self._acquired:
            logger.warning(f"Attempting to release lock '{self.lock_name}' that was not acquired")
            return False

        try:
            # Use Lua script to safely delete only if we own the lock
            script = self.redis_client.register_script(self._RELEASE_SCRIPT)
            result = script(
                keys=[self.lock_name],
                args=[self.identifier]
            )
            self._acquired = False

            if result == 1:
                logger.info(f"Lock '{self.lock_name}' released")
                return True
            else:
                logger.warning(
                    f"Lock '{self.lock_name}' was already released or expired "
                    f"(identifier mismatch)"
                )
                return False
        except Exception as e:
            logger.error(f"Error releasing lock '{self.lock_name}': {str(e)}")
            self._acquired = False
            return False

    def __enter__(self):
        """Context manager entry."""
        if not self.acquire():
            raise RuntimeError(f"Failed to acquire lock '{self.lock_name}'")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.release()
        return False

    def is_locked(self) -> bool:
        """
        Check if lock is currently held (by anyone).

        Returns:
            bool: True if lock exists in Redis
        """
        try:
            self.redis_client = RedisClient.get_client()
            return self.redis_client.exists(self.lock_name) == 1
        except Exception as e:
            logger.error(f"Error checking lock '{self.lock_name}': {str(e)}")
            return False


@contextlib.contextmanager
def distributed_lock(
    lock_name: str,
    timeout: int = 60,
    blocking: bool = False,
    blocking_timeout: Optional[int] = None
):
    """
    Context manager for distributed lock.

    Usage:
        with distributed_lock("market_data_refresh", timeout=300):
            # Critical section here
            refresh_market_data()

    Args:
        lock_name: Name of the lock
        timeout: Lock timeout in seconds
        blocking: Whether to wait for lock
        blocking_timeout: Max seconds to wait (None = infinite)

    Yields:
        RedisDistributedLock instance
    """
    lock = RedisDistributedLock(
        lock_name=lock_name,
        timeout=timeout,
        blocking=blocking,
        blocking_timeout=blocking_timeout
    )

    try:
        if not lock.acquire():
            raise RuntimeError(f"Failed to acquire lock '{lock_name}'")
        yield lock
    finally:
        lock.release()
