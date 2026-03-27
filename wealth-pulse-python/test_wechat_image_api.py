"""
测试微信图片生成 API
"""
import requests
import json

# 配置
API_BASE_URL = "http://127.0.0.1:8010"
API_TOKEN = "your-test-token-here"

# 测试 HTML 内容
TEST_HTML = """
<h1>港股市场分析报告</h1>
<p>日期：2026-03-15</p>
<h2>市场快照</h2>
<p>恒生指数：18500.25 (+2.5%)</p>
<p>成交额：1200 亿港元</p>
<h2>投资报告</h2>
<p>今日港股市场呈现强势上涨态势，科技股领涨...</p>
"""


def test_generate_image():
    """测试图片生成接口"""
    url = f"{API_BASE_URL}/api/wechat/generate-analysis-image"

    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }

    data = {
        "html_content": TEST_HTML,
        "report_date": "2026-03-15"
    }

    print(f"请求 URL: {url}")
    print(f"请求数据：{json.dumps(data, indent=2, ensure_ascii=False)}")

    try:
        response = requests.post(url, headers=headers, json=data, timeout=60)
        response.raise_for_status()

        result = response.json()
        print(f"\n响应结果：{json.dumps(result, indent=2, ensure_ascii=False)}")

        if result.get("code") == 200:
            image_path = result.get("data", {}).get("image_path")
            print(f"\n图片生成成功！路径：{image_path}")
            return True
        else:
            print(f"\n图片生成失败：{result.get('msg')}")
            return False

    except requests.exceptions.Timeout:
        print("请求超时！")
        return False
    except requests.exceptions.RequestException as e:
        print(f"请求失败：{str(e)}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("微信图片生成 API 测试")
    print("=" * 60)

    success = test_generate_image()

    print("\n" + "=" * 60)
    if success:
        print("测试通过!")
    else:
        print("测试失败!")
