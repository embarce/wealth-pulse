"""
创建示例 hk-code.xlsx 文件

生成一个示例 Excel 文件用于测试初始化脚本
"""
import pandas as pd
import os


def create_sample_excel():
    """创建示例 Excel 文件"""

    # 示例数据 - 香港主要股票
    sample_data = {
        'Code': [
            '0700.HK',  # 腾讯控股
            '9988.HK',  # 阿里巴巴
            '0941.HK',  # 中国移动
            '1299.HK',  # 友邦保险
            '0960.HK',  # 龙湖集团
            '2018.HK',  # AAC科技
            '1876.HK',  # 百威亚太
            '1024.HK',  # BOE视觉技术
            '2020.HK',  # 安踏体育
            '0883.HK',  # 中国海洋石油
            '1398.HK',  # 工商银行
            '0939.HK',  # 建设银行
            '2318.HK',  # 中国平安
            '0005.HK',  # 汇丰控股
            '0388.HK',  # 港交所
            '0016.HK',  # 太古股份公司A
            '0001.HK',  # 长和
            '0002.HK',  # 中电控股
            '0003.HK',  # 香港中华煤气
            '0011.HK',  # 恒生银行
        ],
        'Name': [
            '腾讯控股',
            '阿里巴巴',
            '中国移动',
            '友邦保险',
            '龙湖集团',
            'AAC科技',
            '百威亚太',
            'BOE视觉技术',
            '安踏体育',
            '中国海洋石油',
            '工商银行',
            '建设银行',
            '中国平安',
            '汇丰控股',
            '港交所',
            '太古股份公司A',
            '长和',
            '中电控股',
            '香港中华煤气',
            '恒生银行',
        ]
    }

    df = pd.DataFrame(sample_data)

    file_path = 'hk-code.xlsx'

    # 检查文件是否已存在
    if os.path.exists(file_path):
        response = input(f"⚠️  文件 {file_path} 已存在，是否覆盖? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("✓ 已取消")
            return

    # 保存到 Excel
    df.to_excel(file_path, index=False)

    print(f"\n{'='*60}")
    print(f"创建示例 Excel 文件")
    print(f"{'='*60}\n")

    print(f"✓ 文件已创建: {file_path}")
    print(f"  共 {len(df)} 条记录\n")

    print(f"数据预览:")
    print(f"{'Code':<15} {'Name'}")
    print("-" * 40)
    for _, row in df.head(10).iterrows():
        print(f"{row['Code']:<15} {row['Name']}")

    if len(df) > 10:
        print(f"... 还有 {len(df) - 10} 条记录")

    print(f"\n{'='*60}\n")

    print(f"下一步:")
    print(f"  1. 检查并编辑 {file_path}，添加您的股票数据")
    print(f"  2. 运行初始化脚本: python init_stocks.py")
    print(f"\n")


if __name__ == "__main__":
    create_sample_excel()
