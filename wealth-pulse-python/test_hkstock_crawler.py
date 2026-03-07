"""
新浪港股信息爬虫测试脚本
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.sina_hkstock_crawler import SinaHKStockCrawler


def test_fetch_hkstock_news():
    """测试获取港股首页新闻"""
    print("=" * 60)
    print("测试 1: 获取港股首页新闻（要闻 + 研报 URL+ 公司新闻 URL）")
    print("=" * 60)

    crawler = SinaHKStockCrawler()

    try:
        result = crawler.fetch_hkstock_news_sync()

        print(f"\n要闻数量：{len(result['important_news'])}")
        print("\n要闻列表:")
        for i, news in enumerate(result['important_news'][:5], 1):
            print(f"  {i}. {news['title']}")
            print(f"     URL: {news['url']}")

        print(f"\n大行研报 URL: {result['rank_url']}")
        print(f"公司新闻 URL: {result['company_news_url']}")

        # 显示警告信息
        if result.get('rank_url_fallback'):
            print("\n⚠️  警告：未获取到大行研报 URL，使用默认 URL")
        if result.get('company_news_url_fallback'):
            print("⚠️  警告：未获取到公司新闻 URL，使用默认 URL")

    except Exception as e:
        print(f"测试失败：{e}")


def test_fetch_rank_news():
    """测试获取大行研报"""
    print("\n" + "=" * 60)
    print("测试 2: 获取大行研报")
    print("=" * 60)

    crawler = SinaHKStockCrawler()

    try:
        result = crawler.fetch_rank_news_sync()

        # 检查是否跳过
        if result.get('skipped'):
            print("\n⚠️  已跳过：未获取到 URL")
            return

        print(f"\n研报数量：{len(result['news'])}")
        if result.get('url_fallback'):
            print("⚠️  警告：使用默认 URL（未从首页获取到）")
        print(f"使用 URL: {result['url_used']}")

        print("\n研报列表 (前 5 条):")
        for i, news in enumerate(result['news'][:5], 1):
            print(f"  {i}. {news['title']}")
            print(f"     发布时间：{news.get('publish_time', 'N/A')}")
            print(f"     URL: {news['url']}")

    except Exception as e:
        print(f"测试失败：{e}")


def test_fetch_company_news():
    """测试获取公司新闻"""
    print("\n" + "=" * 60)
    print("测试 3: 获取公司新闻")
    print("=" * 60)

    crawler = SinaHKStockCrawler()

    try:
        result = crawler.fetch_company_news_sync()

        # 检查是否跳过
        if result.get('skipped'):
            print("\n⚠️  已跳过：未获取到 URL")
            return

        print(f"\n公司新闻数量：{len(result['news'])}")
        if result.get('url_fallback'):
            print("⚠️  警告：使用默认 URL（未从首页获取到）")
        print(f"使用 URL: {result['url_used']}")

        print("\n公司新闻列表 (前 5 条):")
        for i, news in enumerate(result['news'][:5], 1):
            print(f"  {i}. {news['title']}")
            print(f"     发布时间：{news.get('publish_time', 'N/A')}")
            print(f"     URL: {news['url']}")

    except Exception as e:
        print(f"测试失败：{e}")


def test_fetch_all_news():
    """测试获取所有新闻"""
    print("\n" + "=" * 60)
    print("测试 4: 获取所有港股新闻（汇总）")
    print("=" * 60)

    crawler = SinaHKStockCrawler()

    try:
        result = crawler.fetch_all_news_sync()

        print(f"\n汇总统计:")
        print(f"  - 要闻数量：{result['summary']['important_news_count']}")
        print(f"  - 研报数量：{result['summary']['rank_news_count']}")
        print(f"  - 公司新闻数量：{result['summary']['company_news_count']}")
        print(f"  - 总计：{result['summary']['total_count']}")

        # 显示警告信息
        if result.get('warnings'):
            print("\n⚠️  警告信息:")
            for warning in result['warnings']:
                print(f"    - {warning}")

        print("\n要闻 (前 3 条):")
        for i, news in enumerate(result['important_news'][:3], 1):
            print(f"  {i}. {news['title']}")

        print("\n研报 (前 3 条):")
        for i, news in enumerate(result['rank_news'][:3], 1):
            print(f"  {i}. {news['title']}")

        print("\n公司新闻 (前 3 条):")
        for i, news in enumerate(result['company_news'][:3], 1):
            print(f"  {i}. {news['title']}")

    except Exception as e:
        print(f"测试失败：{e}")


if __name__ == "__main__":
    print("新浪港股信息爬虫测试开始\n")

    # 运行所有测试
    test_fetch_hkstock_news()
    test_fetch_rank_news()
    test_fetch_company_news()
    test_fetch_all_news()

    print("\n" + "=" * 60)
    print("所有测试完成")
    print("=" * 60)
