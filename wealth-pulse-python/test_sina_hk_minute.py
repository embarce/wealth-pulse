"""
测试新浪港股分时数据爬虫
"""
import asyncio
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 直接导入爬虫模块，避免导入其他依赖
import importlib.util
spec = importlib.util.spec_from_file_location(
    "sina_hk_realtime_crawler",
    os.path.join(os.path.dirname(__file__), "app", "services", "sina_hk_realtime_crawler.py")
)
crawler_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(crawler_module)

sina_hk_minute_crawler = crawler_module.sina_hk_minute_crawler


async def test_fetch_minute_data():
    """测试获取分时数据"""
    print("=" * 60)
    print("测试新浪港股分时数据爬虫")
    print("=" * 60)

    # 测试股票代码
    test_cases = [
        "0700.HK",    # 腾讯控股
        "01810.HK",   # 小米集团
        "09868.HK",   # 小鹏汽车
    ]

    for stock_code in test_cases:
        print(f"\n正在获取 {stock_code} 的分时数据...")
        result = await sina_hk_minute_crawler.fetch_minute_data(stock_code)

        print(f"股票代码：{result.get('symbol')}")
        print(f"标准化代码：{result.get('normalized_symbol')}")
        print(f"数据来源：{result.get('datasource')}")
        print(f"获取时间：{result.get('fetch_time')}")
        print(f"状态：{result.get('status')}")

        if result.get('error'):
            print(f"错误：{result.get('error')}")

        minute_data = result.get('minute_data', [])
        print(f"分时数据条数：{len(minute_data)}")

        if minute_data:
            print("\n前 5 条分时数据:")
            for i, record in enumerate(minute_data[:5], 1):
                print(f"  {i}. 时间：{record.get('time')}, "
                      f"价格：{record.get('price')}, "
                      f"成交量：{record.get('volume')}, "
                      f"成交额：{record.get('turnover')}, "
                      f"均价：{record.get('avg_price')}")
                if 'prev_open_volume' in record:
                    print(f"      前开盘量：{record.get('prev_open_volume')}")

            # 显示最后一条数据
            if len(minute_data) > 5:
                print(f"  ...")
                last = minute_data[-1]
                print(f"  {len(minute_data)}. 时间：{last.get('time')}, "
                      f"价格：{last.get('price')}, "
                      f"成交量：{last.get('volume')}, "
                      f"成交额：{last.get('turnover')}, "
                      f"均价：{last.get('avg_price')}")

        print("-" * 60)

    print("\n测试完成！")


if __name__ == "__main__":
    asyncio.run(test_fetch_minute_data())
