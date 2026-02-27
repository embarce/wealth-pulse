"""
简化版测试 - 直接测试财务指标爬虫
"""
import sys
from pathlib import Path
from bs4 import BeautifulSoup
import re


def parse_number(value_str):
    """解析数字字符串"""
    if not value_str or value_str.strip() in ['--', '', '-', '0']:
        return None

    try:
        cleaned = re.sub(r'[,\s]', '', str(value_str))
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def extract_key_financials(soup):
    """提取重要财务指标表格数据"""
    financial_data = []

    table = soup.find('table', class_='tab05')

    if not table:
        print("未找到财务指标表格")
        return financial_data

    rows = table.find_all('tr')

    if len(rows) < 5:
        print("数据行数不足")
        return financial_data

    # 确定列数
    date_row = rows[1]
    cells = date_row.find_all(['td', 'th'])
    num_periods = len(cells) - 1 if len(cells) > 1 else 0

    print(f"找到 {num_periods} 个报告期的数据")

    # 初始化每个时期的数据结构
    periods_data = []
    for i in range(num_periods):
        periods_data.append({
            'period_index': i,
            'start_date': None,
            'end_date': None,
            'announcement_date': None,
            'report_type': None
        })

    # 解析每一行数据
    for row in rows:
        cells = row.find_all(['td', 'th'])
        if not cells:
            continue

        label = cells[0].get_text(strip=True)

        # 解析每个时期的数据
        for i in range(min(num_periods, len(cells) - 1)):
            cell_index = i + 1
            value_str = cells[cell_index].get_text(strip='')

            if label == '开始日期':
                periods_data[i]['start_date'] = value_str
            elif label == '截止日期':
                periods_data[i]['end_date'] = value_str
            elif label == '公告日期':
                periods_data[i]['announcement_date'] = value_str
            elif label == '报表类型':
                periods_data[i]['report_type'] = value_str
            elif label == '营业额':
                periods_data[i]['revenue'] = parse_number(value_str)
            elif label == '损益额':
                periods_data[i]['net_profit'] = parse_number(value_str)
            elif label == '基本每股盈利(仙)':
                periods_data[i]['eps_basic'] = parse_number(value_str)

    return periods_data


def find_profit_loss_table(soup):
    """查找损益表"""
    tables = soup.find_all('table', class_='tab05')

    for table in tables:
        table_text = table.get_text()
        if '毛利' in table_text and '经营盈利' in table_text:
            return table

    return None


def extract_profit_loss(soup):
    """提取损益表数据"""
    profit_loss = {}

    table = find_profit_loss_table(soup)

    if not table:
        print("未找到损益表")
        return profit_loss

    rows = table.find_all('tr')

    for row in rows:
        cells = row.find_all(['td', 'th'])
        if len(cells) < 2:
            continue

        label = cells[0].get_text(strip='')
        value = parse_number(cells[1].get_text(strip=''))

        if label == '营业额':
            profit_loss['revenue'] = value
        elif label == '毛利':
            profit_loss['gross_profit'] = value
        elif label == '经营盈利':
            profit_loss['operating_profit'] = value
        elif label == '损益额':
            profit_loss['net_profit'] = value

    return profit_loss


def find_balance_sheet_table(soup):
    """查找资产负债表"""
    tables = soup.find_all('table', class_='tab05')

    for table in tables:
        table_text = table.get_text()
        if '流动资产合计' in table_text or '非流动资产合计' in table_text:
            return table

    return None


def extract_balance_sheet(soup):
    """提取资产负债表数据"""
    balance_sheet = {}

    table = find_balance_sheet_table(soup)

    if not table:
        print("未找到资产负债表")
        return balance_sheet

    rows = table.find_all('tr')

    for row in rows:
        cells = row.find_all(['td', 'th'])
        if len(cells) < 2:
            continue

        label = cells[0].get_text(strip='')
        value = parse_number(cells[1].get_text(strip=''))

        if '流动资产合计' in label:
            balance_sheet['current_assets'] = value
        elif '流动负债合计' in label:
            balance_sheet['current_liabilities'] = value
        elif '负债总计' in label:
            balance_sheet['total_liabilities'] = value
        elif '股东权益合计' in label:
            balance_sheet['total_equity'] = value

    return balance_sheet


def find_cash_flow_table(soup):
    """查找现金流量表"""
    tables = soup.find_all('table', class_='tab05')

    for table in tables:
        table_text = table.get_text()
        if '经营活动现金流量' in table_text and '现金流量净额' in table_text:
            return table

    return None


def extract_cash_flow(soup):
    """提取现金流量表数据"""
    cash_flow = {}

    table = find_cash_flow_table(soup)

    if not table:
        print("未找到现金流量表")
        return cash_flow

    rows = table.find_all('tr')

    for row in rows:
        cells = row.find_all(['td', 'th'])
        if len(cells) < 2:
            continue

        label = cells[0].get_text(strip='')
        value = parse_number(cells[1].get_text(strip=''))

        if '经营' in label and '现金流量净额' in label:
            cash_flow['operating_cash_flow'] = value
        elif '投资' in label and '现金流量净额' in label:
            cash_flow['investing_cash_flow'] = value
        elif '筹资' in label and '现金流量净额' in label:
            cash_flow['financing_cash_flow'] = value

    return cash_flow


