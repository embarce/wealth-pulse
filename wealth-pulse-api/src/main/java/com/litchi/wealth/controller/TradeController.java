package com.litchi.wealth.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.litchi.wealth.constant.Result;
import com.litchi.wealth.dto.trade.StockTradeRequest;
import com.litchi.wealth.entity.UserAssetSummary;
import com.litchi.wealth.qo.TradePageQo;
import com.litchi.wealth.service.StockTransactionLogService;
import com.litchi.wealth.service.UserAssetSummaryService;
import com.litchi.wealth.utils.SecurityUtils;
import com.litchi.wealth.utils.ToPageUtils;
import com.litchi.wealth.vo.TradeRecordVo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

/**
 * 用户管理控制器
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供交易相关的REST API接口
 * @date 2025/10/21 23:10
 */
@RestController
@RequestMapping("/trade")
@Tag(name = "交易管理", description = "提供交易相关的 API接口")
public class TradeController {

    @Autowired
    private StockTransactionLogService stockTransactionLogService;

    @Autowired
    private UserAssetSummaryService userAssetSummaryService;


    @Operation(
            summary = "交易记录",
            description = "获取当前用户的交易记录",
            method = "GET",
            tags = {"交易管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取当前用户的交易记录",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = TradeRecordVo.class)
                    )
            )
    })
    @GetMapping("/record")
    public Result record(@Parameter TradePageQo tradePageQo) {
        String userId = SecurityUtils.getUserId();
        IPage<TradeRecordVo> pageResult = stockTransactionLogService.getTradeRecordPage(userId, tradePageQo);
        ToPageUtils page = new ToPageUtils(pageResult);
        return Result.success(page);
    }

    @Operation(
            summary = "买入股票",
            description = "买入股票",
            method = "POST",
            tags = {"交易管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "买入成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class)
                    )
            )
    })
    @PostMapping("/buy")
    public Result buyStock(@Valid @RequestBody StockTradeRequest request) {
        String userId = SecurityUtils.getUserId();
        stockTransactionLogService.buyStock(userId, request);
        return Result.success();
    }

    @Operation(
            summary = "卖出股票",
            description = "卖出股票",
            method = "POST",
            tags = {"交易管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "卖出成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class)
                    )
            )
    })
    @PostMapping("/sell")
    public Result sellStock(@Valid @RequestBody StockTradeRequest request) {
        String userId = SecurityUtils.getUserId();
        stockTransactionLogService.sellStock(userId, request);
        return Result.success();
    }

    @Operation(
            summary = "获取购买力",
            description = "获取用户当前购买力（支持T+0交易）",
            method = "GET",
            tags = {"交易管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取成功",
                    content = @Content(
                            mediaType = "application/json"
                    )
            )
    })
    @GetMapping("/purchasing-power")
    public Result getPurchasingPower() {
        String userId = SecurityUtils.getUserId();
        LambdaQueryWrapper<UserAssetSummary> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserAssetSummary::getUserId, userId);
        UserAssetSummary assetSummary = userAssetSummaryService.getOne(queryWrapper);

        if (assetSummary == null) {
            return Result.success(BigDecimal.ZERO);
        }

        return Result.success(assetSummary.getPurchasingPower());
    }

    @Operation(
            summary = "结算当日交易",
            description = "将当日未结算的交易标记为已结算（通常由系统自动执行）",
            method = "POST",
            tags = {"交易管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "结算成功",
                    content = @Content(
                            mediaType = "application/json"
                    )
            )
    })
    @PostMapping("/settle")
    public Result settleTransactions() {
        String userId = SecurityUtils.getUserId();
        int settledCount = stockTransactionLogService.settleTransactions(userId);
        return Result.success("已结算 " + settledCount + " 笔交易");
    }
}
