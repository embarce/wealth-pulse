"""
AI 股票分析测试脚本
用于测试 AI 分析功能
"""
import asyncio
import sys
import os

# 添加项目根目录到 path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.stock_analysis_service import StockAnalysisService
from app.db.session import SessionLocal


async def test_ai_analysis():
    """测试 AI 股票分析功能"""

    print("=" * 60)
    print("AI 股票分析测试")
    print("=" * 60)

    # 创建数据库会话
    db = SessionLocal()

    try:
        # 创建分析服务
        analysis_service = StockAnalysisService(db)

        # 测试股票代码
        stock_code = "0700.HK"  # 腾讯控股

        print(f"\n开始分析股票: {stock_code}")
        print("-" * 60)

        # 执行分析
        result = await analysis_service.analyze_stock(
            stock_code=stock_code,
            period="daily",
            days=60,
            force_refresh=False
        )

        # 打印分析结果
        print("\n【分析结果】")
        print(f"股票代码: {result.get('stock_code')}")
        print(f"当前价格: {result.get('current_price')}")
        print(f"趋势判断: {result.get('trend')} - {result.get('trend_description')}")
        print(f"操作建议: {result.get('recommendation')} - {result.get('recommendation_reason')}")
        print(f"风险等级: {result.get('risk_level')}")
        print(f"目标价格区间: {result.get('target_price_range')}")
        print(f"评级: {result.get('rating')}")
        print(f"置信度: {result.get('confidence')}")

        print("\n【技术点位】")
        for point in result.get('technical_points', []):
            print(f"  - {point.get('type')}: {point.get('price')} (强度: {point.get('strength')})")
            print(f"    {point.get('description')}")

        print("\n【基本面分析】")
        print(result.get('fundamental_analysis', '暂无'))

        print("\n【技术面分析】")
        print(result.get('technical_analysis', '暂无'))

        print("\n【新闻影响】")
        print(result.get('news_impact', '暂无'))

        print("\n" + "=" * 60)
        print("分析完成！")
        print("=" * 60)

    except Exception as e:
        print(f"\n[错误] 分析失败: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(test_ai_analysis())
