"""
Test script for stock data providers.

This script tests both yfinance and akshare providers to ensure they work correctly.
"""
import sys
from typing import Dict, Any

from app.services import (
    get_stock_data_provider,
    reset_provider
)


def print_section(title: str):
    """Print a section header"""
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def print_stock_info(symbol: str, data: Dict[str, Any]):
    """Print stock information"""
    if data is None:
        print(f"❌ {symbol}: Failed to fetch data")
        return

    info = data.get('info', {})
    market = data.get('market_data', {})

    print(f"\n📊 {symbol}")
    print("-" * 70)

    if info:
        print(f"  Company: {info.get('company_name', 'N/A')}")
        print(f"  Type: {info.get('stock_type', 'N/A')}")
        print(f"  Exchange: {info.get('exchange', 'N/A')}")
        print(f"  Currency: {info.get('currency', 'N/A')}")

    if market:
        print(f"  Price: {market.get('last_price', 'N/A')}")
        print(f"  Change: {market.get('change_number', 'N/A')} ({market.get('change_rate', 'N/A')}%)")
        print(f"  Volume: {market.get('volume', 'N/A')}")
        print(f"  Data Source: {market.get('data_source', 'N/A')}")


def test_provider(provider_type: str, symbols: list):
    """Test a specific provider"""
    print_section(f"Testing {provider_type.upper()} Provider")

    try:
        # Reset cache to ensure we get a fresh instance
        reset_provider()

        # Get the provider
        provider = get_stock_data_provider(provider_type=provider_type)
        print(f"✅ Provider created: {provider.__class__.__name__}")

        # Test batch combined data
        print(f"\n📡 Fetching data for {len(symbols)} symbols...")
        combined_data = provider.get_batch_combined_data(symbols)

        success_count = 0
        for symbol, data in combined_data.items():
            print_stock_info(symbol, data)
            if data.get('market_data'):
                success_count += 1

        print(f"\n✅ Successfully fetched: {success_count}/{len(symbols)} symbols")

        return success_count > 0

    except Exception as e:
        print(f"\n❌ Error testing {provider_type}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_historical_data(provider_type: str, symbol: str):
    """Test historical data fetching"""
    print_section(f"Testing {provider_type.upper()} Historical Data")

    try:
        reset_provider()
        provider = get_stock_data_provider(provider_type=provider_type)

        print(f"📡 Fetching historical data for {symbol}...")
        hist_df = provider.get_historical_data(symbol, period="1mo", interval="1d")

        if hist_df is not None and not hist_df.empty:
            print(f"✅ Successfully fetched {len(hist_df)} historical data points")
            print(f"\nLatest 5 records:")
            print(hist_df.head().to_string())
            return True
        else:
            print(f"❌ No historical data returned")
            return False

    except Exception as e:
        print(f"\n❌ Error fetching historical data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main test function"""
    print_section("Stock Data Provider Test Suite")

    # Test symbols (mix of HK and US stocks)
    test_symbols = ['0700.HK', '9988.HK']

    # Test both providers
    results = {}

    print("\n" + "🧪 Running tests..." + "\n")

    # Test yfinance
    results['yfinance'] = test_provider('yfinance', test_symbols)

    # Test akshare
    results['akshare'] = test_provider('akshare', test_symbols)

    # Test historical data
    print("\n" + "📈 Testing historical data..." + "\n")
    hist_results = {}
    hist_results['yfinance'] = test_historical_data('yfinance', '0700.HK')
    hist_results['akshare'] = test_historical_data('akshare', '0700.HK')

    # Summary
    print_section("Test Summary")

    print("\n📊 Batch Data Tests:")
    for provider, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {provider:12s}: {status}")

    print("\n📈 Historical Data Tests:")
    for provider, passed in hist_results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {provider:12s}: {status}")

    # Overall result
    all_passed = all(results.values()) and all(hist_results.values())

    print("\n" + "=" * 70)
    if all_passed:
        print(" ✅ ALL TESTS PASSED!")
        print("=" * 70 + "\n")
        return 0
    else:
        print(" ⚠️  SOME TESTS FAILED")
        print("=" * 70 + "\n")
        return 1


if __name__ == '__main__':
    sys.exit(main())
