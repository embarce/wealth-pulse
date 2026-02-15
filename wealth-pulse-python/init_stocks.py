"""
初始化股票信息数据库脚本

从 hk-code.xlsx 读取股票代码和公司名称，使用 akshare 获取详细信息，初始化 tb_stock_info 表

使用方法:
    python init_stocks.py

Excel 格式:
    Code       Name
    0700.HK    腾讯控股
    9988.HK    阿里巴巴
    ...

特性:
    - 使用 akshare 获取港股详细信息（英文名、每手股数、行业、市值等）
    - 自动添加时间间隔，避免 API 请求过快
    - 完善的错误处理和日志记录
"""
import os
import sys
import time
from datetime import datetime

import pandas as pd
import akshare as ak

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.stock_info import StockInfo
from sqlalchemy import func


# ==================== Akshare 数据获取函数 ====================

def normalize_stock_code(code: str) -> str:
    """
    标准化股票代码，去除 .HK 后缀并补位到5位

    港股代码规范为5位数字，不足的前面补0

    Args:
        code: 原始股票代码（如：0700.HK, 1810.HK, 9988.HK）

    Returns:
        标准化后的5位代码（如：00700, 01810, 09988）

    Examples:
        "0700.HK" -> "00700"
        "1810.HK" -> "01810"
        "9988.HK" -> "09988"
        "00700"   -> "00700"
    """
    code = str(code).strip().upper()

    # 去除 .HK 后缀
    if code.endswith('.HK'):
        code = code[:-3]

    # 补位到5位数字（港股代码规范）
    if len(code) < 5:
        code = code.zfill(5)

    return code


def get_hk_stock_detail_info(stock_code: str, max_retries: int = 3) -> dict:
    """
    使用 akshare 获取港股详细信息

    Args:
        stock_code: 港股代码（可以带或不带 .HK 后缀）
        max_retries: 最大重试次数

    Returns:
        包含详细信息的字典
        {
            'company_name_en': str,        # 公司英文名
            'lot_size': int,               # 每手股数
            'industry': str,               # 所属行业
            'market_cap': str,             # 市值
        }
    """
    # 标准化代码（去除 .HK 后缀，确保纯数字格式）
    normalized_code = normalize_stock_code(stock_code)

    result = {
        'company_name_en': None,
        'lot_size': None,
        'industry': None,
        'market_cap': None
    }

    # 1. 获取公司概况（包含英文名、行业）
    for attempt in range(max_retries):
        try:
            time.sleep(1)  # API 请求间隔，避免过快
            company_profile = ak.stock_hk_company_profile_em(symbol=normalized_code)

            if not company_profile.empty:
                # 提取公司英文名
                if '英文名称' in company_profile.columns:
                    result['company_name_en'] = str(company_profile['英文名称'].iloc[0])

                # 提取所属行业
                if '所属行业' in company_profile.columns:
                    result['industry'] = str(company_profile['所属行业'].iloc[0])

            break  # 成功则退出重试循环

        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)  # 等待后重试
            else:
                # 静默失败，不影响整体流程
                pass

    # 2. 获取财务指标（包含每手股数、市值）
    for attempt in range(max_retries):
        try:
            time.sleep(1)  # API 请求间隔，避免过快
            financial_indicator = ak.stock_hk_financial_indicator_em(symbol=normalized_code)

            if not financial_indicator.empty:
                # 提取每手股数
                if '每手股' in financial_indicator.columns:
                    try:
                        result['lot_size'] = int(financial_indicator['每手股'].iloc[0])
                    except (ValueError, TypeError):
                        pass

                # 提取总市值（优先使用"港股市值(港元)"，其次"总市值(港元)"）
                for col in ['港股市值(港元)', '总市值(港元)', '总市值(元)', '总市值']:
                    if col in financial_indicator.columns:
                        try:
                            market_cap_value = financial_indicator[col].iloc[0]
                            # 转换为易读格式（亿元）
                            if pd.notna(market_cap_value):
                                market_cap_num = float(market_cap_value)
                                result['market_cap'] = f"{market_cap_num / 100000000:.2f}亿"
                                break
                        except (ValueError, TypeError):
                            continue

            break  # 成功则退出重试循环

        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)  # 等待后重试
            else:
                # 静默失败，不影响整体流程
                pass

    return result


# ==================== Excel 读取函数 ====================

def read_excel_file(file_path: str = "hk-code.xlsx") -> pd.DataFrame:
    """
    读取 Excel 文件

    Args:
        file_path: Excel 文件路径

    Returns:
        DataFrame 包含 Code 和 Name 列
    """
    try:
        # 读取 Excel 文件
        df = pd.read_excel(file_path)

        # 检查必需的列
        required_columns = ['Code', 'Name']
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            print(f"❌ Excel 文件缺少必需的列: {missing_columns}")
            print(f"   当前列: {list(df.columns)}")
            sys.exit(1)

        # 去除空行
        df = df.dropna(subset=['Code', 'Name'])

        print(f"✓ 成功读取 Excel 文件: {file_path}")
        print(f"  共 {len(df)} 条记录")

        return df

    except FileNotFoundError:
        print(f"❌ 文件不存在: {file_path}")
        print(f"   请确保文件在项目根目录下")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 读取 Excel 文件失败: {str(e)}")
        sys.exit(1)


