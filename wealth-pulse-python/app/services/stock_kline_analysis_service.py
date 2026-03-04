"""
股票 K 线分析服务
基于用户提供的 K 线数据，通过 LLM 进行技术分析
不依赖数据库，所有数据由调用方提供
"""
import logging
import json
from typing import Dict, Any, Optional, List
from decimal import Decimal

from app.llm import llm_service
from app.schemas.kline_analysis import KlineData, KlineAnalysisVo, TechnicalPointVo, StockInfo

logger = logging.getLogger(__name__)


class StockKlineAnalysisService:
    """
    股票 K 线分析服务

    基于用户提供的 K 线数据，通过 LLM 进行技术分析，返回：
    1. 趋势判断
    2. 技术点位（支撑位、压力位等）
    3. 买卖建议
    4. 风险评估

    特点：
    - 不依赖数据库
    - 所有数据由调用方提供
    - 纯 AI 分析服务
    """

    async def analyze_kline(
        self,
        stock_code: str,
        kline_data: List[KlineData],
        stock_info: Optional[StockInfo] = None,
        current_price: Optional[Decimal] = None,
        period: str = "daily",
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> KlineAnalysisVo:
        """
        AI 分析 K 线

        Args:
            stock_code: 股票代码
            kline_data: K 线数据列表
            stock_info: 股票基本信息（可选）
            current_price: 当前价格（可选，不传则使用 K 线数据最新收盘价）
            period: 周期 (daily, weekly, monthly)
            provider: LLM 供应商 (doubao, openai, qwen 等)
            model: 模型名称

        Returns:
            KlineAnalysisVo K 线分析结果
        """
        logger.info(f"[KlineAnalysis] 开始分析 K 线：{stock_code}, 数据条数：{len(kline_data)}")

        # 获取当前价格（使用传入值或 K 线最新收盘价）
        if current_price:
            price = str(current_price)
        elif kline_data:
            price = str(kline_data[-1].close)
        else:
            price = "0"

        # 计算 K 线统计数据
        kline_stats = self._calculate_kline_stats(kline_data)

        # 构建 LLM Prompt
        prompt = self._build_kline_analysis_prompt(
            stock_code=stock_code,
            stock_info=stock_info,
            current_price=price,
            kline_data=kline_data,
            kline_stats=kline_stats,
            period=period
        )

        # 调用 LLM 分析
        try:
            response = await llm_service.chat(
                messages=[{"role": "user", "content": prompt}],
                provider=provider,
                model=model,
                temperature=0.7,
                max_tokens=5000  # 增加 token 限制，确保 AI 能输出完整的 JSON
            )
            analysis_result = response.content

            # 解析 LLM 返回结果
            result = self._parse_analysis_result(analysis_result, stock_code, price)

            logger.info(f"[KlineAnalysis] 分析完成：{stock_code}")
            return result

        except Exception as e:
            logger.error(f"[KlineAnalysis] LLM 分析失败：{e}")
            raise

    def _calculate_kline_stats(self, kline_data: List[KlineData]) -> Dict[str, Any]:
        """计算 K 线统计数据"""
        if not kline_data:
            return {}

        closes = [float(k.close) for k in kline_data]
        highs = [float(k.high) for k in kline_data]
        lows = [float(k.low) for k in kline_data]
        volumes = [k.volume for k in kline_data]

        # 计算波动率（最高价 - 最低价）/ 收盘价 的平均值
        volatilities = [(highs[i] - lows[i]) / closes[i] * 100 for i in range(len(closes))]
        avg_volatility = sum(volatilities) / len(volatilities) if volatilities else 0

        # 计算价格变化百分比
        price_change_percent = (closes[-1] - closes[0]) / closes[0] * 100 if len(closes) > 1 and closes[0] > 0 else 0

        return {
            "highest_price": max(highs),
            "lowest_price": min(lows),
            "average_price": sum(closes) / len(closes),
            "price_change_percent": price_change_percent,
            "average_volume": sum(volumes) // len(volumes) if volumes else 0,
            "volatility": avg_volatility,
            "data_points": len(kline_data),
        }

    def _build_kline_analysis_prompt(
        self,
        stock_code: str,
        stock_info: Optional[StockInfo],
        current_price: str,
        kline_data: List[KlineData],
        kline_stats: Dict[str, Any],
        period: str
    ) -> str:
        """构建 K 线分析 Prompt"""

        # 股票信息
        company_name = stock_info.company_name if stock_info else "未知"
        industry = stock_info.industry if stock_info else "未知"

        # 格式化 K 线数据
        kline_text = "\n".join([
            f"  {k.date}: 开={k.open}, 高={k.high}, 低={k.low}, 收={k.close}, 量={k.volume}"
            for k in kline_data[-30:]  # 只取最近 30 条
        ])

        # 判断趋势描述
        trend_hint = ""
        if kline_stats.get("price_change_percent", 0) > 10:
            trend_hint = "从数据看，近期呈现明显上涨趋势"
        elif kline_stats.get("price_change_percent", 0) < -10:
            trend_hint = "从数据看，近期呈现明显下跌趋势"
        elif abs(kline_stats.get("price_change_percent", 0)) <= 5:
            trend_hint = "从数据看，近期呈现横盘整理态势"

        prompt = f"""你是一位专业的股票技术分析师，请根据以下 K 线数据对股票进行技术分析，并以 JSON 格式返回分析结果。

## 股票基本信息
- 股票代码：{stock_code}
- 公司名称：{company_name}
- 所属行业：{industry}

## 当前价格
- 最新价格：{current_price}

## K 线统计数据
- 数据周期：{period}
- 数据条数：{kline_stats.get('data_points', 0)}
- 期间最高价：{kline_stats.get('highest_price', 'N/A')}
- 期间最低价：{kline_stats.get('lowest_price', 'N/A')}
- 期间平均价：{kline_stats.get('average_price', 'N/A'):.2f}
- 价格变化幅度：{kline_stats.get('price_change_percent', 0):.2f}%
- 平均成交量：{kline_stats.get('average_volume', 0)}
- 平均波动率：{kline_stats.get('volatility', 0):.2f}%

{trend_hint}

## K 线数据（最近 30 条）
{kline_text}

---

请根据以上 K 线数据进行技术分析，返回以下 JSON 格式的结果：

```json
{{
  "stock_code": "{stock_code}",
  "current_price": "{current_price}",
  "trend": "uptrend/downtrend/sideways",
  "trend_description": "趋势描述（50 字以内）",
  "technical_points": [
    {{
      "type": "support/resistance/stop_loss/take_profit",
      "price": "价格（字符串格式）",
      "strength": 1-5,
      "description": "描述"
    }}
  ],
  "recommendation": "strong_buy/buy/hold/sell/strong_sell",
  "recommendation_reason": "建议理由（100 字以内）",
  "risk_level": "low/medium/high",
  "target_price_range": "目标价区间（如：150-165）",
  "analysis_note": "分析说明（免责声明等）"
}}
```

**趋势判断标准**：
- uptrend: 近期低点不断抬高，高点也不断抬高
- downtrend: 近期高点不断降低，低点也不断降低
- sideways: 价格在一定区间内震荡，无明显方向

**技术点位说明**：
- support: 支撑位（低于当前价）
- resistance: 压力位（高于当前价）
- stop_loss: 止损位
- take_profit: 止盈位

**建议等级说明**：
- strong_buy: 强烈买入（技术面强烈看涨，多重利好）
- buy: 买入（技术面看涨，有上涨空间）
- hold: 持有（技术面中性，观望为主）
- sell: 卖出（技术面看跌，建议减仓）
- strong_sell: 强烈卖出（技术面强烈看跌，风险较高）

**风险等级说明**：
- low: 低风险（波动率小，趋势稳定）
- medium: 中风险（波动率适中）
- high: 高风险（波动率大，趋势不明或剧烈波动）

注意：
1. 趋势判断要基于 K 线数据的实际走势
2. 技术点位要基于实际价格水平（支撑位低于当前价，压力位高于当前价）
3. 至少提供 2-4 个技术点位
4. 确保返回的是合法的 JSON 格式，不要有其他额外文字
"""

        return prompt

    def _parse_analysis_result(self, llm_output: str, stock_code: str, current_price: str) -> KlineAnalysisVo:
        """解析 LLM 返回的分析结果"""

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

            # 尝试修复可能的截断 JSON
            # 如果 JSON 被截断，尝试找到最后一个完整的字段
            if not clean_output.endswith("}"):
                logger.warning(f"[KlineAnalysis] JSON 可能被截断，尝试修复...")

                # 检查是否包含不完整字符串（未闭合的引号）
                # 查找最后一个完整的键值对
                last_colon = clean_output.rfind(":")
                last_quote = clean_output.rfind('"')

                # 如果在最后一个冒号后有未闭合的字符串，截断到冒号前
                if last_colon > 0 and last_quote > last_colon:
                    # 找到最后一个完整的键
                    prev_quote = clean_output.rfind('"', 0, last_colon)
                    if prev_quote > 0:
                        # 截断到最后一个完整的键值对之前
                        clean_output = clean_output[:prev_quote].rstrip(",") + "}"

                # 找到最后一个完整的 } 并截断
                last_brace = clean_output.rfind("}")
                last_bracket = clean_output.rfind("]")

                # 如果最后有未闭合的数组，尝试修复
                if last_bracket > last_brace:
                    # 找到数组最后一个完整的对象
                    clean_output = clean_output[:last_bracket+1]

                # 尝试补全结尾
                if not clean_output.endswith("}"):
                    clean_output = clean_output.rstrip(",") + "}"

            result = json.loads(clean_output)

            # 验证必要字段
            required_fields = [
                "stock_code", "current_price", "trend", "trend_description",
                "technical_points", "recommendation", "recommendation_reason",
                "risk_level", "target_price_range", "analysis_note"
            ]

            for field in required_fields:
                if field not in result:
                    logger.warning(f"[KlineAnalysis] LLM 返回结果缺少字段：{field}")
                    if field == "technical_points":
                        result[field] = []
                    elif field in ["trend", "recommendation", "risk_level"]:
                        result[field] = "unknown"
                    else:
                        result[field] = "暂无分析"

            # 构建技术点位列表
            technical_points = []
            for tp in result.get("technical_points", []):
                technical_points.append(TechnicalPointVo(
                    type=tp.get("type", "support"),
                    price=str(tp.get("price", "0")),
                    strength=int(tp.get("strength", 3)),
                    description=tp.get("description", "")
                ))

            # 构建返回结果
            return KlineAnalysisVo(
                stock_code=result.get("stock_code", stock_code),
                current_price=result.get("current_price", current_price),
                trend=result.get("trend", "unknown"),
                trend_description=result.get("trend_description", "暂无分析"),
                technical_points=technical_points,
                recommendation=result.get("recommendation", "hold"),
                recommendation_reason=result.get("recommendation_reason", "暂无分析"),
                risk_level=result.get("risk_level", "medium"),
                target_price_range=result.get("target_price_range", "N/A"),
                analysis_note=result.get("analysis_note", "以上分析基于技术指标，仅供参考")
            )

        except json.JSONDecodeError as e:
            logger.error(f"[KlineAnalysis] 解析 LLM 返回结果失败：{e}")
            logger.error(f"[KlineAnalysis] LLM 输出：{llm_output}")

            # 返回默认结构
            return KlineAnalysisVo(
                stock_code=stock_code,
                current_price=current_price,
                trend="unknown",
                trend_description="无法解析分析结果",
                technical_points=[],
                recommendation="hold",
                recommendation_reason="由于技术原因无法获取建议",
                risk_level="medium",
                target_price_range="N/A",
                analysis_note="分析失败，请稍后重试"
            )
