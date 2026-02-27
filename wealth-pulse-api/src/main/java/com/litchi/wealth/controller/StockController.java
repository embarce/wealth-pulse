package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.dto.trade.FeeCalculationRequest;
import com.litchi.wealth.rpc.PythonStockRpc;
import com.litchi.wealth.service.StockService;
import com.litchi.wealth.vo.FeeCalculationVo;
import com.litchi.wealth.vo.StockHistoryVo;
import com.litchi.wealth.vo.StockInfoVo;
import com.litchi.wealth.vo.StockMarketDataVo;
import com.litchi.wealth.vo.StockSearchResultVo;
import com.litchi.wealth.vo.rpc.HkStockCompanyInfoSinaVo;
import com.litchi.wealth.vo.rpc.HkStockCompanyProfileVo;
import com.litchi.wealth.vo.rpc.HkStockEnhancedHistoryVo;
import com.litchi.wealth.vo.rpc.HkStockFinancialIndicatorVo;
import com.litchi.wealth.vo.rpc.HkStockFinancialIndicatorsSinaVo;
import com.litchi.wealth.vo.rpc.HkStockMinuteHistoryVo;
import com.litchi.wealth.vo.rpc.HkStockNewsVo;
import com.litchi.wealth.vo.rpc.HkStockSecurityProfileVo;
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

import java.time.LocalDate;
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

    @Resource
    private PythonStockRpc pythonStockRpc;

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
            summary = "搜索股票",
            description = "根据关键词模糊搜索股票（支持股票代码、公司名称、公司简称），返回股票信息和实时价格",
            method = "GET",
            tags = {"股票信息管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "搜索成功",
                    content = @Content(
                            mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = StockSearchResultVo.class))
                    )
            )
    })
    @GetMapping("/search")
    public Result searchStocks(
            @Parameter(description = "搜索关键词（股票代码/公司名称/公司简称）", example = "NVDA", required = true)
            @RequestParam String key) {
        List<StockSearchResultVo> resultList = stockService.searchStocks(key);
        return Result.success(resultList);
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

    // ==================== Python RPC API ====================

    @GetMapping("/security-profile/{stockCode}")
    @Operation(summary = "获取港股证券资料", description = "从Python服务获取港股证券资料（上市日期、发行价、每手股数等）")
    public Result getSecurityProfile(
            @Parameter(description = "股票代码", example = "03900.HK", required = true)
            @PathVariable String stockCode) {

        HkStockSecurityProfileVo result = pythonStockRpc.getSecurityProfile(stockCode);
        return Result.success(result);
    }

    @GetMapping("/company-profile/{stockCode}")
    @Operation(summary = "获取港股公司资料", description = "从Python服务获取港股公司资料（公司信息、管理团队、联系方式等）")
    public Result getCompanyProfile(
            @Parameter(description = "股票代码", example = "03900.HK", required = true)
            @PathVariable String stockCode) {

        HkStockCompanyProfileVo result = pythonStockRpc.getCompanyProfile(stockCode);
        return Result.success(result);
    }

    @GetMapping("/financial-indicator/{stockCode}")
    @Operation(summary = "获取港股财务指标", description = "从Python服务获取港股财务指标（市盈率、市净率、ROE等）")
    public Result getFinancialIndicator(
            @Parameter(description = "股票代码", example = "03900.HK", required = true)
            @PathVariable String stockCode) {

        HkStockFinancialIndicatorVo result = pythonStockRpc.getFinancialIndicator(stockCode);
        return Result.success(result);
    }

    @GetMapping("/enhanced-history/{stockCode}")
    @Operation(summary = "获取港股增强历史数据（K线图）", description = "从Python服务获取K线图数据，支持日/周/月周期和复权类型")
    public Result getEnhancedHistory(
            @Parameter(description = "股票代码", example = "03900.HK", required = true)
            @PathVariable String stockCode,

            @Parameter(description = "周期: daily=日K, weekly=周K, monthly=月K", example = "daily")
            @RequestParam(defaultValue = "daily") String period,

            @Parameter(description = "复权: 空=不复权, qfq=前复权, hfq=后复权", example = "")
            @RequestParam(defaultValue = "") String adjust,

            @Parameter(description = "开始日期 (yyyy-MM-dd)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,

            @Parameter(description = "结束日期 (yyyy-MM-dd)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<HkStockEnhancedHistoryVo> result = pythonStockRpc.getEnhancedHistory(
                stockCode, period, adjust, startDate, endDate);
        return Result.success(result);
    }

    @GetMapping("/minute-history/{stockCode}")
    @Operation(summary = "获取港股分钟级历史数据（分时图）", description = "从Python服务获取分时图数据，支持1/5/15/30/60分钟周期")
    public Result getMinuteHistory(
            @Parameter(description = "股票代码", example = "03900.HK", required = true)
            @PathVariable String stockCode,

            @Parameter(description = "周期: 1=1分钟, 5=5分钟, 15=15分钟, 30=30分钟, 60=60分钟", example = "1")
            @RequestParam(defaultValue = "1") String period,

            @Parameter(description = "复权: 空=不复权, hfq=后复权", example = "")
            @RequestParam(defaultValue = "") String adjust,

            @Parameter(description = "开始日期时间 (yyyy-MM-dd HH:mm:ss)")
            @RequestParam(required = false) String startDate,

            @Parameter(description = "结束日期时间 (yyyy-MM-dd HH:mm:ss)")
            @RequestParam(required = false) String endDate) {

        List<HkStockMinuteHistoryVo> result = pythonStockRpc.getMinuteHistory(
                stockCode, period, adjust, startDate, endDate);
        return Result.success(result);
    }

    // ==================== 新浪财经爬虫接口 ====================

    @GetMapping("/news/{stockCode}")
    @Operation(summary = "获取港股新闻（新浪财经）", description = "从Python服务获取港股新闻（通过新浪财经爬虫）")
    public Result getStockNews(
            @Parameter(description = "股票代码", example = "0700.HK", required = true)
            @PathVariable String stockCode) {

        List<HkStockNewsVo> result = pythonStockRpc.getStockNews(stockCode);
        return Result.success(result);
    }

    @GetMapping("/company-info-sina/{stockCode}")
    @Operation(summary = "获取港股公司信息（新浪财经）", description = "从Python服务获取港股公司信息（通过新浪财经爬虫）")
    public Result getCompanyInfoSina(
            @Parameter(description = "股票代码", example = "01810.HK", required = true)
            @PathVariable String stockCode) {

        HkStockCompanyInfoSinaVo result = pythonStockRpc.getCompanyInfoSina(stockCode);
        return Result.success(result);
    }

    @GetMapping("/financial-indicators-sina/{stockCode}")
    @Operation(summary = "获取港股财务指标（新浪财经）", description = "从Python服务获取港股财务指标（通过新浪财经爬虫）")
    public Result getFinancialIndicatorsSina(
            @Parameter(description = "股票代码", example = "01810.HK", required = true)
            @PathVariable String stockCode) {

        HkStockFinancialIndicatorsSinaVo result = pythonStockRpc.getFinancialIndicatorsSina(stockCode);
        return Result.success(result);
    }
}
