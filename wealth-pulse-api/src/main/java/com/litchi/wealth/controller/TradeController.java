package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.service.UserService;
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
 * @description: 提供交易相关的REST API接口
 * @date 2025/10/21 23:10
 */
@RestController
@RequestMapping("/trade")
@Tag(name = "交易管理", description = "提供交易相关的 API接口")
public class TradeController {


    //交易记录
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
                            schema = @Schema(implementation = Result.class),
                            examples = @ExampleObject(
                                    name = "成功示例",
                                    value = """
                                            {
                                              "code": 200,
                                              "msg": "操作成功",
                                              "data": {
                                                "nickName": "张三",
                                                "email": "zhangsan@example.com",
                                                "avatar": "https://example.com/avatar.jpg"
                                              }
                                            }
                                            """
                            )
                    )
            )
    })
    @GetMapping("/record")
    public Result record() {
        return Result.success();
    }

    //本金流水
    @Operation(
            summary = "本金记录",
            description = "获取当前用户的本金记录",
            method = "GET",
            tags = {"交易管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取当前用户的本金记录",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class),
                            examples = @ExampleObject(
                                    name = "成功示例",
                                    value = """
                                            {
                                              "code": 200,
                                              "msg": "操作成功",
                                              "data": {
                                                "nickName": "张三",
                                                "email": "zhangsan@example.com",
                                                "avatar": "https://example.com/avatar.jpg"
                                              }
                                            }
                                            """
                            )
                    )
            )
    })
    @GetMapping("/capital/record")
    public Result capitalRecord() {
        return Result.success();
    }
}
