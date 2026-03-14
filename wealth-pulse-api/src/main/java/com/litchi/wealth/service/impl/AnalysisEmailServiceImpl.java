package com.litchi.wealth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.mapper.UserMapper;
import com.litchi.wealth.service.AnalysisEmailService;
import com.litchi.wealth.utils.EmailUtils;
import com.litchi.wealth.utils.MarkdownUtils;
import com.litchi.wealth.vo.ai.HkStockMarketAnalysisVo;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AI 分析日报邮件服务实现
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/3/9
 */
@Slf4j
@Service
public class AnalysisEmailServiceImpl implements AnalysisEmailService {

    @Autowired
    private EmailUtils emailUtils;

    @Autowired
    private UserMapper userMapper;

    /**
     * 系统配置
     */
    @Value("${system.website-url:https://wealth-pulse.com}")
    private String websiteUrl;

    @Value("${system.contact-url:mailto:support@wealth-pulse.com}")
    private String contactUrl;

    @Value("${system.unsubscribe-url:https://wealth-pulse.com/settings}")
    private String unsubscribeUrl;

    @Value("${system.version:1.0.0}")
    private String systemVersion;

    /**
     * AI 模型配置
     */
    private static final String DEFAULT_AI_MODEL = "Qwen3-Max";
    private static final String DEFAULT_DATA_SOURCE = "港股行情数据 + 新闻资讯 + 大行研报";
    private static final String DEFAULT_PROVIDER = "Qwen";

    /**
     * 邮件模板名称
     */
    private static final String EMAIL_TEMPLATE = "analysis_daily_template";

    /**
     * 邮件主题
     */
    private static final String EMAIL_SUBJECT = "【Wealth Pulse】AI 市场分析报告 - %s";

    @Override
    public int sendDailyAnalysisEmail(HkStockMarketAnalysisVo analysis, String reportDate) {
        log.info("========== 开始发送 AI 分析日报邮件 ==========");
        log.info("报告日期：{}", reportDate);

        // 获取所有订阅用户
        List<String> subscribedUsers = getSubscribedUsers();

        if (subscribedUsers.isEmpty()) {
            log.info("没有订阅用户，跳过邮件发送");
            return 0;
        }

        log.info("订阅用户数量：{}", subscribedUsers.size());

        int successCount = 0;
        int failCount = 0;

        // 逐个发送邮件
        for (String userEmail : subscribedUsers) {
            try {
                sendEmailToUser(userEmail, analysis, reportDate);
                successCount++;
                log.info("邮件发送成功：{}", userEmail);

                // 添加小延迟，避免触发速率限制
                Thread.sleep(200);
            } catch (Exception e) {
                failCount++;
                log.error("邮件发送失败：{}", userEmail, e);
            }
        }

        log.info("========== AI 分析日报邮件发送完成 ==========");
        log.info("总用户数：{}", subscribedUsers.size());
        log.info("成功：{} | 失败：{}", successCount, failCount);

        return successCount;
    }

