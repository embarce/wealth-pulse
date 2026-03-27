package com.litchi.wealth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.*;

import java.io.Serializable;

/**
 * @author Embrace
 * @description 用户配置表
 * @git: https://github.com/embarce
 * @date 2026-03-10
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tb_user_config")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 用户 ID（主键，与 tb_user 关联）
     */
    @TableId(value = "user_id", type = IdType.INPUT)
    private String userId;

    /**
     * 邮箱地址
     */
    @TableField("email")
    private String email;

    /**
     * 是否启用邮件通知
     */
    @TableField("email_enabled")
    private Boolean emailEnabled;

    /**
     * 飞书 webhook 地址
     */
    @TableField("feishu_webhook")
    private String feishuWebhook;

    /**
     * 是否启用飞书通知
     */
    @TableField("feishu_enabled")
    private Boolean feishuEnabled;

    /**
     * 是否通知复盘审计完成
     */
    @TableField("notify_review_complete")
    private Boolean notifyReviewComplete;

    /**
     * 是否通知视觉识图就绪
     */
    @TableField("notify_vision_ready")
    private Boolean notifyVisionReady;

    /**
     * 是否通知异动行情
     */
    @TableField("notify_market_alert")
    private Boolean notifyMarketAlert;

    /**
     * 是否通知仓位风险
     */
    @TableField("notify_portfolio_risk")
    private Boolean notifyPortfolioRisk;

    /**
     * LLM 供应商
     */
    @TableField("llm_provider")
    private String llmProvider;

    /**
     * LLM 模型
     */
    @TableField("llm_model")
    private String llmModel;

}
