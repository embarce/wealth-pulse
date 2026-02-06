package com.litchi.wealth.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.litchi.wealth.constant.Result;
import com.litchi.wealth.dto.capital.CapitalOperationRequest;
import com.litchi.wealth.qo.TradePageQo;
import com.litchi.wealth.service.UserCapitalFlowService;
import com.litchi.wealth.utils.SecurityUtils;
import com.litchi.wealth.utils.ToPageUtils;
import com.litchi.wealth.vo.CapitalFlowVo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 本金管理控制器
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供本金相关的REST API接口
 * @date 2026/2/6 23:30
 */
@RestController
@RequestMapping("/capital")
@Tag(name = "本金管理", description = "提供本金操作和查询相关的API接口")
public class CapitalController {

    @Autowired
    private UserCapitalFlowService userCapitalFlowService;

    @Operation(
            summary = "本金记录",
            description = "获取当前用户的本金记录",
            method = "GET",
            tags = {"本金管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取当前用户的本金记录",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = CapitalFlowVo.class)
                    )
            )
    })
    @GetMapping("/record")
    public Result record(@Parameter TradePageQo tradePageQo) {
        String userId = SecurityUtils.getUserId();
        IPage<CapitalFlowVo> pageResult = userCapitalFlowService.getCapitalFlowPage(userId, tradePageQo);
        ToPageUtils page = new ToPageUtils(pageResult);
        return Result.success(page);
    }

    @Operation(
            summary = "资金入金",
            description = "向账户注入资金",
            method = "POST",
            tags = {"本金管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "入金成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class)
                    )
            )
    })
    @PostMapping("/deposit")
    public Result deposit(@Valid @RequestBody CapitalOperationRequest request) {
        String userId = SecurityUtils.getUserId();
        userCapitalFlowService.deposit(userId, request);
        return Result.success();
    }

    @Operation(
            summary = "提取本金",
            description = "从账户提取本金",
            method = "POST",
            tags = {"本金管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "提取成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class)
                    )
            )
    })
    @PostMapping("/withdraw")
    public Result withdraw(@Valid @RequestBody CapitalOperationRequest request) {
        String userId = SecurityUtils.getUserId();
        userCapitalFlowService.withdraw(userId, request);
        return Result.success();
    }
}
