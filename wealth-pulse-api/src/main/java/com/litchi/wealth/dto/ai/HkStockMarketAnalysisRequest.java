package com.litchi.wealth.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 港股市场分析请求 DTO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 港股市场分析请求参数
 * @date 2026/3/8
 */
@Data
@Schema(description = "港股市场分析请求")
public class HkStockMarketAnalysisRequest {

    @Schema(description = "LLM 供应商：doubao/openai/qwen 等", example = "doubao")
    private String provider;

    @Schema(description = "模型名称", example = "gpt-4o-mini")
    private String model;
}
