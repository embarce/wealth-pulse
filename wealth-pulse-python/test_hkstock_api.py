"""
新浪港股新闻 API 测试脚本
测试新创建的 API 端点（需要先用 uvicorn 启动服务）
"""
import httpx
import os

# API 基础 URL
BASE_URL = "http://localhost:8000"

# 认证 Token（需要先登录获取）
# 使用方法：python -c "import requests; r = requests.post('http://localhost:8000/api/auth/token', data={'username': 'your_user', 'password': 'your_pass'}); print(r.json())"
ACCESS_TOKEN = None  # 如果有 token，请填写在这里


def get_token(username: str, password: str) -> str:
    """获取 JWT Token"""
    try:
        response = httpx.post(
            f"{BASE_URL}/api/auth/token",
            data={"username": username, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        if data.get('code') == 200:
            return data['data']['access_token']
        else:
            print(f"获取 Token 失败：{data.get('msg')}")
            return None
    except Exception as e:
        print(f"获取 Token 异常：{e}")
        return None


def get_headers() -> dict:
    """获取请求头（包含认证）"""
    headers = {"Content-Type": "application/json"}
    if ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {ACCESS_TOKEN}"
    elif os.getenv("HKSTOCK_API_TOKEN"):
        headers["Authorization"] = f"Bearer {os.getenv('HKSTOCK_API_TOKEN')}"
    return headers


def test_homepage_news():
    """测试获取港股首页新闻"""
    print("=" * 60)
    print("测试 1: GET /api/hkstock/news/home")
    print("=" * 60)

    try:
        response = httpx.get(
            f"{BASE_URL}/api/hkstock/news/home",
            headers=get_headers(),
            timeout=30.0
        )
        response.raise_for_status()
        result = response.json()

        print(f"状态码：{result.get('code')}")
        print(f"消息：{result.get('msg')}")

        if result.get('code') == 200:
            data = result.get('data', {})
            print(f"\n要闻数量：{len(data.get('important_news', []))}")
            print("\n要闻列表 (前 5 条):")
            for i, news in enumerate(data.get('important_news', [])[:5], 1):
                print(f"  {i}. {news.get('title')}")
                print(f"     URL: {news.get('url')}")

            print(f"\n大行研报 URL: {data.get('rank_url')}")
            print(f"公司新闻 URL: {data.get('company_news_url')}")

            # 显示警告信息
            if data.get('rank_url_fallback'):
                print("\n⚠️  警告：未获取到大行研报 URL，使用默认 URL")
            if data.get('company_news_url_fallback'):
                print("⚠️  警告：未获取到公司新闻 URL，使用默认 URL")

    except httpx.HTTPStatusError as e:
        print(f"HTTP 错误：{e.response.status_code}")
        print(f"响应内容：{e.response.text}")
    except Exception as e:
        print(f"测试失败：{e}")


def test_rank_news():
    """测试获取大行研报"""
    print("\n" + "=" * 60)
    print("测试 2: GET /api/hkstock/news/rank")
    print("=" * 60)

    try:
        response = httpx.get(
            f"{BASE_URL}/api/hkstock/news/rank",
            headers=get_headers(),
            timeout=30.0
        )
        response.raise_for_status()
        result = response.json()

        print(f"状态码：{result.get('code')}")
        print(f"消息：{result.get('msg')}")

        if result.get('code') == 200:
            data = result.get('data', {})

            # 检查是否跳过
            if data.get('skipped'):
                print("\n⚠️  已跳过：未获取到 URL")
                return

            print(f"\n研报数量：{len(data.get('news', []))}")
            if data.get('url_fallback'):
                print("⚠️  警告：使用默认 URL（未从首页获取到）")
            print(f"使用 URL: {data.get('url_used')}")

            print("\n研报列表 (前 5 条):")
            for i, news in enumerate(data.get('news', [])[:5], 1):
                print(f"  {i}. {news.get('title')}")
                print(f"     发布时间：{news.get('publish_time', 'N/A')}")
                print(f"     URL: {news.get('url')}")

    except httpx.HTTPStatusError as e:
        print(f"HTTP 错误：{e.response.status_code}")
        print(f"响应内容：{e.response.text}")
    except Exception as e:
        print(f"测试失败：{e}")


def test_company_news():
    """测试获取公司新闻"""
    print("\n" + "=" * 60)
    print("测试 3: GET /api/hkstock/news/company")
    print("=" * 60)

    try:
        response = httpx.get(
            f"{BASE_URL}/api/hkstock/news/company",
            headers=get_headers(),
            timeout=30.0
        )
        response.raise_for_status()
        result = response.json()

        print(f"状态码：{result.get('code')}")
        print(f"消息：{result.get('msg')}")

        if result.get('code') == 200:
            data = result.get('data', {})

            # 检查是否跳过
            if data.get('skipped'):
                print("\n⚠️  已跳过：未获取到 URL")
                return

            print(f"\n公司新闻数量：{len(data.get('news', []))}")
            if data.get('url_fallback'):
                print("⚠️  警告：使用默认 URL（未从首页获取到）")
            print(f"使用 URL: {data.get('url_used')}")

            print("\n公司新闻列表 (前 5 条):")
            for i, news in enumerate(data.get('news', [])[:5], 1):
                print(f"  {i}. {news.get('title')}")
                print(f"     发布时间：{news.get('publish_time', 'N/A')}")
                print(f"     URL: {news.get('url')}")

    except httpx.HTTPStatusError as e:
        print(f"HTTP 错误：{e.response.status_code}")
        print(f"响应内容：{e.response.text}")
    except Exception as e:
        print(f"测试失败：{e}")


def test_all_news():
    """测试获取所有新闻"""
    print("\n" + "=" * 60)
    print("测试 4: GET /api/hkstock/news/all")
    print("=" * 60)

    try:
        response = httpx.get(
            f"{BASE_URL}/api/hkstock/news/all",
            headers=get_headers(),
            timeout=60.0
        )
        response.raise_for_status()
        result = response.json()

        print(f"状态码：{result.get('code')}")
        print(f"消息：{result.get('msg')}")

        if result.get('code') == 200:
            data = result.get('data', {})

            print(f"\n汇总统计:")
            summary = data.get('summary', {})
            print(f"  - 要闻数量：{summary.get('important_news_count')}")
            print(f"  - 研报数量：{summary.get('rank_news_count')}")
            print(f"  - 公司新闻数量：{summary.get('company_news_count')}")
            print(f"  - 总计：{summary.get('total_count')}")

            # 显示警告信息
            if data.get('warnings'):
                print("\n⚠️  警告信息:")
                for warning in data.get('warnings', []):
                    print(f"    - {warning}")

            print("\n要闻 (前 3 条):")
            for i, news in enumerate(data.get('important_news', [])[:3], 1):
                print(f"  {i}. {news.get('title')}")

            print("\n研报 (前 3 条):")
            for i, news in enumerate(data.get('rank_news', [])[:3], 1):
                print(f"  {i}. {news.get('title')}")

            print("\n公司新闻 (前 3 条):")
            for i, news in enumerate(data.get('company_news', [])[:3], 1):
                print(f"  {i}. {news.get('title')}")

    except httpx.HTTPStatusError as e:
        print(f"HTTP 错误：{e.response.status_code}")
        print(f"响应内容：{e.response.text}")
    except Exception as e:
        print(f"测试失败：{e}")


if __name__ == "__main__":
    print("新浪港股新闻 API 测试开始\n")
    print("请确保已经启动服务：cd wealth-pulse-python && uvicorn app.main:app --reload\n")

    # 尝试获取 Token（如果提供了用户名密码）
    username = os.getenv("HKSTOCK_API_USERNAME")
    password = os.getenv("HKSTOCK_API_PASSWORD")
    if username and password:
        print(f"正在为用户 {username} 获取 Token...")
        token = get_token(username, password)
        if token:
            ACCESS_TOKEN = token
            print(f"获取 Token 成功：{token[:20]}...")

    # 运行所有测试
    test_homepage_news()
    test_rank_news()
    test_company_news()
    test_all_news()

    print("\n" + "=" * 60)
    print("所有 API 测试完成")
    print("=" * 60)
