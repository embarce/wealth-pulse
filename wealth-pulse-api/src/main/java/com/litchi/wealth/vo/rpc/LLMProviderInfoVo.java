package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * LLM 供应商信息 VO
 *
 * @author Embrace
 * @date 2026-03-01
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "LLM 供应商信息")
public class LLMProviderInfoVo {

    /**
     * 供应商名称
     */
    @Schema(description = "供应商名称")
    private String name;

    /**
     * 默认模型
     */
    @Schema(description = "默认模型")
    private String model;

    /**
     * 支持的模型列表
     */
    @Schema(description = "支持的模型列表")
    private List<String> models;

    /**
     * 是否可用
     */
    @Schema(description = "是否可用")
    private Boolean available;

    /**
     * API 地址
     */
    @Schema(description = "API 地址")
    private String baseUrl;
}
