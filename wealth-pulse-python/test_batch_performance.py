"""
Performance comparison test between individual and batch modes.

This script demonstrates the performance difference between
the old individual mode and the new batch mode.
"""
import time
from app.services.yfinance_service import yfinance_service
from app.services.yfinance_batch_service import yfinance_batch_service

# Test symbols (subset of monitored stocks)
TEST_SYMBOLS = ['NVDA', 'AAPL', 'MSFT', '0700.HK', '9988.HK']


def test_individual_mode():
    """Test individual request mode (old method)"""
    print("=" * 60)
    print("Test 1: Individual Mode (Old Method)")
    print("=" * 60)

    start_time = time.time()
    request_count = 0

    for symbol in TEST_SYMBOLS:
        try:
            # Get stock info
            info = yfinance_service.get_stock_info(symbol)
            request_count += 1

            if info:
                print(f"✓ {symbol}: {info.get('short_name', 'N/A')}")

            # Small delay to avoid rate limiting
            time.sleep(0.3)

            # Get market data
            market_data = yfinance_service.get_market_data(symbol)
            request_count += 1

            if market_data:
                print(f"  Price: {market_data.get('last_price', 'N/A')}")

            # Delay between symbols
            time.sleep(0.3)

        except Exception as e:
            print(f"✗ {symbol}: Error - {str(e)}")

    elapsed = time.time() - start_time

    print(f"\nResults:")
    print(f"  Total requests: {request_count}")
    print(f"  Total time: {elapsed:.2f} seconds")
    print(f"  Average per symbol: {elapsed / len(TEST_SYMBOLS):.2f} seconds")
    print()


def test_batch_mode():
    """Test batch request mode (new method)"""
    print("=" * 60)
    print("Test 2: Batch Mode (New Method)")
    print("=" * 60)

    start_time = time.time()
    request_count = 0

    try:
        # Get all data in one call
        batch_results = yfinance_batch_service.get_batch_combined_data(TEST_SYMBOLS)
        request_count += 1  # Count as 1 main request (internally uses 2 calls)

        for symbol, data in batch_results.items():
            try:
                info = data.get('info')
                market_data = data.get('market_data')

                if info and market_data:
                    print(f"✓ {symbol}: {info.get('short_name', 'N/A')}")
                    print(f"  Price: {market_data.get('last_price', 'N/A')}")
                else:
                    print(f"✗ {symbol}: No data available")

            except Exception as e:
                print(f"✗ {symbol}: Error - {str(e)}")

    except Exception as e:
        print(f"✗ Batch request failed: {str(e)}")

    elapsed = time.time() - start_time

    print(f"\nResults:")
    print(f"  Total requests: ~2 (1 for info, 1 for market data)")
    print(f"  Total time: {elapsed:.2f} seconds")
    print(f"  Average per symbol: {elapsed / len(TEST_SYMBOLS):.2f} seconds")
    print()


def test_comparison():
    """Show performance comparison"""
    print("=" * 60)
    print("Performance Comparison")
    print("=" * 60)

    individual_time = 0  # Will be calculated
    batch_time = 0  # Will be calculated

    # Run individual mode
    print("\nRunning individual mode...")
    start = time.time()
    request_count = 0

    for symbol in TEST_SYMBOLS:
        try:
            yfinance_service.get_stock_info(symbol)
            request_count += 1
            time.sleep(0.3)
            yfinance_service.get_market_data(symbol)
            request_count += 1
            time.sleep(0.3)
        except:
            pass

    individual_time = time.time() - start

    # Run batch mode
    print("Running batch mode...")
    start = time.time()

    try:
        yfinance_batch_service.get_batch_combined_data(TEST_SYMBOLS)
    except:
        pass

    batch_time = time.time() - start

    # Display comparison
    print(f"\n{'Metric':<30} {'Individual':<15} {'Batch':<15} {'Improvement'}")
    print("-" * 70)

    improvement = ((individual_time - batch_time) / individual_time * 100)
    print(f"{'Total Time (seconds)':<30} {individual_time:<15.2f} {batch_time:<15.2f} {improvement:.1f}% faster")

    individual_requests = len(TEST_SYMBOLS) * 2
    batch_requests = 2  # 1 for info, 1 for market data
    reduction = ((individual_requests - batch_requests) / individual_requests * 100)
    print(f"{'API Requests':<30} {individual_requests:<15} {batch_requests:<15} {reduction:.1f}% less")

    print(f"\nConclusion:")
    print(f"  ✓ Batch mode is {individual_time / batch_time:.1f}x faster")
    print(f"  ✓ Batch mode uses {individual_requests / batch_requests:.1f}x fewer API calls")
    print()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("yfinance Performance Test")
    print("=" * 60)
    print(f"\nTesting with {len(TEST_SYMBOLS)} symbols: {', '.join(TEST_SYMBOLS)}")
    print()

    # Run tests
    test_individual_mode()
    time.sleep(2)  # Cool-down period

    test_batch_mode()
    time.sleep(2)  # Cool-down period

    test_comparison()

    print("=" * 60)
    print("Test completed!")
    print("=" * 60)
    print("\nRecommendation: Use batch mode in production for better")
    print("performance and to avoid API rate limiting.")
    print()
