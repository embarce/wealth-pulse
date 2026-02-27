"""
测试新浪财经财务指标爬虫
"""
import sys
from pathlib import Path
from bs4 import BeautifulSoup
import json


def test_local_html():
    """测试本地HTML解析"""
    html_path = Path("html/xp-9868.HK-finance.html")

    if not html_path.exists():
        print(f"本地HTML文件不存在: {html_path}")
        return

    print("=" * 60)
    print("测试解析小米集团(01810.HK)财务指标")
    print("=" * 60)

    # 读取HTML文件
    with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')

    # 导入爬虫类
    from app.services.sina_finance_crawler import SinaFinanceCrawler
    crawler = SinaFinanceCrawler()

    # 测试1: 提取重要财务指标
    print("\n【测试1】提取重要财务指标")
    print("-" * 60)

    key_financials = crawler._extract_key_financials(soup)
    print(f"找到 {len(key_financials)} 个报告期的数据\n")

    if key_financials:
        latest = key_financials[0]
        print("最新报告期:")
        print(f"  截止日期: {latest.get('end_date', 'N/A')}")
        print(f"  报表类型: {latest.get('report_type', 'N/A')}")
        print(f"  公告日期: {latest.get('announcement_date', 'N/A')}")
        print(f"  营业额: {latest.get('revenue', 'N/A')} 百万元")
        print(f"  损益额: {latest.get('net_profit', 'N/A')} 百万元")
        print(f"  基本每股盈利: {latest.get('eps_basic', 'N/A')} 仙")

    # 测试2: 提取损益表数据
    print("\n【测试2】提取综合损益表数据")
    print("-" * 60)

    profit_loss = crawler._extract_profit_loss(soup)
    print("损益表数据:")
    for key, value in profit_loss.items():
        print(f"  {key}: {value}")

    # 测试3: 提取资产负债表数据
    print("\n【测试3】提取资产负债表数据")
    print("-" * 60)

    balance_sheet = crawler._extract_balance_sheet(soup)
    print("资产负债表数据:")
    for key, value in balance_sheet.items():
        print(f"  {key}: {value}")

    # 测试4: 提取现金流量表数据
    print("\n【测试4】提取现金流量表数据")
    print("-" * 60)

    cash_flow = crawler._extract_cash_flow(soup)
    print("现金流量表数据:")
    for key, value in cash_flow.items():
        print(f"  {key}: {value}")

    # 测试5: 计算财务比率
    print("\n【测试5】计算财务比率")
    print("-" * 60)

    ratios = crawler._calculate_ratios(profit_loss, balance_sheet)
    print("计算的财务比率:")
    for key, value in ratios.items():
        print(f"  {key}: {value}")

    # 测试6: 模拟完整结果
    print("\n【测试6】完整财务指标数据结构")
    print("-" * 60)

    if key_financials:
        latest = key_financials[0]
        result = {
            'stock_code': '01810.HK',
            'datasource': '新浪财经',
            'latest_period': {
                'end_date': latest.get('end_date'),
                'report_type': latest.get('report_type'),
                'announcement_date': latest.get('announcement_date'),
            },
            'profitability': {
                'revenue': profit_loss.get('revenue'),
                'net_profit': profit_loss.get('net_profit'),
                'gross_profit_margin': ratios.get('gross_profit_margin'),
                'net_profit_margin': ratios.get('net_profit_margin'),
                'eps_basic': latest.get('eps_basic'),
                'operating_profit': profit_loss.get('operating_profit'),
            },
            'financial_health': {
                'current_ratio': ratios.get('current_ratio'),
                'debt_ratio': ratios.get('debt_ratio'),
                'operating_cash_flow': cash_flow.get('operating_cash_flow'),
                'current_assets': balance_sheet.get('current_assets'),
                'current_liabilities': balance_sheet.get('current_liabilities'),
                'total_equity': balance_sheet.get('total_equity'),
            }
        }

        print("\n盈利能力:")
        print(f"  营业收入: {result['profitability']['revenue']} 百万元")
        print(f"  净利润: {result['profitability']['net_profit']} 百万元")
        print(f"  毛利率: {result['profitability']['gross_profit_margin']}%")
        print(f"  净利率: {result['profitability']['net_profit_margin']}%")
        print(f"  基本每股盈利: {result['profitability']['eps_basic']} 仙")
        print(f"  经营盈利: {result['profitability']['operating_profit']} 百万元")

        print("\n财务健康:")
        print(f"  流动比率: {result['financial_health']['current_ratio']}")
        print(f"  负债率: {result['financial_health']['debt_ratio']}%")
        print(f"  经营现金流: {result['financial_health']['operating_cash_flow']} 百万元")
        print(f"  流动资产: {result['financial_health']['current_assets']} 百万元")
        print(f"  流动负债: {result['financial_health']['current_liabilities']} 百万元")
        print(f"  股东权益: {result['financial_health']['total_equity']} 百万元")

    print("\n【数据说明】")
    print("-" * 60)
    print("可从新浪财经页面获取的指标:")
    print("  - 营业收入、净利润、经营盈利")
    print("  - 基本每股盈利、摊薄每股盈利")
    print("  - 毛利率、净利率（通过计算得出）")
    print("  - 流动比率、负债率（通过计算得出）")
    print("  - 经营现金流")
    print("\n需要其他数据源的指标:")
    print("  - 市盈率 (PE)")
    print("  - 市净率 (PB)")
    print("  - 股息率")
    print("  - ROE (净资产收益率)")
    print("\n建议:")
    print("  - 使用 AkShare stock_hk_financial_indicator_em 接口获取PE、PB、ROE等指标")
    print("  - 或者结合实时股价数据自行计算PE、PB等比率")

    return result


def test_normalization():
    """测试股票代码标准化"""
    print("\n" + "=" * 60)
    print("股票代码标准化测试")
    print("=" * 60)

    test_cases = [
        ("01810.HK", "01810"),
        ("1810.HK", "01810"),
        ("00700.HK", "00700"),
        ("700.HK", "00700"),
        ("09868.HK", "09868"),
    ]

    for input_code, expected in test_cases:
        code = input_code.replace('.HK', '').replace('.hk', '')
        if len(code) < 5:
            code = code.zfill(5)

        result = code
        status = "OK" if result == expected else "FAIL"
        print(f"{status}: {input_code} -> {result} (expected: {expected})")


if __name__ == "__main__":
    print("\n")
    print("*" * 60)
    print("新浪财经财务指标爬虫测试")
    print("*" * 60)

    # 测试1: 股票代码标准化
    test_normalization()

    # 测试2: 本地HTML解析
    print("\n开始测试本地HTML解析...")
    test_local_html()

    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)
