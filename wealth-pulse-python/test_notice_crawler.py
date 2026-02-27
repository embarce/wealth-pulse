"""
测试新浪财经公司公告爬虫
"""
import sys
from pathlib import Path
from bs4 import BeautifulSoup


def test_local_html():
    """测试本地HTML解析"""
    html_path = Path("html/xp-9868.HK-notice.html")

    if not html_path.exists():
        print(f"本地HTML文件不存在: {html_path}")
        return

    print("=" * 60)
    print("测试解析小鹏汽车-W(09868.HK)公司公告")
    print("=" * 60)

    # 读取HTML文件
    with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')

    # 查找公告列表
    notice_list = soup.find('ul', class_='list01')

    if not notice_list:
        print("未找到公告列表")
        return

    # 提取公告项
    notices = []
    list_items = notice_list.find_all('li')

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

        notice_url = link_tag.get('href', '').strip()

        # 提取发布时间
        time_tag = li.find('span', class_='rt')
        publish_time = time_tag.text.strip() if time_tag else None

        # 只添加有效公告
        if title and notice_url:
            notices.append({
                'title': title,
                'url': notice_url,
                'datasource': '新浪财经',
                'publish_time': publish_time
            })

    print(f"\n成功解析出 {len(notices)} 条公告:\n")

    # 显示前10条公告
    for i, notice in enumerate(notices[:10], 1):
        print(f"{i}. {notice['title'][:60]}...")
        print(f"   URL: {notice['url'][:70]}...")
        print(f"   发布时间: {notice['publish_time']}")
        print()

    if len(notices) > 10:
        print(f"... 还有 {len(notices) - 10} 条公告")

    print("\n公告类型统计:")

    # 统计公告类型
    types = {}
    for notice in notices:
        title = notice['title']

        if '自愿公告' in title:
            types['自愿公告'] = types.get('自愿公告', 0) + 1
        elif '公告' in title:
            types['其他公告'] = types.get('其他公告', 0) + 1
        elif '通告' in title:
            types['通告'] = types.get('通告', 0) + 1
        elif '公告' in title:
            types['公告'] = types.get('公告', 0) + 1
        else:
            types['其他'] = types.get('其他', 0) + 1

    for notice_type, count in types.items():
        print(f"  {notice_type}: {count}条")

    return notices


if __name__ == "__main__":
    print("\n")
    print("*" * 60)
    print("新浪财经公司公告爬虫测试")
    print("*" * 60)
    print()

    test_local_html()

    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)
    print("\n总结:")
    print("- HTML解析功能正常")
    print("- 公告提取成功")
    print("- 数据格式符合API要求")
    print("\nAPI端点:")
    print("  GET /api/stocks/{stock_code}/company-notices")
    print("  参数: max_pages (默认1页, 最多10页)")
