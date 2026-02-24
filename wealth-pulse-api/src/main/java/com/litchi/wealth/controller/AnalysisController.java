package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.dto.ai.KlineAnalysisRequest;
import com.litchi.wealth.service.ai.AnalysisService;
import com.litchi.wealth.vo.ai.KlineAnalysisVo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * AI分析控制器
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供AI股票分析相关的REST API接口
 * @date 2026/2/24
 */
@Slf4j
@RestController
@RequestMapping("/ai")
@Tag(name = "AI分析管理", description = "提供AI股票分析的 API接口")
public class AnalysisController {

    @Resource
    private AnalysisService analysisService;

    @Operation(
            summary = "分析K线数据",
            description = "发送K线数据到AI模型，返回关键技术点位分析（支撑位、压力位、止损位、止盈位等）",
            method = "POST",
            tags = {"AI分析管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "分析成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = KlineAnalysisVo.class)
                    )
            )
    })
    @PostMapping("/analyze-kline")
    public Result analyzeKline(
            @Parameter(description = "K线分析请求参数", required = true)
            @Valid @RequestBody KlineAnalysisRequest request) {

        log.info("收到K线分析请求: 股票代码={}, K线数据量={}",
                request.getStockCode(),
                request.getKlineData() != null ? request.getKlineData().size() : 0);

        try {
            KlineAnalysisVo result = analysisService.analyzeKline(request);
            log.info("K线分析完成: 股票代码={}, 趋势={}, 建议={}",
                    result.getStockCode(),
                    result.getTrend(),
                    result.getRecommendation());
            return Result.success(result);
        } catch (Exception e) {
            log.error("K线分析失败: 股票代码={}", request.getStockCode(), e);
            return Result.error("K线分析失败: " + e.getMessage());
        }
    }

    @Operation(
            summary = "清除分析缓存",
            description = "清除指定股票的AI分析缓存，下次请求将重新计算",
            method = "DELETE",
            tags = {"AI分析管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "清除成功"
            )
    })
    @DeleteMapping("/cache/{stockCode}")
    public Result clearAnalysisCache(
            @Parameter(description = "股票代码", example = "03900.HK", required = true)
            @PathVariable String stockCode,

            @Parameter(description = "分析周期", example = "daily")
            @RequestParam(defaultValue = "daily") String period) {

        boolean cleared = analysisService.clearCache(stockCode, period);
        if (cleared) {
            return Result.success("缓存清除成功");
        } else {
            return Result.success("缓存不存在或已过期");
        }
    }
}
