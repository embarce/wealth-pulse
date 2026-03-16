"""
股票 AI 分析服务
整合公司信息、K 线数据、新闻、财务指标、公告等信息，通过 LLM 进行分析

主要功能：
1. analyze_stock - 单只股票 AI 分析（含 K 线、新闻、财务等）
2. analyze_position - 持仓组合 AI 分析（多只股票综合评估）
3. analyze_hkstock_market - 港股市场新闻分析（基于新浪财经新闻给出投资建议）
"""
import json
import logging
from datetime import date, timedelta
from typing import Dict, Any, Optional, List

import akshare as ak
import numpy as np
from sqlalchemy.orm import Session

from app.llm import llm_service
from app.models.stock_info import StockInfo
from app.models.stock_market_data import StockMarketData
from app.models.stock_market_history import StockMarketHistory
from app.services.akshare_provider import AkShareProvider
from app.services.sina_company_info_crawler import sina_company_info_crawler
from app.services.sina_company_notice_crawler import sina_company_notice_crawler
from app.services.sina_finance_crawler import sina_finance_crawler
from app.services.sina_hkstock_crawler import SinaHKStockCrawler
from app.services.sina_news_crawler import sina_news_crawler
from app.services.sina_forex_crawler import sina_forex_crawler
from app.services.stock_service import StockService

logger = logging.getLogger(__name__)


def _convert_to_python_type(value: Any) -> Any:
    """
    将 numpy/pandas 类型转换为 Python 原生类型

    Args:
        value: 任意值

    Returns:
        转换后的 Python 原生类型值
    """
    if value is None:
        return None
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.bool_):
        return bool(value)
    # pandas 类型
    import pandas as pd
    if pd.isna(value):
        return None
    return value


