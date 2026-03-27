"""
测试新浪财经港股实时行情爬虫
独立测试脚本，不依赖项目其他模块
"""
import sys
import importlib.util
from pathlib import Path

# 加载爬虫模块（绕过 app.services.__init__.py）
crawler_path = Path(__file__).parent / "app" / "services" / "sina_hk_realtime_crawler.py"
spec = importlib.util.spec_from_file_location("sina_hk_realtime_crawler", crawler_path)
crawler_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(crawler_module)

SinaHKRealtimeCrawler = crawler_module.SinaHKRealtimeCrawler


def test_normalize_stock_code():
    """测试股票代码标准化"""
    test_cases = [
        ("00700.HK", "00700"),
        ("700.HK", "00700"),
        ("00700", "00700"),
        ("1810.HK", "01810"),
        ("1810", "01810"),
        ("09868.HK", "09868"),
        ("9868.HK", "09868"),
    ]

    print("=" * 60)
    print("股票代码标准化测试")
    print("=" * 60)

    all_passed = True
    for input_code, expected in test_cases:
        result = SinaHKRealtimeCrawler.normalize_stock_code(input_code)
        status = "PASS" if result == expected else "FAIL"
        if status == "FAIL":
            all_passed = False
        print(f"{status}: {input_code} -> {result} (expected: {expected})")

    print()
    return all_passed


def test_fetch_single_stock():
    """测试获取单只股票实时行情"""
    print("=" * 60)
    print("测试获取单只股票实时行情")
    print("=" * 60)

    stock_code = "01810.HK"  # 小米集团
    print(f"\n正在获取 {stock_code} 的实时行情...\n")

    crawler = SinaHKRealtimeCrawler()
    result = crawler.fetch_realtime_quote(stock_code)

    # 打印结果
    print_result(result)

    return result


def test_fetch_market_overview_removed():
    """备注：批量获取和市场概览功能已移除"""
    print("=" * 60)
    print("备注：批量获取和市场概览功能已移除")
    print("=" * 60)
    print("爬虫现在只支持单只股票查询")
    print()
    return True


def print_result(result: dict):
    """格式化打印结果"""
    print(f"股票代码：{result.get('symbol')}")
    print(f"标准化代码：{result.get('normalized_symbol')}")
    print(f"数据源：{result.get('datasource')}")
    print(f"获取时间：{result.get('fetch_time')}")
    print()

    # 实时行情数据
    realtime = result.get('realtime_data', {})
    if realtime.get('status') == 'success':
        print("--- 实时行情 ---")
        print(f"  中文名：{realtime.get('chinese_name')}")
        print(f"  英文名：{realtime.get('english_name')}")
        print(f"  当前价：{realtime.get('current')}")
        print(f"  开盘价：{realtime.get('open')}")
        print(f"  最高价：{realtime.get('high')}")
        print(f"  最低价：{realtime.get('low')}")
        print(f"  昨收价：{realtime.get('previous_close')}")
        print(f"  涨跌额：{realtime.get('change')}")
        print(f"  涨跌幅：{realtime.get('change_percent')}%")
        print(f"  振幅：{realtime.get('amplitude')}%")
        print(f"  买一价：{realtime.get('bid1')}")
        print(f"  卖一价：{realtime.get('ask1')}")
        print(f"  成交量：{realtime.get('volume')}")
        print(f"  成交额：{realtime.get('turnover')}")
        print(f"  市盈率：{realtime.get('pe_ratio')}")
        print(f"  52 周最高：{realtime.get('high_52w')}")
        print(f"  52 周最低：{realtime.get('low_52w')}")
        print(f"  日期：{realtime.get('date')}")
        print(f"  时间：{realtime.get('time')}")
        print(f"  交易状态：{realtime.get('trading_status', 'unknown')}")
    else:
        print(f"实时行情获取失败：{realtime.get('error')}")

    print()


def main():
    """主测试函数"""
    print("\n" + "=" * 60)
    print("新浪财经港股实时行情爬虫测试")
    print("=" * 60)

    # 测试 1: 股票代码标准化
    test_normalize_stock_code()

    # 自动运行所有测试
    print("\n" + "=" * 60)
    print("运行全部测试")
    print("=" * 60)

    print("\n[测试 1] 单只股票行情 (01810.HK 小米集团)")
    test_fetch_single_stock()

    print("\n[测试 2] 功能说明")
    test_fetch_market_overview_removed()

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)


if __name__ == "__main__":
    main()
