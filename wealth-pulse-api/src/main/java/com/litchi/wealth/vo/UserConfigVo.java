package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 用户配置视图对象
 *
 * @author Embrace
 * @version 1.0
 * @description: 用于返回用户配置信息的数据传输对象
 * @date 2026-03-10
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "UserConfigVo", description = "用户配置视图对象")
public class UserConfigVo {

    @Schema(
            name = "email",
            description = "邮箱地址",
            example = "admin@pulse.ai",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED,
            format = "email"
    )
    private String email;

    @Schema(
            name = "emailEnabled",
            description = "是否启用邮件通知",
            example = "false",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private Boolean emailEnabled;

    @Schema(
            name = "feishuWebhook",
            description = "飞书 webhook 地址",
            example = "https://open.feishu.cn/...",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String feishuWebhook;

    @Schema(
            name = "feishuEnabled",
            description = "是否启用飞书通知",
            example = "false",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private Boolean feishuEnabled;

    @Schema(
            name = "notifyReviewComplete",
            description = "是否通知复盘审计完成",
            example = "true",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private Boolean notifyReviewComplete;

    @Schema(
            name = "notifyVisionReady",
            description = "是否通知视觉识图就绪",
            example = "true",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private Boolean notifyVisionReady;

    @Schema(
            name = "notifyMarketAlert",
            description = "是否通知异动行情",
            example = "false",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private Boolean notifyMarketAlert;

    @Schema(
            name = "notifyPortfolioRisk",
            description = "是否通知仓位风险",
            example = "true",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private Boolean notifyPortfolioRisk;

    @Schema(
            name = "llmProvider",
            description = "LLM 供应商",
            example = "doubao",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String llmProvider;

    @Schema(
            name = "llmModel",
            description = "LLM 模型",
            example = "doubao-1-5-pro",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String llmModel;

}
