package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.dto.trade.FeeCalculationRequest;
import com.litchi.wealth.service.StockService;
import com.litchi.wealth.vo.FeeCalculationVo;
import com.litchi.wealth.vo.StockHistoryVo;
import com.litchi.wealth.vo.StockInfoVo;
import com.litchi.wealth.vo.StockMarketDataVo;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;

/**
 * 股票信息控制器
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供股票信息相关的REST API接口
 * @date 2026/2/12
 */
@Slf4j
@RestController
@RequestMapping("/stock")
@Tag(name = "股票信息管理", description = "提供股票信息查询的 API接口")
public class StockController {

    @Resource
    private StockService stockService;

    @Operation(
            summary = "获取热榜股票",
            description = "获取当日热门股票列表（按成交额排序）",
            method = "GET",
            tags = {"股票信息管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取成功",
                    content = @Content(
                            mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = StockMarketDataVo.class))
                    )
            )
    })
    @GetMapping("/hot")
    public Result getHotStocks(
            @Parameter(description = "返回数量限制", example = "20")
            @RequestParam(defaultValue = "20") Integer limit) {

        List<StockMarketDataVo> resultList = stockService.getHotStocks(limit);
        return Result.success(resultList);
    }

    @Operation(
            summary = "获取股票实时行情",
            description = "通过股票代码获取实时行情数据",
            method = "GET",
            tags = {"股票信息管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = StockMarketDataVo.class)
                    )
            )
    })
    @GetMapping("/market-data/{stockCode}")
    public Result getMarketData(
            @Parameter(description = "股票代码", example = "NVDA.US", required = true)
            @PathVariable String stockCode) {

        StockMarketDataVo result = stockService.getMarketData(stockCode);
        if (result == null) {
            return Result.error("未找到股票 " + stockCode + " 的行情数据");
        }
        return Result.success(result);
    }

    @Operation(
            summary = "获取股票基本信息",
            description = "通过股票代码获取公司基本信息",
            method = "GET",
            tags = {"股票信息管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = StockInfoVo.class)
                    )
            )
    })
    @GetMapping("/info/{stockCode}")
    public Result getStockInfo(
            @Parameter(description = "股票代码", example = "NVDA.US", required = true)
            @PathVariable String stockCode) {

        StockInfoVo result = stockService.getStockInfo(stockCode);
        if (result == null) {
            return Result.error("未找到股票 " + stockCode + " 的基本信息");
        }
        return Result.success(result);
    }

    @Operation(
            summary = "获取股票历史数据",
            description = "通过股票代码获取历史行情数据",
            method = "GET",
            tags = {"股票信息管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取成功",
                    content = @Content(
                            mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = StockHistoryVo.class))
                    )
            )
    })
    @GetMapping("/history/{stockCode}")
    public Result getStockHistory(
            @Parameter(description = "股票代码", example = "NVDA.US", required = true)
            @PathVariable String stockCode,

            @Parameter(description = "开始日期", example = "2026-01-01")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,

            @Parameter(description = "结束日期", example = "2026-02-12")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate,

            @Parameter(description = "返回数量限制", example = "30")
            @RequestParam(defaultValue = "30") Integer limit) {

        List<StockHistoryVo> resultList = stockService.getStockHistory(stockCode, startDate, endDate, limit);
        return Result.success(resultList);
    }

    @Operation(
            summary = "计算手续费",
            description = "根据交易金额和指令计算手续费",
            method = "POST",
            tags = {"股票信息管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "计算成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = FeeCalculationVo.class)
                    )
            )
    })
    @PostMapping("/calculate-fee")
    public Result calculateFee(@Valid @RequestBody FeeCalculationRequest request) {
        FeeCalculationVo result = stockService.calculateFee(request);
        return Result.success(result);
    }
}
