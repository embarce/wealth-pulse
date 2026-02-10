"""
初始化股票信息数据库脚本

从 hk-code.xlsx 读取股票代码和公司名称，初始化 tb_stock_info 表

使用方法:
    python init_stocks.py

Excel 格式:
    Code       Name
    0700.HK    腾讯控股
    9988.HK    阿里巴巴
    ...
"""
import os
import sys
from datetime import datetime

import pandas as pd

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.stock_info import StockInfo
from sqlalchemy import func


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


def init_stock_info(df: pd.DataFrame, db_session):
    """
    初始化股票信息到数据库

    Args:
        df: 包含股票数据的 DataFrame
        db_session: 数据库会话
        dry_run: 是否为试运行（不实际写入数据库）
    """
    success_count = 0
    skip_count = 0
    error_count = 0

    print(f"\n{'=' * 60}")
    print(f"开始初始化股票信息")
    print(f"{'=' * 60}\n")

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

            # 创建新记录
            stock_info = StockInfo(
                stock_code=code,
                company_name=name,
                company_name_cn=name,
                short_name=name,
                stock_type='STOCK',
                exchange=None,  # 可以后续根据 code 判断
                currency='HKD',  # 默认为港币
                industry=None,
                market_cap=None,
                display_order=0,
                stock_status=1,
                create_time=datetime.now(),
                update_time=datetime.now()
            )

            db_session.add(stock_info)
            # 每 100 条提交一次
            if (index + 1) % 100 == 0:
                db_session.commit()
                print(f"  已提交 {index + 1} 条记录...")

            success_count += 1
            print(f"✓ 添加: {code} - {name}")

        except Exception as e:
            error_count += 1
            print(f"❌ 错误 (第 {index + 2} 行): {str(e)}")
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
