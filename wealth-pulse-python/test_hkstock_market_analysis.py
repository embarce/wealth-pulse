"""
测试港股市场 AI 分析功能

运行此脚本测试港股市场分析功能：
1. 爬取新浪财经港股新闻（要闻 + 研报 + 公司新闻）
2. 调用 LLM 进行分析
3. 输出 Markdown 格式的投资建议报告
"""
import sys
import os
import logging

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

from app.services.sina_hkstock_crawler import SinaHKStockCrawler
from app.services.stock_analysis_service import StockAnalysisService


def test_fetch_news():
    """测试新闻爬取功能"""
    print("=" * 60)
    print("测试 1: 爬取港股新闻")
    print("=" * 60)

    crawler = SinaHKStockCrawler()
    news_data = crawler.fetch_all_news_sync()

    print(f"\n爬取结果:")
    print(f"  - 要闻数量：{news_data['summary']['important_news_count']}")
    print(f"  - 大行研报数量：{news_data['summary']['rank_news_count']}")
    print(f"  - 公司新闻数量：{news_data['summary']['company_news_count']}")
    print(f"  - 总计：{news_data['summary']['total_count']}")

    if news_data.get('warnings'):
        print(f"\n警告信息:")
        for warning in news_data['warnings']:
            print(f"  - {warning}")

    print("\n最近 5 条要闻:")
    for i, news in enumerate(news_data['important_news'][:5], 1):
        print(f"  {i}. {news['title']}")

    print("\n最近 5 条研报:")
    for i, news in enumerate(news_data['rank_news'][:5], 1):
        print(f"  {i}. {news['title']}")

    print("\n最近 5 条公司新闻:")
    for i, news in enumerate(news_data['company_news'][:5], 1):
        print(f"  {i}. {news['title']}")

    return news_data


def test_analyze_market(news_data=None):
    """测试 AI 分析功能"""
    print("\n" + "=" * 60)
    print("测试 2: AI 分析港股市场")
    print("=" * 60)

    # 创建分析服务（db 参数在此功能中未实际使用）
    analysis_service = StockAnalysisService(db=None)  # type: ignore

    print("\n正在调用 LLM 进行分析...")
    print("(这可能需要 30-60 秒)")

    # 执行分析
    report = analysis_service.analyze_hkstock_market_sync(
        news_data=news_data,
        provider=None,  # 使用默认 provider
        model=None      # 使用默认 model
    )

    print("\n" + "=" * 60)
    print("AI 分析报告")
    print("=" * 60)
    print(report)

    return report


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("港股市场 AI 分析功能测试")
    print("=" * 60)

    try:
        # 测试 1: 爬取新闻
        news_data = test_fetch_news()

        # 测试 2: AI 分析
        report = test_analyze_market(news_data=news_data)

        # 保存报告到文件
        output_file = os.path.join(os.path.dirname(__file__), "hkstock_market_report.md")
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(report)

        print("\n" + "=" * 60)
        print(f"报告已保存到：{output_file}")
        print("=" * 60)

    except Exception as e:
        print(f"\n测试失败：{str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