class StockAnalysisService:
    """
    股票 AI 分析服务

    流程：
    1. 获取公司信息
    2. 获取股票 K 线图数据
    3. 获取新闻
    4. 获取财务指标
    5. 获取公告信息
    6. 组合 prompt 让 LLM 分析股票
    7. 返回分析结果
    """

    def __init__(self, db: Session):
        self.db = db
        self.stock_service = StockService(db)
        self.akshare_provider = AkShareProvider()

    async def analyze_stock(
            self,
            stock_code: str,
            period: str = "daily",
            days: int = 60,
            force_refresh: bool = False,
            provider: Optional[str] = None,
            model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        AI 分析股票

        Args:
            stock_code: 股票代码
            period: 周期 (daily, weekly, monthly)
            days: 获取多少天的历史数据
            force_refresh: 是否强制刷新（跳过缓存）
            provider: LLM 供应商 (doubao, openai 等)
            model: 模型名称

        Returns:
            分析结果字典
        """
        logger.info(f"[StockAnalysis] 开始分析股票：{stock_code}")

        # 1. 获取股票基本信息
        stock_info = self.stock_service.get_stock_by_code(stock_code)
        if not stock_info:
            raise ValueError(f"股票 {stock_code} 不存在")

        # 2. 获取最新市场数据
        market_data = self.stock_service.get_latest_market_data(stock_code)
        if not market_data:
            # 尝试刷新
            market_data = self.stock_service.refresh_stock_market_data(stock_code)
            if not market_data:
                raise ValueError(f"无法获取 {stock_code} 的市场数据")

        # 3. 获取历史数据（带 fallback 机制）
        end_date = date.today()
        start_date = end_date - timedelta(days=days * 2)  # 乘以 2 以包含非交易日
        history_data = self._get_history_data_with_fallback(
            stock_code=stock_code,
            start_date=start_date,
            end_date=end_date,
            limit=days
        )

        if len(history_data) < 10:
            raise ValueError(f"历史数据不足，仅有 {len(history_data)} 条记录")

        # 4. 获取公司信息（新浪）
        try:
            company_info = await sina_company_info_crawler.fetch_company_info(stock_code)
        except Exception as e:
            logger.warning(f"[StockAnalysis] 获取公司信息失败：{e}")
            company_info = {}

        # 5. 获取新闻（新浪）
        try:
            news_items = await sina_news_crawler.fetch_stock_news(stock_code)
            # 只取最近 5 条新闻
            recent_news = news_items[:5] if news_items else []
        except Exception as e:
            logger.warning(f"[StockAnalysis] 获取新闻失败：{e}")
            recent_news = []

        # 6. 获取财务指标（新浪）
        try:
            financial_data = await sina_finance_crawler.fetch_financial_indicators(stock_code)
        except Exception as e:
            logger.warning(f"[StockAnalysis] 获取财务指标失败：{e}")
            financial_data = {}

        # 7. 获取公告（新浪）
        try:
            notices = await sina_company_notice_crawler.fetch_company_notices(stock_code, max_pages=1)
            # 只取最近 3 条公告
            recent_notices = notices[:3] if notices else []
        except Exception as e:
            logger.warning(f"[StockAnalysis] 获取公告失败：{e}")
            recent_notices = []

        # 8. 构建 LLM Prompt
        prompt = self._build_analysis_prompt(
            stock_code=stock_code,
            stock_info=stock_info,
            market_data=market_data,
            history_data=history_data,
            company_info=company_info,
            recent_news=recent_news,
            financial_data=financial_data,
            recent_notices=recent_notices
        )

        # 9. 调用 LLM 分析
        try:
            response = await llm_service.chat(
                messages=[{"role": "user", "content": prompt}],
                provider=provider,
                model=model,
                temperature=0.7,
                max_tokens=5000
            )
            analysis_result = response.content

            # 10. 解析 LLM 返回结果
            parsed_result = self._parse_analysis_result(analysis_result, stock_code)

            # 添加 LLM 信息到结果
            parsed_result["_llm"] = {
                "provider": provider or llm_service.get_provider_info().name,
                "model": model or llm_service.get_provider_info(provider).model,
                "tokens": response.total_tokens
            }

            logger.info(f"[StockAnalysis] 分析完成：{stock_code}")
            return parsed_result

        except Exception as e:
            logger.error(f"[StockAnalysis] LLM 分析失败：{e}")
            raise

    async def analyze_position(
            self,
            positions: List[Dict[str, Any]],
            analysis_depth: str = "standard",
            provider: Optional[str] = None,
            model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        AI 分析持仓

        Args:
            positions: 持仓列表，每个包含 stock_code, buy_price, quantity, buy_date
            analysis_depth: 分析深度 (quick, standard, deep)
            provider: LLM 供应商
            model: 模型名称

        Returns:
            持仓分析结果字典
        """
        logger.info(f"[PositionAnalysis] 开始分析持仓：{len(positions)} 只股票")

        # 收集每只股票的数据
        stocks_data = []
        total_cost = 0.0
        total_current_value = 0.0

        for pos in positions:
            stock_code = pos.get("stock_code")
            buy_price = pos.get("buy_price", 0)
            quantity = pos.get("quantity", 1)
            buy_date = pos.get("buy_date")

            try:
                # 获取股票基本信息
                stock_info = self.stock_service.get_stock_by_code(stock_code)
                if not stock_info:
                    logger.warning(f"[PositionAnalysis] 股票 {stock_code} 不存在，跳过")
                    continue

                # 获取最新市场数据
                market_data = self.stock_service.get_latest_market_data(stock_code)
                if not market_data:
                    market_data = self.stock_service.refresh_stock_market_data(stock_code)
                    if not market_data:
                        logger.warning(f"[PositionAnalysis] 无法获取 {stock_code} 市场数据，跳过")
                        continue

                # 计算盈亏
                current_price = market_data.last_price or 0
                cost = buy_price * quantity
                current_value = current_price * quantity
                profit_loss = current_value - cost
                profit_loss_percent = (profit_loss / cost * 100) if cost > 0 else 0

                total_cost += cost
                total_current_value += current_value

                # 获取历史数据（带 fallback 机制）
                days = {"quick": 20, "standard": 60, "deep": 120}.get(analysis_depth, 60)
                end_date = date.today()
                start_date = end_date - timedelta(days=days * 2)
                history_data = self._get_history_data_with_fallback(
                    stock_code=stock_code,
                    start_date=start_date,
                    end_date=end_date,
                    limit=days
                )

                # 获取公司信息
                company_info = {}
                financial_data = {}
                try:
                    company_info = await sina_company_info_crawler.fetch_company_info(stock_code)
                except Exception:
                    pass

                try:
                    financial_data = await sina_finance_crawler.fetch_financial_indicators(stock_code)
                except Exception:
                    pass

                stock_data = {
                    "stock_code": stock_code,
                    "company_name": stock_info.company_name,
                    "industry": stock_info.industry,
                    "buy_price": buy_price,
                    "quantity": quantity,
                    "buy_date": buy_date,
                    "current_price": current_price,
                    "cost": cost,
                    "current_value": current_value,
                    "profit_loss": profit_loss,
                    "profit_loss_percent": round(profit_loss_percent, 2),
                    "market_data": {
                        "change_rate": market_data.change_rate,
                        "week52_high": market_data.week52_high,
                        "week52_low": market_data.week52_low,
                        "pe_ratio": market_data.pe_ratio,
                        "pb_ratio": market_data.pb_ratio,
                    },
                    "history_summary": self._summarize_history(history_data),
                    "company_info": {
                        "business": company_info.get("business_description", "N/A")[:200] if company_info else "N/A",
                        "chairman": company_info.get("chairman", "N/A") if company_info else "N/A",
                    },
                    "financial_summary": self._summarize_financials(financial_data),
                }
                stocks_data.append(stock_data)

            except Exception as e:
                logger.error(f"[PositionAnalysis] 处理 {stock_code} 时出错：{e}")
                continue

        if not stocks_data:
            raise ValueError("没有有效的持仓数据可供分析")

        # 计算组合统计
        total_profit_loss = total_current_value - total_cost
        total_profit_loss_percent = (total_profit_loss / total_cost * 100) if total_cost > 0 else 0

        portfolio_stats = {
            "total_cost": round(total_cost, 2),
            "total_current_value": round(total_current_value, 2),
            "total_profit_loss": round(total_profit_loss, 2),
            "total_profit_loss_percent": round(total_profit_loss_percent, 2),
            "position_count": len(stocks_data),
        }

        # 构建 LLM Prompt
        prompt = self._build_position_analysis_prompt(stocks_data, portfolio_stats, analysis_depth)

        # 调用 LLM
        try:
            response = await llm_service.chat(
                messages=[{"role": "user", "content": prompt}],
                provider=provider,
                model=model,
                temperature=0.7,
                max_tokens=6000
            )
            analysis_result = response.content

            # 解析结果
            parsed_result = self._parse_position_analysis_result(analysis_result, stocks_data, portfolio_stats)

            parsed_result["_llm"] = {
                "provider": provider or llm_service.get_provider_info().name,
                "model": model or llm_service.get_provider_info(provider).model,
                "tokens": response.total_tokens
            }

            logger.info(f"[PositionAnalysis] 持仓分析完成")
            return parsed_result

        except Exception as e:
            logger.error(f"[PositionAnalysis] LLM 分析失败：{e}")
            raise

    def _get_history_data_with_fallback(
            self,
            stock_code: str,
            start_date: date,
            end_date: date,
            limit: int = 100
    ) -> List[StockMarketHistory]:
        """
        获取历史数据，带有 fallback 机制

        优先从 MySQL 数据库查询，如果查询不到数据或数据量偏少，
        则使用 akshare 的 stock_hk_daily 接口获取数据并转换为 StockMarketHistory

        Args:
            stock_code: 股票代码
            start_date: 开始日期
            end_date: 结束日期
            limit: 最大返回记录数

        Returns:
            历史数据列表（StockMarketHistory 对象）
        """
        # 1. 先从 MySQL 查询
        db_data = self.stock_service.get_historical_data(
            stock_code=stock_code,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        # 2. 如果数据库有足够数据，直接返回
        if len(db_data) >= limit:
            logger.info(f"[StockAnalysis] 从 MySQL 获取 {stock_code} 历史数据成功，共 {len(db_data)} 条记录")
            return db_data

        # 3. 数据库数据不足，从 akshare 获取并转换
        logger.info(f"[StockAnalysis] MySQL 数据不足 ({len(db_data)} 条)，从 akshare 获取 {stock_code} 历史数据")

        try:
            ak_data = self.akshare_provider.get_stock_daily_history_enhanced(
                stock_code=stock_code,
                start_date=start_date,
                end_date=end_date,
                period="daily",
                adjust="qfq"
            )

            if ak_data:
                logger.info(f"[StockAnalysis] 从 akshare 获取 {stock_code} 历史数据成功，共 {len(ak_data)} 条记录")
                # 转换为 StockMarketHistory 对象
                history_list = self._convert_to_history(ak_data, stock_code)
                return history_list[:limit]

            logger.warning(f"[StockAnalysis] akshare 也未能获取 {stock_code} 历史数据")

        except Exception as e:
            logger.error(f"[StockAnalysis] 从 akshare 获取 {stock_code} 历史数据失败：{e}")

        # 4. 如果 akshare 也失败，返回 MySQL 数据（即使不足）
        if db_data:
            logger.warning(f"[StockAnalysis] akshare 获取失败，返回 MySQL 数据 ({len(db_data)} 条)")
            return db_data

        return []

    def _convert_to_history(
            self,
            ak_data: List[Dict[str, Any]],
            stock_code: str
    ) -> List[StockMarketHistory]:
        """
        将 akshare 返回的数据转换为 StockMarketHistory 对象列表

        Args:
            ak_data: akshare 返回的数据列表
            stock_code: 股票代码

        Returns:
            StockMarketHistory 对象列表
        """
        history_list = []
        for item in ak_data:
            try:
                history = StockMarketHistory(
                    stock_code=stock_code,
                    trade_date=item.get('trade_date'),
                    open_price=item.get('open_price'),
                    high_price=item.get('high_price'),
                    low_price=item.get('low_price'),
                    close_price=item.get('close_price'),
                    adj_close=item.get('adj_close'),
                    volume=item.get('volume')
                )
                history_list.append(history)
            except Exception as e:
                logger.warning(f"转换 akshare 数据行失败：{e}")
                continue
        return history_list

    def _summarize_history(self, history_data: List[StockMarketHistory]) -> Dict[str, Any]:
        """总结历史数据"""
        if not history_data or len(history_data) < 5:
            return {"available": False, "message": "历史数据不足"}

        prices = [h.close_price for h in history_data if h.close_price]
        if not prices:
            return {"available": False, "message": "无有效价格数据"}

        return {
            "available": True,
            "highest": max(prices),
            "lowest": min(prices),
            "average": round(sum(prices) / len(prices), 2) if prices else None,
            "data_points": len(prices),
            "latest_price": prices[0] if prices else None,
        }

    def _summarize_financials(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """总结财务数据"""
        if not financial_data:
            return {"available": False}

        latest = financial_data.get("latest", {})
        return {
            "available": bool(latest),
            "revenue": latest.get("revenue"),
            "net_profit": latest.get("net_profit"),
            "pe_ratio": latest.get("pe_ratio"),
            "pb_ratio": latest.get("pb_ratio"),
            "roe": latest.get("roe"),
        }

    def _build_analysis_prompt(
            self,
            stock_code: str,
            stock_info: StockInfo,
            market_data: StockMarketData,
            history_data: List[StockMarketHistory],
            company_info: Dict[str, Any],
            recent_news: List[Dict[str, Any]],
            financial_data: Dict[str, Any],
            recent_notices: List[Dict[str, Any]]
    ) -> str:
        """构建 LLM 分析 Prompt"""

        # 格式化历史数据
        history_text = ""
        if history_data:
            recent = history_data[:20]  # 只取最近 20 条
            history_text = "\n".join([
                f"  {h.trade_date}: 开盘={h.open_price}, 最高={h.high_price}, "
                f"最低={h.low_price}, 收盘={h.close_price}, 成交量={h.volume}"
                for h in recent
            ])

        # 格式化新闻
        news_text = ""
        if recent_news:
            news_text = "\n".join([
                f"  - {n.get('publish_time', '')}: {n.get('title', '')}"
                for n in recent_news
            ])

        # 格式化公告
        notices_text = ""
        if recent_notices:
            notices_text = "\n".join([
                f"  - {n.get('publish_time', '')}: {n.get('title', '')}"
                for n in recent_notices
            ])

        # 格式化财务数据
        financial_text = ""
        if financial_data:
            latest = financial_data.get('latest', {})
            if latest:
                financial_text = f"""
  - 最新报告期：{latest.get('end_date', '')} ({latest.get('report_type', '')})
  - 营业收入：{latest.get('revenue', 'N/A')} 百万元
  - 净利润：{latest.get('net_profit', 'N/A')} 百万元
  - 毛利率：{latest.get('gross_profit_margin', 'N/A')}%
  - 净利率：{latest.get('net_profit_margin', 'N/A')}%
  - 基本每股盈利：{latest.get('eps_basic', 'N/A')} 仙
  - 流动比率：{latest.get('current_ratio', 'N/A')}
  - 负债率：{latest.get('debt_ratio', 'N/A')}%
"""

        prompt = f"""你是一位专业的股票分析师，请根据以下信息进行综合分析，并以 JSON 格式返回分析结果。

## 股票基本信息
- 股票代码：{stock_code}
- 公司名称：{stock_info.company_name}
- 所属行业：{stock_info.industry or 'N/A'}
- 市值：{stock_info.market_cap or 'N/A'}

## 当前市场数据
- 最新价格：{market_data.last_price} 港元
- 涨跌额：{market_data.change_number}
- 涨跌幅：{market_data.change_rate}%
- 开盘价：{market_data.open_price}
- 最高价：{market_data.high_price}
- 最低价：{market_data.low_price}
- 成交量：{market_data.volume}
- 成交额：{market_data.turnover} 港元
- 市盈率：{market_data.pe_ratio or 'N/A'}
- 市净率：{market_data.pb_ratio or 'N/A'}

## 公司信息
- 主营业务：{company_info.get('business_description', 'N/A')}
- 主席：{company_info.get('chairman', 'N/A')}

## 财务指标
{financial_text if financial_text else "  暂无财务数据"}

## 最近 K 线数据（最近 20 个交易日）
{history_text if history_text else "  暂无历史数据"}

## 最近新闻（最近 5 条）
{news_text if news_text else "  暂无新闻"}

## 最近公告（最近 3 条）
{notices_text if notices_text else "  暂无公告"}

---

请根据以上信息进行综合分析，并返回以下 JSON 格式的结果：

```json
{{
  "stock_code": "{stock_code}",
  "current_price": "{market_data.last_price}",
  "trend": "uptrend/downtrend/sideways",
  "trend_description": "趋势描述（50 字以内）",
  "technical_points": [
    {{
      "type": "support/resistance/stop_loss/take_profit",
      "price": "价格",
      "strength": 1-5,
      "description": "描述"
    }}
  ],
  "recommendation": "strong_buy/buy/hold/sell/strong_sell",
  "recommendation_reason": "建议理由（100 字以内）",
  "risk_level": "low/medium/high",
  "risk_description": "风险描述（50 字以内）",
  "target_price_range": "目标价区间（如：150-165）",
  "fundamental_analysis": "基本面分析（150 字以内）",
  "technical_analysis": "技术面分析（150 字以内）",
  "news_impact": "新闻影响分析（100 字以内）",
  "rating": "买入/持有/卖出/观望",
  "confidence": "high/medium/low"
}}
```

注意：
1. 趋势判断要基于 K 线数据和价格走势
2. 技术点位要基于实际价格水平（支撑位低于当前价，压力位高于当前价）
3. 一定要列出所有技术点位，不要遗漏
4. 保证有基本面，技术面和新闻分析
6. 风险等级要结合估值、波动性等因素综合评估
7. 确保返回的是合法的 JSON 格式，不要有其他额外文字
"""

        return prompt

    def _parse_analysis_result(self, llm_output: str, stock_code: str) -> Dict[str, Any]:
        """解析 LLM 返回的分析结果"""

        try:
            # 尝试直接解析 JSON
            # 移除可能的 markdown 代码块标记
            clean_output = llm_output.strip()
            if clean_output.startswith("```json"):
                clean_output = clean_output[7:]
            if clean_output.startswith("```"):
                clean_output = clean_output[3:]
            if clean_output.endswith("```"):
                clean_output = clean_output[:-3]
            clean_output = clean_output.strip()

            result = json.loads(clean_output)

            # 验证必要字段
            required_fields = [
                "stock_code", "current_price", "trend", "trend_description",
                "technical_points", "recommendation", "recommendation_reason",
                "risk_level", "target_price_range", "rating", "confidence"
            ]

            for field in required_fields:
                if field not in result:
                    logger.warning(f"[StockAnalysis] LLM 返回结果缺少字段：{field}")
                    # 设置默认值
                    if field == "technical_points":
                        result[field] = []
                    elif field in ["trend", "recommendation", "risk_level", "rating", "confidence"]:
                        result[field] = "unknown"
                    else:
                        result[field] = "暂无分析"

            return result

        except json.JSONDecodeError as e:
            logger.error(f"[StockAnalysis] 解析 LLM 返回结果失败：{e}")
            logger.error(f"[StockAnalysis] LLM 输出：{llm_output}")

            # 返回默认结构
            return {
                "stock_code": stock_code,
                "current_price": "0",
                "trend": "unknown",
                "trend_description": "无法解析分析结果",
                "technical_points": [],
                "recommendation": "hold",
                "recommendation_reason": "由于技术原因无法获取建议",
                "risk_level": "medium",
                "risk_description": "无法评估",
                "target_price_range": "N/A",
                "fundamental_analysis": "暂无分析",
                "technical_analysis": "暂无分析",
                "news_impact": "暂无分析",
                "rating": "观望",
                "confidence": "low",
                "error": "解析失败"
            }

    def _build_position_analysis_prompt(
            self,
            stocks_data: List[Dict[str, Any]],
            portfolio_stats: Dict[str, Any],
            analysis_depth: str
    ) -> str:
        """构建持仓分析 Prompt"""

        # 构建每只股票的详细信息
        stocks_text = ""
        for i, stock in enumerate(stocks_data, 1):
            stocks_text += f"""
### 股票 {i}: {stock['stock_code']} - {stock['company_name']}
- **行业**: {stock['industry'] or 'N/A'}
- **持仓情况**:
  - 买入价格：{stock['buy_price']:.2f} 港元
  - 持仓数量：{stock['quantity']} 股
  - 买入日期：{stock['buy_date'] or '未知'}
  - 成本：{stock['cost']:.2f} 港元
  - 当前市值：{stock['current_value']:.2f} 港元
  - 盈亏：{stock['profit_loss']:.2f} 港元 ({stock['profit_loss_percent']:.2f}%)
- **市场数据**:
  - 当前价格：{stock['current_price']:.2f} 港元
  - 今日涨跌：{stock['market_data'].get('change_rate', 'N/A')}%
  - 52 周最高：{stock['market_data'].get('week52_high', 'N/A')}
  - 52 周最低：{stock['market_data'].get('week52_low', 'N/A')}
  - 市盈率：{stock['market_data'].get('pe_ratio', 'N/A')}
  - 市净率：{stock['market_data'].get('pb_ratio', 'N/A')}
- **历史走势摘要**:
  - 数据点数：{stock['history_summary'].get('data_points', 0)}
  - 期间最高：{stock['history_summary'].get('highest', 'N/A')}
  - 期间最低：{stock['history_summary'].get('lowest', 'N/A')}
  - 期间均价：{stock['history_summary'].get('average', 'N/A')}
- **公司信息**: {stock['company_info'].get('business', 'N/A')[:150]}
- **财务摘要**: PE={stock['financial_summary'].get('pe_ratio', 'N/A')}, PB={stock['financial_summary'].get('pb_ratio', 'N/A')}, ROE={stock['financial_summary'].get('roe', 'N/A')}

---
"""

        depth_instruction = {
            "quick": "请进行快速分析，每个股票简要评价，给出核心建议。",
            "standard": "请进行标准分析，详细评价每只股票，给出投资建议和风险提示。",
            "deep": "请进行深度分析，全面评估每只股票的基本面、技术面、市场环境，给出详细的投资策略建议。"
        }

        prompt = f"""你是一位专业的投资组合分析师，请根据以下持仓信息进行综合分析，并以 JSON 格式返回结果。

## 组合概况
- 总成本：{portfolio_stats['total_cost']:.2f} 港元
- 当前总市值：{portfolio_stats['total_current_value']:.2f} 港元
- 总盈亏：{portfolio_stats['total_profit_loss']:.2f} 港元 ({portfolio_stats['total_profit_loss_percent']:.2f}%)
- 持仓数量：{portfolio_stats['position_count']} 只

## 持仓明细
{stocks_text}

## 分析要求
{depth_instruction.get(analysis_depth, depth_instruction['standard'])}

请根据以上信息进行分析，返回以下 JSON 格式结果：

```json
{{
  "portfolio_summary": {{
    "overall_score": 0-100,
    "overall_rating": "优秀/良好/一般/较差/极差",
    "risk_level": "低/中/高",
    "diversification": "分散/一般/集中",
    "investment_style": "价值/成长/均衡/投机型"
  }},
  "position_scores": [
    {{
      "stock_code": "股票代码",
      "score": 0-100,
      "grade": "A/B/C/D/E",
      "holding_quality": "优质/良好/一般/较差/劣质",
      "profit_prospect": "看涨/震荡/看跌",
      "risk_warning": "风险提示"
    }}
  ],
  "position_recommendations": [
    {{
      "stock_code": "股票代码",
      "action": "持有/加仓/减仓/清仓",
      "reason": "建议理由",
      "target_price_range": "目标价区间（如：150-165）",
      "stop_loss_price": "建议止损价",
      "confidence": "high/medium/low"
    }}
  ],
  "overall_recommendation": {{
    "strategy": "积极持有/稳健持有/逢高减仓/择机调仓",
    "key_points": ["要点 1", "要点 2", "要点 3"],
    "risk_summary": "整体风险描述",
    "suggested_actions": ["建议操作 1", "建议操作 2"]
  }},
  "market_outlook": {{
    "trend": "看涨/震荡/看跌",
    "confidence": "high/medium/low",
    "key_factors": ["因素 1", "因素 2"]
  }}
}}
```

**评分标准参考**：
- 90-100 分 (A): 优质持仓，基本面优秀，技术面强势，风险可控
- 80-89 分 (B): 良好持仓，基本面稳健，有一定上涨空间
- 70-79 分 (C): 一般持仓，需关注风险，可考虑调整
- 60-69 分 (D): 较差持仓，存在明显问题，建议减仓或清仓
- 60 分以下 (E): 劣质持仓，风险较高，建议清仓

注意：
1. 确保返回合法的 JSON 格式
2. 每只股票都要给出评分和建议
3. 评分要客观，基于客观数据和合理分析
4. 建议要具体可操作
"""
        return prompt

    def _parse_position_analysis_result(
            self,
            llm_output: str,
            stocks_data: List[Dict[str, Any]],
            portfolio_stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """解析持仓分析结果"""

        try:
            # 清理输出
            clean_output = llm_output.strip()
            if clean_output.startswith("```json"):
                clean_output = clean_output[7:]
            if clean_output.startswith("```"):
                clean_output = clean_output[3:]
            if clean_output.endswith("```"):
                clean_output = clean_output[:-3]
            clean_output = clean_output.strip()

            result = json.loads(clean_output)

            # 添加原始数据
            result["portfolio_stats"] = portfolio_stats
            result["stocks_detail"] = stocks_data

            # 验证结构
            required_sections = ["portfolio_summary", "position_scores", "position_recommendations"]
            for section in required_sections:
                if section not in result:
                    result[section] = {} if section == "portfolio_summary" else []

            return result

        except json.JSONDecodeError as e:
            logger.error(f"[PositionAnalysis] 解析失败：{e}")
            logger.error(f"[PositionAnalysis] 输出：{llm_output[:500]}")

            return {
                "portfolio_summary": {
                    "overall_score": 0,
                    "overall_rating": "分析失败",
                    "risk_level": "未知",
                    "diversification": "未知",
                    "investment_style": "未知"
                },
                "position_scores": [
                    {"stock_code": s["stock_code"], "score": 0, "grade": "N/A", "holding_quality": "未知",
                     "profit_prospect": "未知", "risk_warning": "解析失败"}
                    for s in stocks_data
                ],
                "position_recommendations": [
                    {"stock_code": s["stock_code"], "action": "持有", "reason": "解析失败，建议手动分析",
                     "confidence": "low"}
                    for s in stocks_data
                ],
                "portfolio_stats": portfolio_stats,
                "stocks_detail": stocks_data,
                "error": "解析失败"
            }

    async def analyze_hkstock_market(
            self,
            news_data: Optional[Dict[str, Any]] = None,
            provider: Optional[str] = None,
            model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        AI 分析港股市场新闻，给出投资建议（优化版 - 两阶段压缩分析）

        基于新浪财经爬取的港股新闻（要闻 + 大行研报 + 公司新闻），
        通过 LLM 两阶段分析：
        - 第一阶段：压缩提炼新闻，提取重要信息并分类标签
        - 第二阶段：基于压缩后的新闻和市场快照生成投资策略报告

        优化亮点：
        1. 去除 20 条新闻限制，原始新闻全部传入第一阶段
        2. LLM 压缩新闻至 500-800 字（原来可能数千字），节省 token
        3. 第二阶段只传入压缩后的新闻，不传入原始新闻
        4. 加入市场动态数据快照（恆生指数、美股、汇率、南向资金、涨跌比）

        Args:
            news_data: 新闻数据字典，包含 important_news, rank_news, company_news
                      如果为 None，则自动调用爬虫获取
            provider: LLM 供应商名称
            model: 模型名称

        Returns:
            包含以下字段的字典：
            - market_snapshot: 市场动态数据快照
            - compressed_news: LLM 压缩后的新闻摘要（Markdown 格式，含分类标签）
            - investment_report: Markdown 格式的投资策略报告
            - news_summary: 新闻摘要统计信息
            - _llm: LLM 调用信息（provider, model）
        """
        logger.info("[HKStockMarketAnalysis] 开始分析港股市场新闻（优化版）")

        # 1. 获取新闻数据
        if news_data is None:
            logger.info("[HKStockMarketAnalysis] 自动获取新闻数据")
            try:
                crawler = SinaHKStockCrawler()
                news_data = await crawler.fetch_all_news()
                logger.info(f"[HKStockMarketAnalysis] 获取到 {news_data['summary']['total_count']} 条新闻")
            except Exception as e:
                logger.error(f"[HKStockMarketAnalysis] 获取新闻数据失败：{e}")
                raise ValueError(f"无法获取港股新闻数据：{e}")

        # 保存新闻摘要统计信息
        news_summary = news_data.get('summary', {})

        # 2. 获取港股市场动态数据快照
        logger.info("[HKStockMarketAnalysis] 获取市场动态数据快照")
        market_snapshot = await self._get_hk_market_snapshot()

        # 3. 构建新闻文本（不限制条数，供第一阶段压缩使用）
        news_text = self._build_hkstock_news_text(news_data, max_news_per_category=50)

        # 4. 第一阶段：LLM 压缩总结新闻（流式返回）
        # 目标：从大量新闻中提取重要信息，输出压缩后的新闻内容（而非仅仅 JSON）
        logger.info("[HKStockMarketAnalysis] 第一阶段：LLM 压缩总结新闻（流式）")
        news_compress_prompt = self._build_news_compress_prompt(news_text, market_snapshot)

        try:
            content_parts = []
            async for chunk in llm_service.chat_stream(
                    messages=[{"role": "user", "content": news_compress_prompt}],
                    provider=provider,
                    model=model,
                    temperature=0.3,  # 较低温度，使总结更稳定
                    max_tokens=3000
            ):
                if chunk.content:
                    content_parts.append(chunk.content)

            compressed_news = "".join(content_parts)
            logger.info("[HKStockMarketAnalysis] 新闻压缩完成")
        except Exception as e:
            logger.error(f"[HKStockMarketAnalysis] 新闻压缩失败：{e}")
            # 如果压缩失败，使用原始新闻（会警告）
            compressed_news = news_text
            logger.warning("[HKStockMarketAnalysis] 新闻压缩失败，使用原始新闻")

        # 5. 第二阶段：基于压缩后的新闻 + 市场快照生成分析报告
        # 注意：只传入压缩后的新闻，不传入原始新闻，节省 token
        logger.info("[HKStockMarketAnalysis] 第二阶段：生成投资分析报告")
        analysis_prompt = self._build_hkstock_market_analysis_prompt_v2(
            compressed_news=compressed_news,
            market_snapshot=market_snapshot
        )
        print(analysis_prompt)
        try:
            content_parts = []
            async for chunk in llm_service.chat_stream(
                    messages=[{"role": "user", "content": analysis_prompt}],
                    provider=provider,
                    model=model,
                    temperature=0.5,
                    max_tokens=6000
            ):
                if chunk.content:
                    content_parts.append(chunk.content)

            investment_report = "".join(content_parts)
            logger.info("[HKStockMarketAnalysis] 分析报告生成完成")

            # market_snapshot 在构建时已经转换为 Python 原生类型，无需额外处理

            return {
                "market_snapshot": market_snapshot,
                "compressed_news": compressed_news,  # 压缩后的新闻
                "investment_report": investment_report,
                "news_summary": news_summary,  # 新闻摘要统计
                "_llm": {
                    "provider": provider or llm_service.get_provider_info().name,
                    "model": model or llm_service.get_provider_info(provider).model,
                }
            }

        except Exception as e:
            logger.error(f"[HKStockMarketAnalysis] 分析报告生成失败：{e}")
            raise

    def _build_hkstock_news_text(self, news_data: Dict[str, Any], max_news_per_category: int = 60) -> str:
        """
        构建新闻文本

        Args:
            news_data: 新闻数据字典
            max_news_per_category: 每个类别最大新闻数量，默认 50 条（原来限制 20 条）
        """
        lines = []

        # 要闻
        important_news = news_data.get('important_news', [])
        if important_news:
            lines.append("【要闻】")
            for i, news in enumerate(important_news[:max_news_per_category], 1):
                title = news.get('title', '')
                lines.append(f"  {i}. {title}")
            lines.append("")

        # 大行研报
        rank_news = news_data.get('rank_news', [])
        if rank_news:
            lines.append("【大行研报】")
            for i, news in enumerate(rank_news[:max_news_per_category], 1):
                title = news.get('title', '')
                publish_time = news.get('publish_time', '')
                line = f"  {i}. {title}"
                if publish_time:
                    line += f" ({publish_time})"
                lines.append(line)
            lines.append("")

        # 公司新闻
        company_news = news_data.get('company_news', [])
        if company_news:
            lines.append("【公司新闻】")
            for i, news in enumerate(company_news[:max_news_per_category], 1):
                title = news.get('title', '')
                publish_time = news.get('publish_time', '')
                line = f"  {i}. {title}"
                if publish_time:
                    line += f" ({publish_time})"
                lines.append(line)
            lines.append("")

        # 统计信息
        summary = news_data.get('summary', {})
        lines.append(f"【新闻统计】共 {summary.get('total_count', 0)} 条新闻")
        lines.append(f"  - 要闻：{summary.get('important_news_count', 0)} 条")
        lines.append(f"  - 大行研报：{summary.get('rank_news_count', 0)} 条")
        lines.append(f"  - 公司新闻：{summary.get('company_news_count', 0)} 条")

        return "\n".join(lines)

    async def _get_hk_market_snapshot(self) -> Dict[str, Any]:
        """
        获取港股市场动态数据快照（异步版本 - 使用新浪外汇爬虫）

        包含：
        1. 指數表現：恆生指數最新價、漲跌幅、成交額
        2. 外部情緒：美股中概股表現（納斯達克中國金龍指數）
        3. 貨幣與流動性：美元/離岸人民幣匯率（使用新浪外汇爬虫）、南向資金淨流入
        4. 市場寬度：港股上漲家數等

        Returns:
            市场快照数据字典
        """
        snapshot = {
            "index_performance": {},  # 指數表現
            "external_sentiment": {},  # 外部情緒（美股中概股）
            "currency_liquidity": {},  # 貨幣與流動性
            "market_breadth": {},  # 市場寬度
            "data_status": "partial"  # 数据状态：complete/partial/failed
        }

        try:
            # 1. 港股大盤：恆生指數 (HSI)
            try:
                hsi_data = self.akshare_provider.get_index_spot_data("HSI")
                if hsi_data:
                    snapshot["index_performance"] = {
                        "index_name": "恆生指數",
                        "index_code": "HSI",
                        "latest_price": hsi_data.get("last_price"),
                        "change_rate": hsi_data.get("change_rate"),
                        "turnover": hsi_data.get("turnover"),  # 成交額
                        "quote_time": hsi_data.get("quote_time")
                    }
                else:
                    snapshot["index_performance"] = {"index_name": "恆生指數", "status": "data_unavailable"}
            except Exception as e:
                logger.warning(f"[MarketSnapshot] 获取恆生指數数据失败：{e}")
                snapshot["index_performance"] = {"index_name": "恆生指數", "status": "fetch_failed"}

            # 2. 外部環境：美股中概股 (納斯達克中國金龍指數 .HXC)
            try:
                # 获取美股指数数据
                nasdaq_data = self.akshare_provider.get_us_index_spot(".HXC")
                # 注意：.HXC (纳斯达克中国金龙指数) 可能不在标准美股指数列表中
                if nasdaq_data:
                    snapshot["external_sentiment"] = {
                        "index_name": "納斯達克中國金龍指數",
                        "latest_price": nasdaq_data.get("last_price"),
                        "change_rate": nasdaq_data.get("change_rate"),
                        "note": "美股昨收，反映昨日情緒"
                    }
                else:
                    snapshot["external_sentiment"] = {"status": "data_unavailable"}
            except Exception as e:
                logger.warning(f"[MarketSnapshot] 获取美股中概股数据失败：{e}")
                snapshot["external_sentiment"] = {"status": "fetch_failed"}

            # 3. 貨幣與流動性：美元/離岸人民幣 (USD/CNY) - 使用新浪外汇爬虫
            try:
                usd_cny_data = await sina_forex_crawler.fetch_usd_cny()
                if usd_cny_data:
                    snapshot["currency_liquidity"]["usd_cny"] = {
                        "symbol": "USDCNY",
                        "name": "美元人民币",
                        "last_price": usd_cny_data.get("last_price"),
                        "change": usd_cny_data.get("change_number"),
                        "change_rate": usd_cny_data.get("change_rate"),
                        "high": usd_cny_data.get("high_price"),
                        "low": usd_cny_data.get("low_price"),
                        "open": usd_cny_data.get("open_price"),
                        "pre_close": usd_cny_data.get("pre_close"),
                        "time": usd_cny_data.get("time"),
                        "date": usd_cny_data.get("date"),
                        "data_source": "新浪财经外汇",
                        "note": "人民币走势直接影响港股中的内资股估值"
                    }
                else:
                    snapshot["currency_liquidity"]["usd_cny"] = {"status": "data_unavailable"}
            except Exception as e:
                logger.warning(f"[MarketSnapshot] 获取美元/人民币汇率数据失败（新浪外汇爬虫）：{e}")
                snapshot["currency_liquidity"]["usd_cny"] = {"status": "fetch_failed"}

            # 4. 資金流向：沪深港通资金流向
            # 使用接口：stock_hsgt_fund_flow_summary_em (无参数，返回完整资金流向数据)
            # 实际返回列名：交易日、类型、板块、资金方向、交易状态、成交净买额、资金净流入、当日资金余额、上涨数、持平数、下跌数、相关指数、指数涨跌幅
            try:
                fund_flow_data = ak.stock_hsgt_fund_flow_summary_em()
                if not fund_flow_data.empty:
                    # 格式化资金流向数据为文本，供 LLM 分析使用
                    fund_flow_lines = ["【沪深港通资金流向】"]
                    northbound_summary = []

                    for _, row in fund_flow_data.iterrows():
                        # 根据实际列名获取数据 - 使用 _convert_to_python_type 转换
                        trade_date = str(row.get('交易日', 'N/A'))
                        channel = str(row.get('类型', 'N/A'))  # 沪港通/深港通
                        board = str(row.get('板块', 'N/A'))  # 沪股通/深股通/港股通 (沪)/港股通 (深)
                        direction = str(row.get('资金方向', 'N/A'))  # 北向/南向
                        net_buy = _convert_to_python_type(row.get('成交净买额'))  # 成交净买额（亿元）
                        net_inflow = _convert_to_python_type(row.get('资金净流入'))  # 资金净流入（亿元）
                        up_count = _convert_to_python_type(row.get('上涨数'))  # 上涨家数
                        flat_count = _convert_to_python_type(row.get('持平数'))  # 持平家数
                        down_count = _convert_to_python_type(row.get('下跌数'))  # 下跌家数
                        index_name = str(row.get('相关指数', 'N/A'))
                        index_change = _convert_to_python_type(row.get('指数涨跌幅'))

                        line = (f"  - {channel} {board} ({direction}): "
                                f"成交净买额 {net_buy} 亿元，"
                                f"资金净流入 {net_inflow} 亿元，"
                                f"涨跌家数 {up_count}↑/{flat_count}平/{down_count}↓，"
                                f"相关指数 {index_name} ({index_change}%)")
                        fund_flow_lines.append(line)

                        # 北向资金汇总
                        if direction == '北向':
                            northbound_summary.append({
                                "channel": channel,
                                "board": board,
                                "net_buy": net_buy,
                                "net_inflow": net_inflow,
                                "up_count": up_count,
                                "down_count": down_count,
                                "index": index_name,
                                "index_change": index_change,
                            })

                    snapshot["currency_liquidity"]["fund_flow_summary"] = {
                        "formatted_text": "\n".join(fund_flow_lines),
                        "date": trade_date if trade_date != 'N/A' else None
                    }

                    if northbound_summary:
                        snapshot["currency_liquidity"]["northbound_summary"] = northbound_summary
                    else:
                        snapshot["currency_liquidity"]["northbound_summary"] = {"status": "data_unavailable"}
                else:
                    snapshot["currency_liquidity"]["fund_flow_summary"] = {"status": "data_unavailable"}
                    snapshot["currency_liquidity"]["northbound_summary"] = {"status": "data_unavailable"}
            except Exception as e:
                logger.warning(f"[MarketSnapshot] 获取沪深港通资金流向数据失败：{e}")
                snapshot["currency_liquidity"]["fund_flow_summary"] = {"status": "fetch_failed"}
                snapshot["currency_liquidity"]["northbound_summary"] = {"status": "fetch_failed"}

            # 5. 市場寬度：港股上漲家數
            try:
                # 获取所有港股实时行情
                hk_market_data = ak.stock_hk_spot()
                if hk_market_data is not None and not hk_market_data.empty:
                    # 计算上涨家数 - 使用 int() 确保转换为 Python 原生类型
                    positive_count = int(len(hk_market_data[hk_market_data['涨跌幅'] > 0]))
                    negative_count = int(len(hk_market_data[hk_market_data['涨跌幅'] < 0]))
                    unchanged_count = int(len(hk_market_data[hk_market_data['涨跌幅'] == 0]))

                    snapshot["market_breadth"] = {
                        "advancing_stocks": positive_count,  # 上漲家數
                        "declining_stocks": negative_count,  # 下跌家數
                        "unchanged_stocks": unchanged_count,  # 平盘家數
                        "total_stocks": len(hk_market_data),
                        "advance_decline_ratio": round(positive_count / negative_count,
                                                       2) if negative_count > 0 else None
                    }
                else:
                    snapshot["market_breadth"] = {"status": "data_unavailable"}
            except Exception as e:
                logger.warning(f"[MarketSnapshot] 获取市場寬度数据失败：{e}")
                snapshot["market_breadth"] = {"status": "fetch_failed"}

            # 检查数据状态
            available_sections = sum([
                1 if snapshot["index_performance"].get("latest_price") else 0,
                1 if snapshot["external_sentiment"].get("latest_price") else 0,
                1 if snapshot["currency_liquidity"].get("usd_cny", {}).get("last_price") else 0,
                1 if snapshot["currency_liquidity"].get("fund_flow_summary", {}).get("formatted_text") else 0,
                1 if snapshot["market_breadth"].get("advancing_stocks") else 0,
            ])

            if available_sections >= 4:
                snapshot["data_status"] = "complete"
            elif available_sections >= 2:
                snapshot["data_status"] = "partial"
            else:
                snapshot["data_status"] = "limited"

            logger.info(f"[MarketSnapshot] 获取完成，数据状态：{snapshot['data_status']}")

        except Exception as e:
            logger.error(f"[MarketSnapshot] 获取市场快照数据失败：{e}")
            snapshot["data_status"] = "failed"
            snapshot["error"] = str(e)

        return snapshot

    def _build_news_compress_prompt(self, news_text: str, market_snapshot: Dict[str, Any]) -> str:
        """
        构建新闻压缩 Prompt（第一阶段）

        目标：从大量原始新闻中压缩提取重要信息，输出结构化的压缩新闻内容
        输出格式：Markdown 格式，包含分类标签，便于第二阶段分析使用
        """
        snapshot_text = self._format_market_snapshot_for_prompt(market_snapshot)

        prompt = f"""你是一位专业的港股市场分析师。请根据以下市场新闻和市场动态数据，进行**压缩提炼**。

## 市场动态数据快照

{snapshot_text}

## 原始新闻汇总（待压缩）

{news_text}

---

## 压缩任务要求

请从以上原始新闻中**压缩提炼**出有价值的内容，按以下结构输出：

### 【政策与宏观】
筛选标准：重大政策变动、经济数据、国际形势等宏观信息
格式：`[标签] 新闻标题 - 一句话摘要（20 字内）`

### 【行业热点】
筛选标准：行业趋势、产业链动态、机构关注度高的板块
格式：`[标签] 新闻标题 - 一句话摘要（20 字内）`

### 【龙头公司动向】
筛选标准：龙头企业重大消息、业绩公告、资本运作
格式：`[标签] 新闻标题 - 一句话摘要（20 字内）`

### 【大行观点】
筛选标准：主流投行评级、目标价预测、重点推荐
格式：`[机构] 推荐板块/个股 - 核心观点（20 字内）`

### 【市场情绪】（1-2 条）
筛选标准：资金流向、投资者情绪、市场共识
格式：`[标签] 新闻标题 - 情绪影响（20 字内）`

---

## 输出格式要求

1. 使用 Markdown 格式
2. 每个分类下用无序列表展示
3. 标签示例：【政策利好】【业绩超预期】【监管收紧】【机构看好】【回购增持】等
4. 每条新闻严格控制在 30 字以内（标题 + 摘要）
5. 总体长度控制在 500-800 字

---

## 输出示例

```markdown
### 【政策与宏观】
- 【政策利好】央行降准 0.25 个百分点 - 释放长期流动性约 5000 亿元
- 【经济数据】10 月 PMI 50.2% - 连续 3 个月位于扩张区间

### 【行业热点】
- 【AI 热潮】微软加大 AI 投资 - 云业务增长超预期
- 【新能源】欧盟 2035 禁售燃油车 - 利好电动车产业链

### 【龙头公司动向】
- 【业绩超预期】腾讯 Q3 营收 1546 亿元 - Non-IFRS 净利增长 39%
- 【回购增持】阿里巴巴回购 10 亿美元 - 支撑股价信心

### 【大行观点】
- 【高盛】首选互联网龙头 - 目标价上调 20%
- 【摩根士丹利】看好新能源 - 宁德时代增持评级

### 【市场情绪】
- 【南向资金】今日净流入 85 亿港元 - 连续 5 日净买入
- 【市场情绪】港股成交量放大 - 投资者信心回升
```

---

请按照上述格式，基于实际新闻内容输出压缩后的新闻摘要：
"""
        return prompt

    def _format_market_snapshot_for_prompt(self, snapshot: Dict[str, Any]) -> str:
        """将市场快照数据格式化为 prompt 文本"""
        lines = []

        # 指数表现
        idx = snapshot.get("index_performance", {})
        if idx.get("latest_price"):
            lines.append(f"1. 指數表現：")
            lines.append(f"   - 恆生指數：{idx.get('latest_price')} 點 (漲跌幅：{idx.get('change_rate')}%)")
            if idx.get("turnover"):
                lines.append(f"   - 成交額：{idx.get('turnover')} 港元")
        else:
            lines.append("1. 指數表現：数据暂缺")

        # 外部情绪
        ext = snapshot.get("external_sentiment", {})
        if ext.get("latest_price"):
            lines.append(f"2. 外部情緒 (美股中概股昨晚表現)：")
            lines.append(
                f"   - {ext.get('index_name', '納斯達克指數')}: {ext.get('latest_price')} (漲跌：{ext.get('change_rate')}%)")
            lines.append(f"   - 說明：{ext.get('note', '引导今日开盘情绪')}")
        else:
            lines.append("2. 外部情緒：数据暂缺")

        # 货币与流动性
        curr = snapshot.get("currency_liquidity", {})
        lines.append("3. 貨幣與流動性：")

        # USD/CNY 汇率
        usd_cny = curr.get("usd_cny", {})
        if usd_cny.get("last_price"):
            line = f"   - 美元/人民幣 (USD/CNY): {usd_cny.get('last_price')}"
            if usd_cny.get("change") or usd_cny.get("change_rate"):
                parts = []
                if usd_cny.get("change"):
                    parts.append(f"涨跌额：{usd_cny.get('change')}")
                if usd_cny.get("change_rate"):
                    parts.append(f"涨跌幅：{usd_cny.get('change_rate')}%")
                line += f" ({', '.join(parts)})"
            lines.append(line)
        else:
            lines.append("   - 美元/人民幣：数据暂缺")

        # 沪深港通资金流向（格式化文本直接提供给 LLM）
        fund_flow = curr.get("fund_flow_summary", {})
        if fund_flow.get("formatted_text"):
            # 资金流向数据已经自带【】标题，直接追加
            lines.append(f"   {fund_flow.get('formatted_text')}")
        else:
            lines.append("   - 沪深港通资金流向：数据暂缺")

        # 市场宽度
        breadth = snapshot.get("market_breadth", {})
        if breadth.get("advancing_stocks") is not None:
            lines.append("4. 市場寬度：")
            lines.append(f"   - 港股上漲家數：{breadth.get('advancing_stocks')} 家")
            lines.append(f"   - 港股下跌家數：{breadth.get('declining_stocks')} 家")
            lines.append(f"   - 平盘家數：{breadth.get('unchanged_stocks')} 家")
            if breadth.get("advance_decline_ratio"):
                lines.append(f"   - 漲跌比：{breadth.get('advance_decline_ratio')}")
        else:
            lines.append("4. 市場寬度：数据暂缺")

        return "\n".join(lines)

    def _build_hkstock_market_analysis_prompt_v2(
            self,
            compressed_news: str,
            market_snapshot: Dict[str, Any]
    ) -> str:
        """
        构建港股市场分析 Prompt（第二版 - 综合分析报告）

        基于压缩后的新闻和市场快照数据，生成完整的投资策略报告
        注意：只传入压缩后的新闻，不传入原始新闻，节省 token
        """
        snapshot_text = self._format_market_snapshot_for_prompt(market_snapshot)

        prompt = f"""你是一位专业的港股投资顾问，拥有丰富的港股市场经验。请基于以下**压缩后的新闻摘要**和**市场动态数据**，进行全面的分析并给出投资建议。

## 市场动态数据快照

{snapshot_text}

## 压缩后的新闻摘要（已由 AI 提炼）

{compressed_news}

---

## 分析要求

请从以下几个维度进行深度分析，并以 **Markdown 格式** 返回报告：

### 1. 市场要闻解读
- 识别当前市场最关注的热点话题
- 分析重大政策变动及其影响
- 解读宏观经济信号

### 2. 行业趋势分析
- 哪些行业受到机构关注
- 行业政策环境变化
- 产业链上下游动态

### 3. 大行观点汇总
- 主流投行的评级倾向（看好/谨慎/中性）
- 重点推荐板块和个股
- 目标价预测区间

### 4. 公司动态分析
- 龙头企业最新动向
- 业绩披露情况
- 重大资本运作（并购、分拆、回购等）

### 5. 风险因素识别
- 政策风险
- 市场风险
- 汇率风险
- 地缘政治风险

### 6. 投资策略建议
- **总体仓位建议**：高仓位/中等仓位/低仓位
- **配置方向**：推荐关注的板块和主题
- **操作策略**：逢低吸纳/逢高减仓/观望等待
- **关注时点**：需要重点关注的经济数据发布时间、政策窗口期等

---

## 输出格式要求

1. **标题层级**：使用一级标题 (#) 作为报告主标题，二级标题 (##) 作为各章节标题
2. **重点突出**：关键信息使用 **加粗** 标记
3. **列表格式**：使用无序列表 (-) 或有序列表 (1. 2. 3.) 展示要点
4. **引用强调**：重要提示使用引用块 (> )
5. **表格呈现**：如有数据对比，优先使用表格格式
6. **篇幅控制**：报告总长度控制在 1200-2000 字
7. **语言风格**：专业但不晦涩，适合中等投资经验的读者
8. **数据引用**：在分析中引用市场快照中的具体数据（如恆指点位、南向资金等）

---

## Markdown 输出模板

```markdown
# 港股市场投资策略报告

> 报告日期：YYYY-MM-DD
>
> **市场快照**：
> - 恆生指數：xxx 點 (漲跌：x.xx%)
> - 成交額：xxx 億港元
> - 南向資金：xxx 億元
> - 漲跌比：x.xx

## 一、市场要闻解读

（此处撰写市场要闻解读，约 200-300 字）

**核心观点**：
- 观点一
- 观点二
- 观点三

## 二、行业趋势分析

### 热门板块

| 板块名称 | 关注热度 | 主要驱动因素 |
|---------|---------|-------------|
| xxx     | 高/中/低 | xxx         |

### 行业政策动态

- **政策一**：影响分析
- **政策二**：影响分析

## 三、大行观点汇总

**整体评级倾向**：看好 / 中性 / 谨慎

**重点推荐**：
- 板块/个股 1：目标价 xxx
- 板块/个股 2：目标价 xxx

## 四、公司动态分析

- **公司名称 1**：重要事件及点评
- **公司名称 2**：重要事件及点评

## 五、风险因素

| 风险类型 | 风险等级 | 说明 |
|---------|---------|------|
| 政策风险 | 高/中/低 | xxx  |
| 市场风险 | 高/中/低 | xxx  |
| 汇率风险 | 高/中/低 | xxx  |

## 六、投资策略建议

> 核心策略：XXXXXX

### 仓位建议

建议保持 **XX%** 左右仓位

### 配置方向

1. **首选板块**：xxx
2. **次选板块**：xxx

### 操作策略

- 逢低吸纳：xxx
- 逢高减仓：xxx
- 观望等待：xxx

### 近期关注时点

- **日期/時段**：事件名称
- **日期/時段**：事件名称

---

> **免责声明**：以上分析仅供参考，不构成投资建议。投资有风险，决策需谨慎。
```

---

请根据压缩后的新闻摘要和市场数据，按照上述模板格式输出专业的分析报告：
"""
        return prompt

    def _build_hkstock_market_analysis_prompt(self, news_text: str) -> str:
        """构建港股市场分析 Prompt"""

        prompt = f"""你是一位专业的港股投资顾问，拥有丰富的港股市场经验。请基于以下最新的市场新闻，进行全面的分析并给出投资建议。

## 市场新闻汇总

{news_text}

---

## 分析要求

请从以下几个维度进行深度分析，并以 **Markdown 格式** 返回报告：

### 1. 市场要闻解读
- 识别当前市场最关注的热点话题
- 分析重大政策变动及其影响
- 解读宏观经济信号

### 2. 行业趋势分析
- 哪些行业受到机构关注
- 行业政策环境变化
- 产业链上下游动态

### 3. 大行观点汇总
- 主流投行的评级倾向（看好/谨慎/中性）
- 重点推荐板块和个股
- 目标价预测区间

### 4. 公司动态分析
- 龙头企业最新动向
- 业绩披露情况
- 重大资本运作（并购、分拆、回购等）

### 5. 风险因素识别
- 政策风险
- 市场风险
- 汇率风险
- 地缘政治风险

### 6. 投资策略建议
- **总体仓位建议**：高仓位/中等仓位/低仓位
- **配置方向**：推荐关注的板块和主题
- **操作策略**：逢低吸纳/逢高减仓/观望等待
- **关注时点**：需要重点关注的经济数据发布时间、政策窗口期等

---

## 输出格式要求

1. **标题层级**：使用一级标题 (#) 作为报告主标题，二级标题 (##) 作为各章节标题
2. **重点突出**：关键信息使用 **加粗** 标记
3. **列表格式**：使用无序列表 (-) 或有序列表 (1. 2. 3.) 展示要点
4. **引用强调**：重要提示使用引用块 (> )
5. **表格呈现**：如有数据对比，优先使用表格格式
6. **篇幅控制**：报告总长度控制在 1500-2500 字
7. **语言风格**：专业但不晦涩，适合中等投资经验的读者

---

## Markdown 输出模板

```markdown
# 港股市场投资策略报告

> 报告日期：YYYY-MM-DD

## 一、市场要闻解读

（此处撰写市场要闻解读，约 300-400 字）

**核心观点**：
- 观点一
- 观点二
- 观点三

## 二、行业趋势分析

### 热门板块

| 板块名称 | 关注热度 | 主要驱动因素 |
|---------|---------|-------------|
| xxx     | 高/中/低 | xxx         |

### 行业政策动态

- **政策一**：影响分析
- **政策二**：影响分析

## 三、大行观点汇总

**整体评级倾向**：看好 / 中性 / 谨慎

**重点推荐**：
- 板块/个股 1：目标价 xxx
- 板块/个股 2：目标价 xxx

## 四、公司动态分析

- **公司名称 1**：重要事件及点评
- **公司名称 2**：重要事件及点评

## 五、风险因素

| 风险类型 | 风险等级 | 说明 |
|---------|---------|------|
| 政策风险 | 高/中/低 | xxx  |
| 市场风险 | 高/中/低 | xxx  |
| 汇率风险 | 高/中/低 | xxx  |

## 六、投资策略建议

> 核心策略：XXXXXX

### 仓位建议

建议保持 **XX%** 左右仓位

### 配置方向

1. **首选板块**：xxx
2. **次选板块**：xxx

### 操作策略

- 逢低吸纳：xxx
- 逢高减仓：xxx
- 观望等待：xxx

### 近期关注时点

- **日期/时段**：事件名称
- **日期/时段**：事件名称

---

> **免责声明**：以上分析仅供参考，不构成投资建议。投资有风险，决策需谨慎。
```

---

请根据实际新闻内容，按照上述模板格式输出专业的分析报告：
"""
        return prompt

# 创建全局单例（需要 db 会话的实例在使用时创建）
# stock_analysis_service = StockAnalysisService(db=None)  # type: ignore
