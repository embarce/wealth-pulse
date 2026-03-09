package com.litchi.wealth.service;

import com.litchi.wealth.vo.ai.HkStockMarketAnalysisVo;

import java.util.List;

/**
 * AI 分析日报邮件服务
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/3/9
 */
public interface AnalysisEmailService {

    /**
     * 发送分析日报给所有订阅用户
     *
     * @param analysis 分析报告
     * @param reportDate 报告日期
     * @return 发送结果（成功发送的邮箱数量）
     */
    int sendDailyAnalysisEmail(HkStockMarketAnalysisVo analysis, String reportDate);

    /**
     * 获取所有订阅邮件的用户列表
     *
     * @return 用户邮箱列表
     */
    List<String> getSubscribedUsers();
}
