"""
Test script for Redis distributed lock functionality.

Run this script to verify that the lock is working correctly.
"""
import time
import asyncio
from app.db.lock import distributed_lock, RedisDistributedLock
from app.db.redis import RedisClient


def test_basic_lock():
    """Test basic lock acquisition and release"""
    print("Test 1: Basic lock acquisition and release")
    print("-" * 50)

    lock_name = "test_lock_basic"

    # Test 1: Acquire and release
    with distributed_lock(lock_name, timeout=10) as lock:
        print(f"✓ Lock '{lock_name}' acquired successfully")
        print(f"  Lock identifier: {lock.identifier}")
        time.sleep(1)
        print(f"✓ Critical section executed")

    print(f"✓ Lock released automatically")
    print()


def test_lock_prevention():
    """Test that lock prevents concurrent access"""
    print("Test 2: Lock prevents concurrent access")
    print("-" * 50)

    lock_name = "test_lock_prevention"

    # First lock (blocking)
    lock1 = RedisDistributedLock(lock_name, timeout=10, blocking=False)

    if lock1.acquire():
        print(f"✓ First lock acquired: {lock1.identifier}")

        # Try to acquire same lock again (should fail)
        lock2 = RedisDistributedLock(lock_name, timeout=10, blocking=False)
        acquired = lock2.acquire()

        if acquired:
            print(f"✗ ERROR: Second lock should not have been acquired!")
        else:
            print(f"✓ Second lock correctly prevented")

        # Release first lock
        lock1.release()
        print(f"✓ First lock released")

        # Now second lock should succeed
        lock3 = RedisDistributedLock(lock_name, timeout=10, blocking=False)
        if lock3.acquire():
            print(f"✓ Third lock acquired successfully after first was released")
            lock3.release()
        else:
            print(f"✗ ERROR: Third lock should have been acquired!")

    print()


def test_lock_timeout():
    """Test lock timeout functionality"""
    print("Test 3: Lock timeout functionality")
    print("-" * 50)

    lock_name = "test_lock_timeout"

    # Acquire lock with short timeout
    lock1 = RedisDistributedLock(lock_name, timeout=2, blocking=False)
    if lock1.acquire():
        print(f"✓ First lock acquired (2 second timeout)")

        # Wait for lock to expire
        print(f"  Waiting for lock to expire...")
        time.sleep(3)

        # Try to acquire again (should succeed because first lock expired)
        lock2 = RedisDistributedLock(lock_name, timeout=2, blocking=False)
        if lock2.acquire():
            print(f"✓ Second lock acquired after first expired")
            lock2.release()
        else:
            print(f"✗ ERROR: Second lock should have been acquired after timeout")

    print()


def test_lock_is_locked():
    """Test is_locked() method"""
    print("Test 4: is_locked() method")
    print("-" * 50)

    lock_name = "test_lock_is_locked"

    lock = RedisDistributedLock(lock_name, timeout=10, blocking=False)

    # Before acquiring
    if not lock.is_locked():
        print(f"✓ Lock is not held (before acquisition)")
    else:
        print(f"✗ ERROR: Lock should not be held yet")

    # After acquiring
    lock.acquire()
    if lock.is_locked():
        print(f"✓ Lock is held (after acquisition)")
    else:
        print(f"✗ ERROR: Lock should be held")

    # After releasing
    lock.release()
    time.sleep(0.1)  # Small delay to ensure Redis operation completes
    if not lock.is_locked():
        print(f"✓ Lock is not held (after release)")
    else:
        print(f"✗ ERROR: Lock should not be held after release")

    print()


def test_concurrent_simulation():
    """Simulate concurrent access pattern"""
    print("Test 5: Concurrent access simulation")
    print("-" * 50)

    lock_name = "test_lock_concurrent"

    results = []

    def worker(worker_id, delay=0):
        """Simulate a worker trying to acquire lock"""
        lock = RedisDistributedLock(lock_name, timeout=5, blocking=False)
        acquired = lock.acquire()

        if acquired:
            results.append(f"Worker {worker_id}: ✓ Acquired lock")
            time.sleep(delay)
            lock.release()
            results.append(f"Worker {worker_id}: ✓ Released lock")
        else:
            results.append(f"Worker {worker_id}: ✗ Lock busy, skipped")

    # Simulate multiple workers
    worker(1, delay=1)  # First worker holds lock for 1 second
    worker(2, delay=0)  # Second worker tries immediately (should fail)
    time.sleep(1.5)     # Wait for first worker to finish
    worker(3, delay=0)  # Third worker tries after first released (should succeed)

    for result in results:
        print(f"  {result}")

    print()


def cleanup_test_locks():
    """Clean up any remaining test locks"""
    print("Cleanup: Removing test locks")
    print("-" * 50)

    redis_client = RedisClient.get_client()
    test_locks = [
        "lock:test_lock_basic",
        "lock:test_lock_prevention",
        "lock:test_lock_timeout",
        "lock:test_lock_is_locked",
        "lock:test_lock_concurrent"
    ]

    for lock_key in test_locks:
        if redis_client.exists(lock_key):
            redis_client.delete(lock_key)
            print(f"  ✓ Removed lock: {lock_key}")
        else:
            print(f"  - No lock to remove: {lock_key}")

    print()


if __name__ == "__main__":
    print("=" * 50)
    print("Redis Distributed Lock Test Suite")
    print("=" * 50)
    print()

    try:
        # Clean up any previous test locks
        cleanup_test_locks()

        # Run tests
        test_basic_lock()
        test_lock_prevention()
        test_lock_timeout()
        test_lock_is_locked()
        test_concurrent_simulation()

        # Final cleanup
        cleanup_test_locks()

        print("=" * 50)
        print("All tests completed!")
        print("=" * 50)

    except Exception as e:
        print(f"\n✗ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        # Ensure Redis connection is closed
        RedisClient.close()
