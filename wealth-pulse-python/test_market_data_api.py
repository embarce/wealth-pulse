"""
测试市场数据刷新 API
"""
import requests
import json

# 配置
BASE_URL = "http://localhost:8000"
USERNAME = "test"
PASSWORD = "test123"


def login():
    """登录获取 token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/token",
        data={
            "username": USERNAME,
            "password": PASSWORD
        }
    )
    if response.status_code == 200:
        data = response.json()
        token = data.get("data", {}).get("access_token")
        print(f"登录成功，token: {token[:20]}...")
        return token
    else:
        print(f"登录失败：{response.status_code} - {response.text}")
        return None


def test_refresh_today(token):
    """测试刷新今日市场数据"""
    headers = {"Authorization": f"Bearer {token}"}

    print("\n=== 测试刷新今日市场数据 ===")
    response = requests.post(
        f"{BASE_URL}/api/market-data/refresh/today",
        headers=headers
    )
    print(f"状态码：{response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def test_refresh_single(token, stock_code="0700.HK"):
    """测试刷新单只股票今日数据"""
    headers = {"Authorization": f"Bearer {token}"}

    print(f"\n=== 测试刷新单只股票 {stock_code} 今日数据 ===")
    response = requests.post(
        f"{BASE_URL}/api/market-data/refresh/today/{stock_code}",
        headers=headers
    )
    print(f"状态码：{response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def test_get_today(token):
    """测试获取今日市场数据"""
    headers = {"Authorization": f"Bearer {token}"}

    print("\n=== 测试获取今日市场数据 ===")
    response = requests.get(
        f"{BASE_URL}/api/market-data/today",
        headers=headers
    )
    print(f"状态码：{response.status_code}")
    result = response.json()
    data = result.get("data", {})
    print(f"市场日期：{data.get('market_date')}")
    print(f"股票数量：{data.get('total_stocks')}")
    if data.get("stocks"):
        print("前 3 只股票:")
        for stock in data["stocks"][:3]:
            print(f"  - {stock['stock_code']}: {stock['last_price']}")
    return result


def test_get_today_single(token, stock_code="0700.HK"):
    """测试获取单只股票今日数据"""
    headers = {"Authorization": f"Bearer {token}"}

    print(f"\n=== 测试获取单只股票 {stock_code} 今日数据 ===")
    response = requests.get(
        f"{BASE_URL}/api/market-data/today?stock_code={stock_code}",
        headers=headers
    )
    print(f"状态码：{response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


if __name__ == "__main__":
    print("=" * 60)
    print("市场数据刷新 API 测试")
    print("=" * 60)

    # 1. 登录
    token = login()
    if not token:
        print("\n登录失败，无法继续测试")
        exit(1)

    # 2. 测试刷新今日数据（可选，耗时较长）
    # test_refresh_today(token)

    # 3. 测试刷新单只股票
    test_refresh_single(token, "0700.HK")

    # 4. 测试获取今日数据
    test_get_today_single(token, "0700.HK")

    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)
