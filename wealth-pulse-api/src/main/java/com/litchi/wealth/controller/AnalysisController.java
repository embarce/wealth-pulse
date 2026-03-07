package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.dto.ai.KlineAnalysisRequest;
import com.litchi.wealth.dto.rpc.PositionAnalysisRequestDto;
import com.litchi.wealth.dto.rpc.StockAnalysisRequestDto;
import com.litchi.wealth.service.ai.AnalysisService;
import com.litchi.wealth.vo.ai.KlineAnalysisVo;
import com.litchi.wealth.vo.ai.PositionAnalysisVo;
import com.litchi.wealth.vo.ai.StockAnalysisVo;
import com.litchi.wealth.vo.rpc.LLMProviderInfoVo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AI 分析控制器
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供 AI 股票分析相关的 REST API 接口
 * @date 2026/2/24
 */
@Slf4j
@RestController
@RequestMapping("/ai")
@Tag(name = "AI 分析管理", description = "提供 AI 股票分析的 API 接口")
public class AnalysisController {

    @Resource
    private AnalysisService analysisService;

    @Operation(
            summary = "分析 K 线数据",
            description = "发送 K 线数据到 AI 模型，返回关键技术点位分析（支撑位、压力位、止损位、止盈位等）",
            method = "POST",
            tags = {"AI 分析管理"}
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
            @Parameter(description = "K 线分析请求参数", required = true)
            @Valid @RequestBody KlineAnalysisRequest request) {

        log.info("收到 K 线分析请求：股票代码={}, K 线数据量={}",
                request.getStockCode(),
                request.getKlineData() != null ? request.getKlineData().size() : 0);

        try {
            KlineAnalysisVo result = analysisService.analyzeKline(request);
            log.info("K 线分析完成：股票代码={}, 趋势={}, 建议={}",
                    result.getStockCode(),
                    result.getTrend(),
                    result.getRecommendation());
            return Result.success(result);
        } catch (Exception e) {
            log.error("K 线分析失败：股票代码={}", request.getStockCode(), e);
            return Result.error("K 线分析失败：" + e.getMessage());
        }
    }

    @Operation(
            summary = "获取 LLM 供应商列表",
            description = "获取所有支持的 LLM 供应商信息（包括名称、默认模型、是否可用等）",
            method = "GET",
            tags = {"AI 分析管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取成功",
                    content = @Content(
                            mediaType = "application/json",
                            array = @ArraySchema(
                                    schema = @Schema(implementation = LLMProviderInfoVo.class)
                            )
                    )
            )
    })
    @GetMapping("/providers")
    public Result listProviders() {
        try {
            List<LLMProviderInfoVo> providers = analysisService.listProviders();
            return Result.success(providers);
        } catch (Exception e) {
            log.error("获取 LLM 供应商列表失败", e);
            return Result.error("获取 LLM 供应商列表失败：" + e.getMessage());
        }
    }

    @Operation(
            summary = "获取可用的 LLM 供应商",
            description = "获取已配置 API Key 的可用 LLM 供应商名称列表",
            method = "GET",
            tags = {"AI 分析管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取成功"
            )
    })
    @GetMapping("/available-providers")
    public Result listAvailableProviders() {
        try {
            List<String> providers = analysisService.listAvailableProviders();
            return Result.success(providers);
        } catch (Exception e) {
            log.error("获取可用的 LLM 供应商失败", e);
            return Result.error("获取可用的 LLM 供应商失败：" + e.getMessage());
        }
    }

    @Operation(
            summary = "AI 分析股票",
            description = "AI 分析股票（整合公司信息、K 线数据、新闻、财务指标、公告等信息进行综合分析）",
            method = "POST",
            tags = {"AI 分析管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "分析成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = StockAnalysisVo.class)
                    )
            )
    })
    @PostMapping("/analyze-stock")
    public Result analyzeStock(
            @Parameter(description = "股票分析请求参数", required = true)
            @Valid @RequestBody StockAnalysisRequestDto request) {

        log.info("收到股票分析请求：股票代码={}, 周期={}, 天数={}",
                request.getStockCode(), request.getPeriod(), request.getDays());

        try {
            StockAnalysisVo result = analysisService.analyzeStock(request);
            log.info("股票分析完成：股票代码={}, 趋势={}, 建议={}, 评级={}",
                    result.getStockCode(), result.getTrend(), result.getRecommendation(), result.getRating());
            return Result.success(result);
        } catch (Exception e) {
            log.error("股票分析失败：股票代码={}", request.getStockCode(), e);
            return Result.error("股票分析失败：" + e.getMessage());
        }
    }

    @Operation(
            summary = "AI 分析持仓",
            description = "AI 分析持仓（对多只股票的持仓组合进行综合分析，给出评分和建议）",
            method = "POST",
            tags = {"AI 分析管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "分析成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = PositionAnalysisVo.class)
                    )
            )
    })
    @PostMapping("/analyze-position")
    public Result analyzePosition(
            @Parameter(description = "持仓分析请求参数", required = true)
            @Valid @RequestBody PositionAnalysisRequestDto request) {

        log.info("收到持仓分析请求：持仓数量={}, 分析深度={}",
                request.getPositions() != null ? request.getPositions().size() : 0,
                request.getAnalysisDepth());

        try {
            PositionAnalysisVo result = analysisService.analyzePosition(request);
            log.info("持仓分析完成：持仓数量={}, 综合评分={}, 综合评级={}",
                    request.getPositions() != null ? request.getPositions().size() : 0,
                    result.getPortfolioSummary() != null ? result.getPortfolioSummary().getOverallScore() : null,
                    result.getPortfolioSummary() != null ? result.getPortfolioSummary().getOverallRating() : null);
            return Result.success(result);
        } catch (Exception e) {
            log.error("持仓分析失败", e);
            return Result.error("持仓分析失败：" + e.getMessage());
        }
    }
}