def init_stock_info(df: pd.DataFrame, db_session, use_akshare: bool = True):
    """
    初始化股票信息到数据库

    Args:
        df: 包含股票数据的 DataFrame
        db_session: 数据库会话
        use_akshare: 是否使用 akshare 获取详细信息（默认 True）
    """
    success_count = 0
    skip_count = 0
    error_count = 0
    akshare_success_count = 0
    akshare_failure_count = 0

    print(f"\n{'=' * 60}")
    print(f"开始初始化股票信息")
    print(f"{'=' * 60}")

    if use_akshare:
        print(f"📡 使用 akshare 获取港股详细信息")
        print(f"⏱️  注意：由于 API 限制，获取数据可能需要较长时间")
        print(f"{'=' * 60}\n")
    else:
        print(f"⚡ 快速模式：仅使用 Excel 中的基本信息\n")

    for index, row in df.iterrows():
        try:
            code = str(row['Code']).strip()
            name = str(row['Name']).strip()

            # 验证数据
            if not code or not name:
                print(f"⚠️  跳过第 {index + 2} 行: Code 或 Name 为空")
                skip_count += 1
                continue

            # 检查是否已存在
            existing = db_session.query(StockInfo).filter(
                StockInfo.stock_code == code
            ).first()

            if existing:
                print(f"⊘ 跳过: {code} - {name} (已存在)")
                skip_count += 1
                continue

            # 初始化基本信息
            company_name_en = None
            lot_size = None
            industry = None
            market_cap = None
            exchange = 'HK'  # 默认为香港交易所

            # 使用 akshare 获取详细信息
            if use_akshare:
                print(f"📡 正在获取 {code} 的详细信息...", end='', flush=True)
                detail_info = get_hk_stock_detail_info(code)

                if detail_info:
                    company_name_en = detail_info.get('company_name_en')
                    lot_size = detail_info.get('lot_size')
                    industry = detail_info.get('industry')
                    market_cap = detail_info.get('market_cap')

                    # 显示获取到的信息
                    info_parts = []
                    if company_name_en:
                        info_parts.append(f"英文名: {company_name_en}")
                    if lot_size:
                        info_parts.append(f"每手: {lot_size}")
                    if industry:
                        info_parts.append(f"行业: {industry}")
                    if market_cap:
                        info_parts.append(f"市值: {market_cap}")

                    if info_parts:
                        print(f"\r  ✓ {' | '.join(info_parts)}")
                        akshare_success_count += 1
                    else:
                        print(f"\r  ⚠️  部分信息获取成功")
                        akshare_failure_count += 1
                else:
                    print(f"\r  ❌ 获取详细信息失败")
                    akshare_failure_count += 1

            # 创建新记录
            stock_info = StockInfo(
                stock_code=code,
                company_name=company_name_en if use_akshare and company_name_en else name,
                company_name_cn=name,
                short_name=name,
                stock_type='STOCK',
                exchange=exchange,
                currency='HKD',
                industry=industry,
                market_cap=market_cap,
                lot_size=lot_size,
                display_order=0,
                stock_status=1,
                create_time=datetime.now(),
                update_time=datetime.now()
            )

            db_session.add(stock_info)

            # 每 10 条提交一次（避免长时间运行导致数据丢失）
            if (index + 1) % 10 == 0:
                db_session.commit()
                print(f"\n  💾 已提交 {index + 1} 条记录...")
                print()

            success_count += 1

            # 如果不是使用 akshare，显示简单信息
            if not use_akshare:
                print(f"✓ 添加: {code} - {name}")

        except Exception as e:
            error_count += 1
            print(f"\n❌ 错误 (第 {index + 2} 行): {str(e)}")
            continue

    # 最终提交
    try:
        db_session.commit()
        print(f"\n✓ 数据库提交成功")
    except Exception as e:
        db_session.rollback()
        print(f"\n❌ 数据库提交失败: {str(e)}")
        print(f"   已回滚所有更改")
        sys.exit(1)

    # 输出统计
    print(f"\n{'=' * 60}")
    print(f"初始化完成")
    print(f"{'=' * 60}")
    print(f"成功添加: {success_count} 条")
    print(f"跳过 (已存在): {skip_count} 条")
    print(f"错误: {error_count} 条")
    print(f"总计: {len(df)} 条")

    if use_akshare:
        print(f"\nAkshare 统计:")
        print(f"  成功获取详细信息: {akshare_success_count} 条")
        print(f"  获取失败/部分失败: {akshare_failure_count} 条")

    print(f"{'=' * 60}\n")


def show_current_stocks(db_session):
    """显示当前数据库中的股票数量"""
    try:
        total_count = db_session.query(func.count(StockInfo.stock_code)).scalar()
        active_count = db_session.query(func.count(StockInfo.stock_code)).filter(
            StockInfo.stock_status == 1
        ).scalar()

        print(f"\n当前数据库状态:")
        print(f"  总股票数: {total_count}")
        print(f"  活跃股票: {active_count}")
        print()

    except Exception as e:
        print(f"⚠️  无法查询数据库状态: {str(e)}")


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("股票信息初始化脚本")
    print("=" * 60 + "\n")

    # 读取 Excel 文件
    df = read_excel_file()

    # 显示前 5 条预览
    print(f"\n数据预览 (前 5 条):")
    print(f"{'Code':<15} {'Name'}")
    print("-" * 40)
    for _, row in df.head(5).iterrows():
        print(f"{str(row['Code']):<15} {str(row['Name'])}")

    if len(df) > 5:
        print(f"... 还有 {len(df) - 5} 条记录")

    # 创建数据库会话
    db = SessionLocal()

    try:
        # 显示当前状态
        show_current_stocks(db)

        # 执行初始化
        init_stock_info(df, db)

    finally:
        db.close()


if __name__ == "__main__":
    main()
