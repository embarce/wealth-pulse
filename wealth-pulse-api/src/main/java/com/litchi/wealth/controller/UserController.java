package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.service.UserService;
import com.litchi.wealth.vo.AssetDashboardVo;
import com.litchi.wealth.vo.PositionDashboardVo;
import com.litchi.wealth.vo.UserVo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户管理控制器
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供用户信息查询和资产相关的REST API接口
 * @date 2025/10/21 23:10
 */
@RestController
@RequestMapping("/user")
@Tag(name = "用户管理", description = "提供用户信息查询和资产相关的API接口")
public class UserController {

    @Autowired
    private UserService userService;


    @Operation(
            summary = "获取当前用户信息",
            description = "获取当前登录用户的详细信息，包括用户昵称、邮箱地址和头像等基本信息",
            method = "GET",
            tags = {"用户管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "成功获取用户信息",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class)
                    )
            )
    })
    @GetMapping("/getUser")
    public Result getUser() {
        UserVo user = userService.getUserVo();
        return Result.success(user);
    }


    @Operation(
            summary = "资产总览",
            description = "获取当前用户的资产总览信息，包括总资产、可用资产、冻结资产、持仓资产等",
            method = "GET",
            tags = {"用户管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "成功获取用户信息",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class)
                    )
            )
    })
    @GetMapping("/assets/dashboard")
    public Result getAssets() {
        AssetDashboardVo dashboard = userService.getAssetDashboard();
        return Result.success(dashboard);
    }



    @Operation(
            summary = "仓位总览",
            description = "获取当前用户的仓位总览",
            method = "GET",
            tags = {"用户管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "成功获取用户信息",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class)
                    )
            )
    })
    @GetMapping("/positions/dashboard")
    public Result getPositions() {
        PositionDashboardVo dashboard = userService.getPositionDashboard();
        return Result.success(dashboard);
    }
}
