"""
测试新浪财经新闻爬虫
"""
import asyncio
from pathlib import Path

# 测试本地HTML文件
def test_local_html():
    """测试解析本地HTML文件"""
    from bs4 import BeautifulSoup

    html_path = Path("html/xp-9868.HK.html")
    if not html_path.exists():
        print(f"HTML file not found: {html_path}")
        return

    with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')

    # 查找新闻列表
    news_list = soup.find('ul', class_='list01', id='js_ggzx')

    if not news_list:
        print("No news list found!")
        return

    # 提取新闻项
    news_items = []
    list_items = news_list.find_all('li')

    for li in list_items:
        # 跳过空白项
        if not li.text.strip():
            continue

        # 提取链接和标题
        link_tag = li.find('a')
        if not link_tag:
            continue

        title = link_tag.get('title', '').strip()
        if not title:
            title = link_tag.text.strip()

        news_url = link_tag.get('href', '').strip()

        # 提取发布时间
        time_tag = li.find('span', class_='rt')
        publish_time = time_tag.text.strip() if time_tag else None

        # 只添加有效新闻
        if title and news_url:
            news_items.append({
                'title': title,
                'url': news_url,
                'datasource': '新浪财经',
                'publish_time': publish_time
            })

    print(f"Found {len(news_items)} news items:")
    for i, item in enumerate(news_items[:5], 1):
        print(f"\n{i}. {item['title']}")
        print(f"   URL: {item['url']}")
        print(f"   Time: {item['publish_time']}")
        print(f"   Source: {item['datasource']}")


def test_stock_code_normalization():
    """测试股票代码标准化"""
    # 直接在这里定义函数
    def normalize_stock_code(stock_code: str) -> str:
        code = stock_code.replace('.HK', '').replace('.hk', '')
        if len(code) < 5:
            code = code.zfill(5)
        return code

    test_cases = [
        ("0700.HK", "00700"),
        ("9868.HK", "09868"),
        ("09868.HK", "09868"),
        ("700.HK", "00700"),
        ("00700.HK", "00700"),
    ]

    print("\n股票代码标准化测试:")
    for input_code, expected in test_cases:
        result = normalize_stock_code(input_code)
        status = "PASS" if result == expected else "FAIL"
        print(f"{status}: {input_code} -> {result} (expected: {expected})")


def test_live_crawl():
    """测试实际爬取（如果需要）"""
    import asyncio
    import sys
    sys.path.insert(0, '.')

    async def fetch():
        from app.services.sina_news_crawler import sina_news_crawler

        try:
            stock_code = "09868.HK"
            print(f"\n正在爬取 {stock_code} 的新闻...")

            news_items = await sina_news_crawler.fetch_stock_news(stock_code)

            print(f"成功爬取 {len(news_items)} 条新闻:")
            for i, item in enumerate(news_items[:5], 1):
                print(f"\n{i}. {item['title']}")
                print(f"   URL: {item['url']}")
                print(f"   Time: {item['publish_time']}")

        except Exception as e:
            print(f"爬取失败: {str(e)}")
            import traceback
            traceback.print_exc()

    asyncio.run(fetch())


if __name__ == "__main__":
    print("=" * 60)
    print("新浪财经新闻爬虫测试")
    print("=" * 60)

    # 测试1: 解析本地HTML
    print("\n[测试1] 解析本地HTML文件")
    test_local_html()

    # 测试2: 股票代码标准化
    print("\n" + "=" * 60)
    test_stock_code_normalization()

    # 测试3: 实际爬取（可选）
    print("\n" + "=" * 60)
    choice = input("\n是否测试实际爬取? (y/n): ")
    if choice.lower() == 'y':
        test_live_crawl()
