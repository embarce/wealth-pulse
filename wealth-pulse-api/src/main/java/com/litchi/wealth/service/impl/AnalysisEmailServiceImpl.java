package com.litchi.wealth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.mapper.UserMapper;
import com.litchi.wealth.service.AnalysisEmailService;
import com.litchi.wealth.utils.EmailUtils;
import com.litchi.wealth.utils.MarkdownUtils;
import com.litchi.wealth.vo.ai.HkStockMarketAnalysisVo;
import lombok.extern.slf4j.Slf4j;
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
        String rawReport = analysis.getReport() != null ? analysis.getReport() : "暂无分析报告";
        variables.put("{{analysisReport}}", MarkdownUtils.convertToHtmlForEmail(rawReport));
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
}