    @Override
    public List<String> getSubscribedUsers() {
        // 查询所有正常状态的用户
        List<User> users = userMapper.selectList(
                new LambdaQueryWrapper<User>()
                        .eq(User::getStatus, "0")
                        .eq(User::getDelFlag, "0")
                        .isNotNull(User::getEmail)
                        .ne(User::getEmail, "")
        );

        // 返回去重后的邮箱列表
        return users.stream()
                .map(User::getEmail)
                .filter(email -> email != null && !email.trim().isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * 向单个用户发送邮件
     */
    private void sendEmailToUser(String userEmail, HkStockMarketAnalysisVo analysis, String reportDate) {
        // 构建邮件变量
        Map<String, String> variables = buildEmailVariables(userEmail, analysis, reportDate);

        // 发送邮件
        emailUtils.sendEmailByResend(
                userEmail,
                String.format(EMAIL_SUBJECT, reportDate),
                EMAIL_TEMPLATE,
                variables
        );
    }

    /**
     * 构建邮件变量映射
     */
    private Map<String, String> buildEmailVariables(String userEmail, HkStockMarketAnalysisVo analysis, String reportDate) {
        Map<String, String> variables = new HashMap<>();

        // 日期时间
        SimpleDateFormat dateTimeFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String now = dateTimeFormat.format(new java.util.Date());

        // 新闻统计数据
        HkStockMarketAnalysisVo.NewsSummary newsSummary = analysis.getNewsSummary();
        int importantNewsCount = newsSummary != null ? newsSummary.getImportantNewsCount() : 0;
        int rankNewsCount = newsSummary != null ? newsSummary.getRankNewsCount() : 0;
        int companyNewsCount = newsSummary != null ? newsSummary.getCompanyNewsCount() : 0;
        int totalNewsCount = newsSummary != null ? newsSummary.getTotalCount() : 0;

        // 填充变量
        variables.put("{{reportDate}}", reportDate);
        variables.put("{{aiModel}}", DEFAULT_AI_MODEL);
        variables.put("{{importantNewsCount}}", String.valueOf(importantNewsCount));
        variables.put("{{rankNewsCount}}", String.valueOf(rankNewsCount));
        variables.put("{{companyNewsCount}}", String.valueOf(companyNewsCount));
        variables.put("{{totalNewsCount}}", String.valueOf(totalNewsCount));
        // 将 Markdown 报告转换为 HTML（邮件专用，带内联样式）
        String rawReport = StringUtils.isNotBlank(analysis.getInvestmentReport()) ? MarkdownUtils.removeMarkdownCodeBlock(analysis.getInvestmentReport()) : "暂无分析报告";
        variables.put("{{analysisReport}}", MarkdownUtils.convertToHtmlForEmail(rawReport));
        // 压缩新闻摘要
        String compressedNews = StringUtils.isNotBlank(analysis.getCompressedNews()) ? MarkdownUtils.removeMarkdownCodeBlock(analysis.getCompressedNews()) : "暂无新闻摘要";
        variables.put("{{compressedNews}}", MarkdownUtils.convertToHtmlForEmail(compressedNews));
        // 市场快照数据（JSON 格式转换为 HTML 表格）
        String marketSnapshotHtml = buildMarketSnapshotHtml(analysis.getMarketSnapshot());
        variables.put("{{marketSnapshot}}", marketSnapshotHtml);
        variables.put("{{generatedTime}}", now);
        variables.put("{{dataSource}}", DEFAULT_DATA_SOURCE);
        variables.put("{{provider}}", DEFAULT_PROVIDER);
        variables.put("{{userEmail}}", userEmail);
        variables.put("{{systemVersion}}", systemVersion);
        variables.put("{{websiteUrl}}", websiteUrl);
        variables.put("{{contactUrl}}", contactUrl);
        variables.put("{{unsubscribeUrl}}", unsubscribeUrl);

        return variables;
    }

    /**
     * 构建市场快照 HTML 表格（使用优化后的样式）
     */
    private String buildMarketSnapshotHtml(HkStockMarketAnalysisVo.MarketSnapshot snapshot) {
        if (snapshot == null) {
            return "<p>暂无市场快照数据</p>";
        }

        StringBuilder html = new StringBuilder();
        html.append("<div>");

        // 指数表现
        if (snapshot.getIndexPerformance() != null) {
            HkStockMarketAnalysisVo.IndexPerformance index = snapshot.getIndexPerformance();
            html.append("<div class='snapshot-section'>");
            html.append("<div class='snapshot-title'>");
            html.append("<svg class='snapshot-title-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>");
            html.append("<path d='M3 3v18h18'/><path d='M18 17V9'/><path d='M13 17V5'/><path d='M8 17v-3'/>");
            html.append("</svg>指数表现</div>");
            html.append("<table class='snapshot-table'>");
            html.append("<thead><tr>");
            html.append("<th>指数名称</th>");
            html.append("<th>指数代码</th>");
            html.append("<th style='text-align: right;'>最新价</th>");
            html.append("<th style='text-align: right;'>涨跌幅</th>");
            html.append("<th style='text-align: right;'>成交额 (港元)</th>");
            html.append("</tr></thead><tbody>");

            if (index.getIndexName() != null) {
                String changeClass = index.getChangeRate() != null && index.getChangeRate() >= 0 ? "change-up" : "change-down";
                html.append("<tr>");
                html.append("<td>").append(index.getIndexName()).append("</td>");
                html.append("<td style='text-align: right;'>");
                html.append(index.getIndexCode() != null ? index.getIndexCode() : "N/A").append("</td>");
                html.append("<td style='text-align: right;'>");
                html.append(index.getLatestPrice() != null ? String.format("%.2f", index.getLatestPrice()) : "N/A").append("</td>");
                html.append("<td style='text-align: right;' class='").append(changeClass).append("'>");
                if (index.getChangeRate() != null) {
                    html.append(index.getChangeRate() >= 0 ? "+" : "").append(String.format("%.2f%%", index.getChangeRate()));
                } else {
                    html.append("N/A");
                }
                html.append("</td>");
                html.append("<td style='text-align: right;'>");
                if (index.getTurnover() != null) {
                    html.append(formatTurnover(index.getTurnover()));
                } else {
                    html.append("N/A");
                }
                html.append("</td>");
                html.append("</tr>");
            }

            html.append("</tbody></table>");
            html.append("</div>");
        }

        // 外部情绪
        if (snapshot.getExternalSentiment() != null) {
            HkStockMarketAnalysisVo.ExternalSentiment external = snapshot.getExternalSentiment();
            html.append("<div class='snapshot-section'>");
            html.append("<div class='snapshot-title'>");
            html.append("<svg class='snapshot-title-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>");
            html.append("<path d='M13 2L3 14H12L11 22L21 10H12L13 2z'/>");
            html.append("</svg>外部情绪</div>");

            if (external.getIndexName() != null) {
                html.append("<div class='sentiment-card'>");
                html.append("<div class='sentiment-info'>");
                html.append("<div class='sentiment-name'>").append(external.getIndexName()).append("</div>");
                if (external.getLatestPrice() != null) {
                    String changeClass = external.getChangeRate() != null && external.getChangeRate() >= 0 ? "change-up" : "change-down";
                    html.append("<div class='sentiment-value'>");
                    html.append(String.format("%.2f", external.getLatestPrice()));
                    if (external.getChangeRate() != null) {
                        html.append("<span class='sentiment-change ").append(changeClass).append("'>");
                        html.append(external.getChangeRate() >= 0 ? "+" : "").append(String.format("%.2f%%", external.getChangeRate()));
                        html.append("</span>");
                    }
                    html.append("</div>");
                } else {
                    html.append("<div class='sentiment-value'>数据暂不可用</div>");
                }
                if (StringUtils.isNotBlank(external.getNote())) {
                    html.append("<div class='sentiment-note'>").append(external.getNote()).append("</div>");
                }
                html.append("</div></div>");
            }
            html.append("</div>");
        }

        // 货币流动性
        if (snapshot.getCurrencyLiquidity() != null) {
            HkStockMarketAnalysisVo.CurrencyLiquidityInfo currencyInfo = snapshot.getCurrencyLiquidity();
            html.append("<div class='snapshot-section'>");
            html.append("<div class='snapshot-title'>");
            html.append("<svg class='snapshot-title-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>");
            html.append("<circle cx='12' cy='12' r='10'/><path d='M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8'/>");
            html.append("<path d='M12 18V6'/>");
            html.append("</svg>货币流动性</div>");

            // 美元/人民币汇率
            if (currencyInfo.getUsdCny() != null) {
                HkStockMarketAnalysisVo.CurrencyLiquidity usdCny = currencyInfo.getUsdCny();
                if (StringUtils.isNotBlank(usdCny.getName())) {
                    html.append("<div class='liquidity-item'>");
                    html.append("<div class='liquidity-header'>");
                    html.append("<span class='liquidity-name'>").append(usdCny.getName()).append("</span>");
                    if (usdCny.getLastPrice() != null) {
                        String changeClass = usdCny.getChangeRate() != null && usdCny.getChangeRate() >= 0 ? "change-up" : "change-down";
                        html.append("<div>");
                        html.append("<span class='liquidity-price'>").append(String.format("%.4f", usdCny.getLastPrice())).append("</span>");
                        if (usdCny.getChangeRate() != null) {
                            html.append("<span class='liquidity-change ").append(changeClass).append("'>");
                            html.append(usdCny.getChangeRate() >= 0 ? "+" : "").append(String.format("%.2f%%", usdCny.getChangeRate()));
                            html.append("</span>");
                        }
                        html.append("</div>");
                    }
                    html.append("</div>");
                    html.append("<div class='liquidity-details'>");
                    if (usdCny.getOpen() != null) {
                        html.append("开盘：").append(String.format("%.4f", usdCny.getOpen())).append(" | ");
                    }
                    if (usdCny.getHigh() != null) {
                        html.append("最高：").append(String.format("%.4f", usdCny.getHigh())).append(" | ");
                    }
                    if (usdCny.getLow() != null) {
                        html.append("最低：").append(String.format("%.4f", usdCny.getLow())).append(" | ");
                    }
                    if (usdCny.getPreClose() != null) {
                        html.append("前收：").append(String.format("%.4f", usdCny.getPreClose()));
                    }
                    html.append("</div>");
                    if (StringUtils.isNotBlank(usdCny.getNote())) {
                        html.append("<div class='sentiment-note' style='margin-top: 6px;'>").append(usdCny.getNote()).append("</div>");
                    }
                    html.append("</div>");
                }
            }

            // 沪深港通资金流向汇总
            if (currencyInfo.getFundFlowSummary() != null) {
                HkStockMarketAnalysisVo.FundFlowSummary fundFlow = currencyInfo.getFundFlowSummary();
                if (StringUtils.isNotBlank(fundFlow.getFormattedText())) {
                    html.append("<div class='liquidity-item'>");
                    html.append("<div class='liquidity-header'>");
                    html.append("<span class='liquidity-name'>沪深港通资金流向</span>");
                    if (StringUtils.isNotBlank(fundFlow.getDate())) {
                        html.append("<span class='sentiment-note'>日期：").append(fundFlow.getDate()).append("</span>");
                    }
                    html.append("</div>");
                    html.append("<div class='liquidity-details' style='line-height: 1.8;'>");
                    html.append(fundFlow.getFormattedText().replace("\n", "<br/>"));
                    html.append("</div></div>");
                }
            }

            // 北向资金汇总
            if (currencyInfo.getNorthboundSummary() != null && !currencyInfo.getNorthboundSummary().isEmpty()) {
                html.append("<table class='northbound-table'>");
                html.append("<thead><tr>");
                html.append("<th>通道</th>");
                html.append("<th>板块</th>");
                html.append("<th>净买额 (亿)</th>");
                html.append("<th>净流入 (亿)</th>");
                html.append("<th>涨跌比</th>");
                html.append("<th>相关指数</th>");
                html.append("</tr></thead><tbody>");

                for (HkStockMarketAnalysisVo.NorthboundItem item : currencyInfo.getNorthboundSummary()) {
                    if (item != null) {
                        html.append("<tr>");
                        html.append("<td>").append(item.getChannel() != null ? item.getChannel() : "N/A").append("</td>");
                        html.append("<td>").append(item.getBoard() != null ? item.getBoard() : "N/A").append("</td>");
                        html.append("<td>");
                        html.append(item.getNetBuy() != null ? formatNumber(item.getNetBuy()) : "N/A").append("</td>");
                        html.append("<td>");
                        html.append(item.getNetInflow() != null ? formatNumber(item.getNetInflow()) : "N/A").append("</td>");
                        html.append("<td>");
                        if (item.getUpCount() != null && item.getDownCount() != null) {
                            html.append(item.getUpCount()).append("/").append(item.getDownCount());
                        } else {
                            html.append("N/A");
                        }
                        html.append("</td>");
                        html.append("<td>");
                        if (StringUtils.isNotBlank(item.getIndex())) {
                            html.append(item.getIndex());
                            if (item.getIndexChange() != null) {
                                String changeClass = item.getIndexChange() >= 0 ? "change-up" : "change-down";
                                html.append(" <span class='").append(changeClass).append("'>");
                                html.append(item.getIndexChange() >= 0 ? "+" : "").append(String.format("%.2f%%", item.getIndexChange()));
                                html.append("</span>");
                            }
                        } else {
                            html.append("N/A");
                        }
                        html.append("</td></tr>");
                    }
                }
                html.append("</tbody></table>");
            }
            html.append("</div>");
        }

        // 市场宽度
        if (snapshot.getMarketBreadth() != null) {
            HkStockMarketAnalysisVo.MarketBreadth breadth = snapshot.getMarketBreadth();
            html.append("<div class='snapshot-section'>");
            html.append("<div class='snapshot-title'>");
            html.append("<svg class='snapshot-title-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>");
            html.append("<path d='M18 20V10'/><path d='M12 20V4'/><path d='M6 20v-6'/>");
            html.append("</svg>市场宽度</div>");

            html.append("<div class='breadth-container'>");
            html.append("<div class='breadth-item breadth-up'>");
            html.append("<div class='breadth-value'>").append(breadth.getAdvancingStocks() != null ? breadth.getAdvancingStocks() : 0).append("</div>");
            html.append("<div class='breadth-label'>上涨</div></div>");

            html.append("<div class='breadth-item breadth-unchanged'>");
            html.append("<div class='breadth-value'>").append(breadth.getUnchangedStocks() != null ? breadth.getUnchangedStocks() : 0).append("</div>");
            html.append("<div class='breadth-label'>平盘</div></div>");

            html.append("<div class='breadth-item breadth-down'>");
            html.append("<div class='breadth-value'>").append(breadth.getDecliningStocks() != null ? breadth.getDecliningStocks() : 0).append("</div>");
            html.append("<div class='breadth-label'>下跌</div></div>");
            html.append("</div>");

            if (breadth.getAdvanceDeclineRatio() != null) {
                html.append("<div class='breadth-ratio'>");
                html.append("上涨/下跌比率：").append(String.format("%.2f", breadth.getAdvanceDeclineRatio()));
                html.append("</div>");
            }
            html.append("</div>");
        }

        html.append("</div>");
        return html.toString();
    }

    /**
     * 格式化成交额
     */
    private String formatTurnover(Double turnover) {
        if (turnover == null) {
            return "N/A";
        }
        // turnover 单位是元，转换为亿元
        if (turnover >= 100000000) {
            return String.format("%.2f 亿", turnover / 100000000);
        } else if (turnover >= 10000000) {
            return String.format("%.2f 千万", turnover / 10000000);
        } else {
            return String.format("%.0f 万", turnover / 10000);
        }
    }

    /**
     * 格式化数字（两位小数）
     */
    private String formatNumber(Double value) {
        if (value == null) {
            return "N/A";
        }
        return String.format("%.2f", value);
    }
}