def calculate_ratios(profit_loss, balance_sheet):
    """计算财务比率"""
    ratios = {}

    # 计算毛利率
    if profit_loss.get('gross_profit') and profit_loss.get('revenue'):
        if profit_loss['revenue'] != 0:
            ratios['gross_profit_margin'] = round(
                (profit_loss['gross_profit'] / profit_loss['revenue']) * 100, 2
            )

    # 计算净利率
    if profit_loss.get('net_profit') and profit_loss.get('revenue'):
        if profit_loss['revenue'] != 0:
            ratios['net_profit_margin'] = round(
                (profit_loss['net_profit'] / profit_loss['revenue']) * 100, 2
            )

    # 计算流动比率
    if balance_sheet.get('current_assets') and balance_sheet.get('current_liabilities'):
        if balance_sheet['current_liabilities'] != 0:
            ratios['current_ratio'] = round(
                balance_sheet['current_assets'] / balance_sheet['current_liabilities'], 2
            )

    # 计算负债率
    if balance_sheet.get('total_liabilities') and balance_sheet.get('total_equity'):
        total_assets = balance_sheet['total_liabilities'] + balance_sheet['total_equity']
        if total_assets != 0:
            ratios['debt_ratio'] = round(
                (balance_sheet['total_liabilities'] / total_assets) * 100, 2
            )

    return ratios


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

    # 提取各类财务数据
    print("\n[1/6] 提取重要财务指标...")
    key_financials = extract_key_financials(soup)

    print("\n[2/6] 提取综合损益表数据...")
    profit_loss = extract_profit_loss(soup)
    print(f"  营业额: {profit_loss.get('revenue', 'N/A')}")
    print(f"  毛利: {profit_loss.get('gross_profit', 'N/A')}")
    print(f"  经营盈利: {profit_loss.get('operating_profit', 'N/A')}")
    print(f"  净利润: {profit_loss.get('net_profit', 'N/A')}")

    print("\n[3/6] 提取资产负债表数据...")
    balance_sheet = extract_balance_sheet(soup)
    print(f"  流动资产: {balance_sheet.get('current_assets', 'N/A')}")
    print(f"  流动负债: {balance_sheet.get('current_liabilities', 'N/A')}")
    print(f"  总负债: {balance_sheet.get('total_liabilities', 'N/A')}")
    print(f"  股东权益: {balance_sheet.get('total_equity', 'N/A')}")

    print("\n[4/6] 提取现金流量表数据...")
    cash_flow = extract_cash_flow(soup)
    print(f"  经营现金流: {cash_flow.get('operating_cash_flow', 'N/A')}")
    print(f"  投资现金流: {cash_flow.get('investing_cash_flow', 'N/A')}")
    print(f"  筹资现金流: {cash_flow.get('financing_cash_flow', 'N/A')}")

    print("\n[5/6] 计算财务比率...")
    ratios = calculate_ratios(profit_loss, balance_sheet)
    print(f"  毛利率: {ratios.get('gross_profit_margin', 'N/A')}%")
    print(f"  净利率: {ratios.get('net_profit_margin', 'N/A')}%")
    print(f"  流动比率: {ratios.get('current_ratio', 'N/A')}")
    print(f"  负债率: {ratios.get('debt_ratio', 'N/A')}%")

    print("\n[6/6] 完整财务指标数据结构...")

    if key_financials:
        latest = key_financials[0]

        print("\n最新报告期信息:")
        print(f"  截止日期: {latest.get('end_date', 'N/A')}")
        print(f"  报表类型: {latest.get('report_type', 'N/A')}")
        print(f"  公告日期: {latest.get('announcement_date', 'N/A')}")

        print("\n盈利能力指标:")
        print(f"  营业收入: {profit_loss.get('revenue', 'N/A')} 百万元")
        print(f"  净利润: {profit_loss.get('net_profit', 'N/A')} 百万元")
        print(f"  毛利率: {ratios.get('gross_profit_margin', 'N/A')}%")
        print(f"  净利率: {ratios.get('net_profit_margin', 'N/A')}%")
        print(f"  基本每股盈利: {latest.get('eps_basic', 'N/A')} 仙")
        print(f"  经营盈利: {profit_loss.get('operating_profit', 'N/A')} 百万元")

        print("\n财务健康指标:")
        print(f"  流动比率: {ratios.get('current_ratio', 'N/A')}")
        print(f"  负债率: {ratios.get('debt_ratio', 'N/A')}%")
        print(f"  经营现金流: {cash_flow.get('operating_cash_flow', 'N/A')} 百万元")
        print(f"  流动资产: {balance_sheet.get('current_assets', 'N/A')} 百万元")
        print(f"  流动负债: {balance_sheet.get('current_liabilities', 'N/A')} 百万元")
        print(f"  股东权益: {balance_sheet.get('total_equity', 'N/A')} 百万元")

    print("\n" + "=" * 60)
    print("数据获取说明:")
    print("=" * 60)
    print("从新浪财经页面可获取的指标:")
    print("  [OK] 营业收入、净利润、经营盈利")
    print("  [OK] 毛利率、净利率（计算得出）")
    print("  [OK] 流动比率、负债率（计算得出）")
    print("  [OK] 经营现金流、流动资产、流动负债")
    print()
    print("需要其他数据源的指标:")
    print("  [!] 市盈率 (PE Ratio)")
    print("  [!] 市净率 (PB Ratio)")
    print("  [!] 股息率 (Dividend Yield)")
    print("  [!] ROE (净资产收益率)")
    print()
    print("建议:")
    print("  1. 使用AkShare的stock_hk_financial_indicator_em接口获取PE、PB、ROE")
    print("  2. 或结合实时股价数据自行计算PE和PB")
    print("  3. PE = 股价 / 每股收益")
    print("  4. PB = 股价 / 每股净资产")
    print("  5. ROE = 净利润 / 股东权益")


if __name__ == "__main__":
    print("\n")
    print("*" * 60)
    print("新浪财经财务指标爬虫 - 简化测试")
    print("*" * 60)
    print()

    test_local_html()

    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)
