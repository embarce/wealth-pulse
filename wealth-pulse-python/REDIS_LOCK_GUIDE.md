# Redis Distributed Lock Usage Guide

## Overview

This project uses Redis-based distributed locks to prevent concurrent execution of critical tasks across multiple service instances. This ensures that data refresh operations, scheduled jobs, and other sensitive tasks run only once at a time.

## Features

- **Automatic timeout**: Locks automatically expire to prevent deadlocks
- **UUID-based ownership**: Each lock has a unique identifier to prevent accidental release by other processes
- **Non-blocking mode**: Tasks skip execution if another instance is already running
- **Context manager support**: Clean acquisition and release with Python's `with` statement
- **Lua script safety**: Atomic lock release to prevent race conditions

## Architecture

### Lock Storage

Locks are stored in Redis with the following structure:
- **Key pattern**: `lock:<lock_name>`
- **Value**: UUID identifier (to verify ownership)
- **TTL**: Auto-expiration after timeout period

### Active Locks

| Lock Name | Usage | Timeout |
|-----------|-------|---------|
| `market_data_refresh` | Scheduled market data update (every 5 min) | 600s (10 min) |
| `historical_data_refresh` | Daily historical data update (6 AM) | 3600s (1 hour) |
| `manual_market_data_refresh` | Manual API refresh trigger | 600s (10 min) |

## Usage

### Basic Usage (Context Manager)

```python
from app.db.lock import distributed_lock

def my_task():
    with distributed_lock("my_task", timeout=60, blocking=False):
        # Critical section - only one instance runs this at a time
        print("Lock acquired, executing task...")
        # Your code here
    # Lock automatically released
```

### Advanced Usage (Manual Control)

```python
from app.db.lock import RedisDistributedLock

def my_task():
    lock = RedisDistributedLock(
        lock_name="my_task",
        timeout=60,        # Lock expires after 60 seconds
        blocking=False,    # Don't wait if lock is held
        blocking_timeout=None  # Max wait time (only if blocking=True)
    )

    if lock.acquire():
        try:
            # Critical section
            print("Lock acquired, executing task...")
            # Your code here
        finally:
            lock.release()
    else:
        print("Could not acquire lock, skipping task")
```

### Real-World Example: Data Refresh Job

```python
from app.db.lock import distributed_lock

async def update_market_data(self):
    """Update market data for all monitored stocks"""
    lock_name = "market_data_refresh"
    lock_timeout = 600  # 10 minutes

    try:
        with distributed_lock(lock_name, timeout=lock_timeout, blocking=False):
            logger.info("Starting market data update... (Lock acquired)")

            # Your refresh logic here
            for symbol in symbols:
                refresh_data(symbol)

            logger.info("Market data update completed")

    except RuntimeError:
        # Failed to acquire lock (another instance is already running)
        logger.info(
            "Market data update is already running in another instance. "
            "Skipping this scheduled execution."
        )
```

## Configuration

### Lock Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lock_name` | str | Required | Unique name for the lock (prefixed with `lock:`) |
| `timeout` | int | 60 | Auto-release timeout in seconds |
| `blocking` | bool | False | Whether to wait for lock acquisition |
| `blocking_timeout` | int/None | None | Max seconds to wait (only if `blocking=True`) |

### Choosing Timeout Values

**Rule of thumb**: Set timeout to 2-3x your expected task duration

Examples:
- **Quick task** (< 10 seconds): timeout = 30s
- **Medium task** (1-2 minutes): timeout = 300s (5 min)
- **Long task** (5-10 minutes): timeout = 600s (10 min)
- **Very long task** (> 30 minutes): Consider breaking into smaller chunks

## Testing

Run the test suite to verify lock functionality:

```bash
cd wealth-pulse-python
python test_redis_lock.py
```

Expected output:
```
==================================================
Redis Distributed Lock Test Suite
==================================================

Test 1: Basic lock acquisition and release
--------------------------------------------------
✓ Lock 'test_lock_basic' acquired successfully
  Lock identifier: a1b2c3d4-...
✓ Critical section executed
✓ Lock released automatically

...

All tests completed!
==================================================
```

## Monitoring

### Check Active Locks

```python
from app.db.redis import RedisClient

redis_client = RedisClient.get_client()
active_locks = redis_client.keys("lock:*")

print(f"Active locks: {active_locks}")
```

### Check Specific Lock

```python
from app.db.lock import RedisDistributedLock

lock = RedisDistributedLock("market_data_refresh")
if lock.is_locked():
    print("Market data refresh is currently running")
else:
    print("No refresh is running")
```

### View Lock Details

```bash
# Connect to Redis
redis-cli -h 127.0.0.1 -p 6379
AUTH redis_data_center

# View all locks
KEYS lock:*

# Check specific lock
GET lock:market_data_refresh
TTL lock:market_data_refresh
```

## Troubleshooting

### Lock Not Releasing

**Symptom**: Tasks keep getting skipped even though previous task finished

**Cause**: Lock timeout too short, or process crashed before releasing

**Solutions**:
1. Manually remove lock from Redis: `DEL lock:<lock_name>`
2. Increase lock timeout to account for worst-case execution time
3. Add error handling to ensure lock is always released

### Frequent Lock Timeouts

**Symptom**: Tasks getting interrupted mid-execution

**Cause**: Lock timeout too short for actual task duration

**Solutions**:
1. Profile your task to determine actual execution time
2. Increase timeout to 2-3x expected duration
3. Optimize your task to run faster

### All Instances Skipping Task

**Symptom**: Task never runs, logs show "skipping this execution"

**Cause**: Lock was never released (crash, network issue, etc.)

**Solutions**:
1. Check active locks in Redis: `KEYS lock:*`
2. Remove stale locks: `DEL lock:<stale_lock_name>`
3. Implement lock health monitoring

## Best Practices

1. **Always use context managers** when possible (`with distributed_lock(...)`)
2. **Set appropriate timeouts** based on actual task duration
3. **Use non-blocking mode** for scheduled tasks (let scheduler retry next interval)
4. **Log lock acquisition/release** for debugging
5. **Monitor lock metrics** in production (acquisition failures, timeouts, etc.)
6. **Test with multiple instances** before deploying to production
7. **Never use blocking mode** for scheduled tasks (can cause scheduler pile-up)

## Implementation Files

- **Lock utility**: `app/db/lock.py`
- **Scheduler integration**: `app/tasks/scheduler.py`
- **API integration**: `app/api/stocks.py`
- **Test suite**: `test_redis_lock.py`

## Dependencies

Already included in `requirements.txt`:
- `redis==5.2.0` - Redis Python client
- Python standard library: `uuid`, `contextlib`, `logging`

No additional dependencies needed.
