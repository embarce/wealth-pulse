package com.litchi.wealth.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 券商截图识别请求 DTO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 券商截图识别请求参数
 * @date 2026/3/10
 */
@Data
@Schema(description = "券商截图识别请求")
public class BrokerScreenshotRequest {

    @NotBlank(message = "图片数据不能为空")
    @Schema(description = "Base64 编码的图片数据（不含前缀）", required = true)
    private String imageBase64;

    @Schema(description = "LLM 供应商", example = "doubao")
    private String provider;

    @Schema(description = "模型名称", example = "ep-xxx")
    private String model;
}
