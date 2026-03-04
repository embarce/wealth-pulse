"""
K 线分析 API 测试脚本
测试 /api/ai/analyze-kline 接口（无需认证）
"""
import requests
import json

# 配置
BASE_URL = "http://localhost:8010"
ANALYZE_URL = f"{BASE_URL}/api/ai/analyze-kline"


def analyze_kline(stock_code, kline_data, stock_info=None, current_price=None, provider=None, model=None):
    """
    分析 K 线（无需认证）
    
    Args:
        stock_code: 股票代码
        kline_data: K 线数据列表
        stock_info: 股票基本信息（可选）
        current_price: 当前价格（可选）
        provider: LLM 供应商（可选）
        model: 模型名称（可选）
    
    Returns:
        API 响应结果
    """
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "stock_code": stock_code,
        "kline_data": kline_data,
        "period": "daily"
    }
    
    if stock_info:
        payload["stock_info"] = stock_info
    if current_price:
        payload["current_price"] = float(current_price)
    if provider:
        payload["provider"] = provider
    if model:
        payload["model"] = model
    
    response = requests.post(ANALYZE_URL, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()


def main():
    # 1. 准备股票信息（可选）
    stock_info = {
        "stock_code": "0700.HK",
        "company_name": "腾讯控股有限公司",
        "industry": "互联网"
    }
    
    # 2. 准备 K 线数据（示例：腾讯控股 0700.HK 最近 10 个交易日）
    kline_data = [
        {"date": "2026-02-14", "open": 415.0, "high": 420.0, "low": 412.0, "close": 418.5, "volume": 12000000, "amount": 5000000000},
        {"date": "2026-02-17", "open": 419.0, "high": 425.0, "low": 417.0, "close": 423.0, "volume": 15000000, "amount": 6300000000},
        {"date": "2026-02-18", "open": 423.5, "high": 428.0, "low": 421.0, "close": 426.5, "volume": 14000000, "amount": 5950000000},
        {"date": "2026-02-19", "open": 427.0, "high": 432.0, "low": 425.0, "close": 430.0, "volume": 16000000, "amount": 6880000000},
        {"date": "2026-02-20", "open": 430.5, "high": 435.0, "low": 428.0, "close": 433.5, "volume": 18000000, "amount": 7800000000},
        {"date": "2026-02-21", "open": 434.0, "high": 438.0, "low": 432.0, "close": 436.0, "volume": 17000000, "amount": 7400000000},
        {"date": "2026-02-24", "open": 436.5, "high": 440.0, "low": 434.0, "close": 438.5, "volume": 15000000, "amount": 6570000000},
        {"date": "2026-02-25", "open": 439.0, "high": 442.0, "low": 436.0, "close": 440.0, "volume": 14000000, "amount": 6160000000},
        {"date": "2026-02-26", "open": 440.5, "high": 445.0, "low": 438.0, "close": 443.0, "volume": 16000000, "amount": 7080000000},
        {"date": "2026-02-27", "open": 443.5, "high": 448.0, "low": 441.0, "close": 446.0, "volume": 18000000, "amount": 8020000000},
    ]
    
    # 3. 调用 K 线分析 API（无需认证）
    print(f"\n正在分析股票 0700.HK 的 K 线...")
    result = analyze_kline(
        stock_code="0700.HK",
        kline_data=kline_data,
        stock_info=stock_info,
        current_price=446.0,
        provider="doubao",  # 可选：doubao, openai, qwen 等
        model="ep-20250226185244-dxp9w"  # 可选：指定模型
    )
    
    # 4. 打印结果
    print("\n===== K 线分析结果 =====")
    data = result.get("data", {})
    print(f"股票代码：{data.get('stock_code')}")
    print(f"当前价格：{data.get('current_price')}")
    print(f"趋势判断：{data.get('trend')}")
    print(f"趋势说明：{data.get('trend_description')}")
    print(f"综合建议：{data.get('recommendation')}")
    print(f"建议说明：{data.get('recommendation_reason')}")
    print(f"风险等级：{data.get('risk_level')}")
    print(f"目标价格：{data.get('target_price_range')}")
    
    print("\n技术点位:")
    for tp in data.get('technical_points', []):
        print(f"  - 类型：{tp.get('type')}, 价格：{tp.get('price')}, 强度：{tp.get('strength')}, 说明：{tp.get('description')}")
    
    print(f"\n分析说明：{data.get('analysis_note')}")
    print(f"\nAPI 响应码：{result.get('code')}, 消息：{result.get('msg')}")


if __name__ == "__main__":
    main()
