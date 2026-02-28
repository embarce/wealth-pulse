"""
股票 AI 分析服务
整合公司信息、K线数据、新闻、财务指标、公告等信息，通过 LLM 进行分析
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
import json

from app.models.stock_info import StockInfo
from app.models.stock_market_data import StockMarketData
from app.models.stock_market_history import StockMarketHistory
from app.llm import llm_service
from app.services.stock_service import StockService
from app.services.sina_company_info_crawler import sina_company_info_crawler
from app.services.sina_news_crawler import sina_news_crawler
from app.services.sina_finance_crawler import sina_finance_crawler
from app.services.sina_company_notice_crawler import sina_company_notice_crawler

logger = logging.getLogger(__name__)


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
        logger.info(f"[StockAnalysis] 开始分析股票: {stock_code}")

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

        # 3. 获取历史数据
        end_date = date.today()
        start_date = end_date - timedelta(days=days * 2)  # 乘以2以包含非交易日
        history_data = self.stock_service.get_historical_data(
            stock_code=stock_code,
            start_date=start_date,
            end_date=end_date,
            limit=days
        )

        if len(history_data) < 10:
            raise ValueError(f"历史数据不足，仅有 {len(history_data)} 条记录")

        # 4. 获取公司信息（新浪）
        try:
            company_info = sina_company_info_crawler.fetch_company_info_sync(stock_code)
        except Exception as e:
            logger.warning(f"[StockAnalysis] 获取公司信息失败: {e}")
            company_info = {}

        # 5. 获取新闻（新浪）
        try:
            news_items = sina_news_crawler.fetch_stock_news_sync(stock_code)
            # 只取最近5条新闻
            recent_news = news_items[:5] if news_items else []
        except Exception as e:
            logger.warning(f"[StockAnalysis] 获取新闻失败: {e}")
            recent_news = []

        # 6. 获取财务指标（新浪）
        try:
            financial_data = sina_finance_crawler.fetch_financial_indicators_sync(stock_code)
        except Exception as e:
            logger.warning(f"[StockAnalysis] 获取财务指标失败: {e}")
            financial_data = {}

        # 7. 获取公告（新浪）
        try:
            notices = sina_company_notice_crawler.fetch_company_notices_sync(stock_code, max_pages=1)
            # 只取最近3条公告
            recent_notices = notices[:3] if notices else []
        except Exception as e:
            logger.warning(f"[StockAnalysis] 获取公告失败: {e}")
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

            logger.info(f"[StockAnalysis] 分析完成: {stock_code}")
            return parsed_result

        except Exception as e:
            logger.error(f"[StockAnalysis] LLM 分析失败: {e}")
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
        logger.info(f"[PositionAnalysis] 开始分析持仓: {len(positions)} 只股票")

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

                # 获取历史数据（根据分析深度调整天数）
                days = {"quick": 20, "standard": 60, "deep": 120}.get(analysis_depth, 60)
                end_date = date.today()
                start_date = end_date - timedelta(days=days * 2)
                history_data = self.stock_service.get_historical_data(
                    stock_code=stock_code,
                    start_date=start_date,
                    end_date=end_date,
                    limit=days
                )

                # 获取公司信息
                company_info = {}
                financial_data = {}
                try:
                    company_info = sina_company_info_crawler.fetch_company_info_sync(stock_code)
                except Exception:
                    pass

                try:
                    financial_data = sina_finance_crawler.fetch_financial_indicators_sync(stock_code)
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
                logger.error(f"[PositionAnalysis] 处理 {stock_code} 时出错: {e}")
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
            logger.error(f"[PositionAnalysis] LLM 分析失败: {e}")
            raise

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
            "average": sum(prices) / len(prices),
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
            recent = history_data[:20]  # 只取最近20条
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
  - 最新报告期: {latest.get('end_date', '')} ({latest.get('report_type', '')})
  - 营业收入: {latest.get('revenue', 'N/A')} 百万元
  - 净利润: {latest.get('net_profit', 'N/A')} 百万元
  - 毛利率: {latest.get('gross_profit_margin', 'N/A')}%
  - 净利率: {latest.get('net_profit_margin', 'N/A')}%
  - 基本每股盈利: {latest.get('eps_basic', 'N/A')} 仙
  - 流动比率: {latest.get('current_ratio', 'N/A')}
  - 负债率: {latest.get('debt_ratio', 'N/A')}%
"""

        prompt = f"""你是一位专业的股票分析师，请根据以下信息对股票进行综合分析，并以 JSON 格式返回分析结果。

## 股票基本信息
- 股票代码: {stock_code}
- 公司名称: {stock_info.company_name}
- 所属行业: {stock_info.industry or 'N/A'}
- 市值: {stock_info.market_cap or 'N/A'}

## 当前市场数据
- 最新价格: {market_data.last_price} 港元
- 涨跌额: {market_data.change_number}
- 涨跌幅: {market_data.change_rate}%
- 开盘价: {market_data.open_price}
- 最高价: {market_data.high_price}
- 最低价: {market_data.low_price}
- 成交量: {market_data.volume}
- 成交额: {market_data.turnover} 港元
- 市盈率: {market_data.pe_ratio or 'N/A'}
- 市净率: {market_data.pb_ratio or 'N/A'}

## 公司信息
- 主营业务: {company_info.get('business_description', 'N/A')}
- 主席: {company_info.get('chairman', 'N/A')}

## 财务指标
{financial_text if financial_text else "  暂无财务数据"}

## 最近 K 线数据（最近20个交易日）
{history_text if history_text else "  暂无历史数据"}

## 最近新闻（最近5条）
{news_text if news_text else "  暂无新闻"}

## 最近公告（最近3条）
{notices_text if notices_text else "  暂无公告"}

---

请根据以上信息进行综合分析，并返回以下 JSON 格式的结果：

```json
{{
  "stock_code": "{stock_code}",
  "current_price": "{market_data.last_price}",
  "trend": "uptrend/downtrend/sideways",
  "trend_description": "趋势描述（50字以内）",
  "technical_points": [
    {{
      "type": "support/resistance/stop_loss/take_profit",
      "price": "价格",
      "strength": 1-5,
      "description": "描述"
    }}
  ],
  "recommendation": "strong_buy/buy/hold/sell/strong_sell",
  "recommendation_reason": "建议理由（100字以内）",
  "risk_level": "low/medium/high",
  "risk_description": "风险描述（50字以内）",
  "target_price_range": "目标价区间（如：150-165）",
  "fundamental_analysis": "基本面分析（150字以内）",
  "technical_analysis": "技术面分析（150字以内）",
  "news_impact": "新闻影响分析（100字以内）",
  "rating": "买入/持有/卖出/观望",
  "confidence": "high/medium/low"
}}
```

注意：
1. 趋势判断要基于 K 线数据和价格走势
2. 技术点位要基于实际价格水平（支撑位低于当前价，压力位高于当前价）
3. 风险等级要结合估值、波动性等因素综合评估
4. 确保返回的是合法的 JSON 格式，不要有其他额外文字
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
                    logger.warning(f"[StockAnalysis] LLM 返回结果缺少字段: {field}")
                    # 设置默认值
                    if field == "technical_points":
                        result[field] = []
                    elif field in ["trend", "recommendation", "risk_level", "rating", "confidence"]:
                        result[field] = "unknown"
                    else:
                        result[field] = "暂无分析"

            return result

        except json.JSONDecodeError as e:
            logger.error(f"[StockAnalysis] 解析 LLM 返回结果失败: {e}")
            logger.error(f"[StockAnalysis] LLM 输出: {llm_output}")

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
  - 买入价格: {stock['buy_price']:.2f} 港元
  - 持仓数量: {stock['quantity']} 股
  - 买入日期: {stock['buy_date'] or '未知'}
  - 成本: {stock['cost']:.2f} 港元
  - 当前市值: {stock['current_value']:.2f} 港元
  - 盈亏: {stock['profit_loss']:.2f} 港元 ({stock['profit_loss_percent']:.2f}%)
- **市场数据**:
  - 当前价格: {stock['current_price']:.2f} 港元
  - 今日涨跌: {stock['market_data'].get('change_rate', 'N/A')}%
  - 52周最高: {stock['market_data'].get('week52_high', 'N/A')}
  - 52周最低: {stock['market_data'].get('week52_low', 'N/A')}
  - 市盈率: {stock['market_data'].get('pe_ratio', 'N/A')}
  - 市净率: {stock['market_data'].get('pb_ratio', 'N/A')}
- **历史走势摘要**:
  - 数据点数: {stock['history_summary'].get('data_points', 0)}
  - 期间最高: {stock['history_summary'].get('highest', 'N/A')}
  - 期间最低: {stock['history_summary'].get('lowest', 'N/A')}
  - 期间均价: {stock['history_summary'].get('average', 'N/A'):.2f if stock['history_summary'].get('average') else 'N/A'}
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
- 总成本: {portfolio_stats['total_cost']:.2f} 港元
- 当前总市值: {portfolio_stats['total_current_value']:.2f} 港元
- 总盈亏: {portfolio_stats['total_profit_loss']:.2f} 港元 ({portfolio_stats['total_profit_loss_percent']:.2f}%)
- 持仓数量: {portfolio_stats['position_count']} 只

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
      "risk_warning": "风险提示内容"
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
    "key_points": ["要点1", "要点2", "要点3"],
    "risk_summary": "整体风险描述",
    "suggested_actions": ["建议操作1", "建议操作2"]
  }},
  "market_outlook": {{
    "trend": "看涨/震荡/看跌",
    "confidence": "high/medium/low",
    "key_factors": ["因素1", "因素2"]
  }}
}}
```

**评分标准参考**：
- 90-100分(A): 优质持仓，基本面优秀，技术面强势，风险可控
- 80-89分(B): 良好持仓，基本面稳健，有一定上涨空间
- 70-79分(C): 一般持仓，需关注风险，可考虑调整
- 60-69分(D): 较差持仓，存在明显问题，建议减仓或清仓
- 60分以下(E): 劣质持仓，风险较高，建议清仓

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
            logger.error(f"[PositionAnalysis] 解析失败: {e}")
            logger.error(f"[PositionAnalysis] 输出: {llm_output[:500]}")

            return {
                "portfolio_summary": {
                    "overall_score": 0,
                    "overall_rating": "分析失败",
                    "risk_level": "未知",
                    "diversification": "未知",
                    "investment_style": "未知"
                },
                "position_scores": [
                    {"stock_code": s["stock_code"], "score": 0, "grade": "N/A", "holding_quality": "未知", "profit_prospect": "未知", "risk_warning": "解析失败"}
                    for s in stocks_data
                ],
                "position_recommendations": [
                    {"stock_code": s["stock_code"], "action": "持有", "reason": "解析失败，建议手动分析", "confidence": "low"}
                    for s in stocks_data
                ],
                "portfolio_stats": portfolio_stats,
                "stocks_detail": stocks_data,
                "error": "解析失败"
            }