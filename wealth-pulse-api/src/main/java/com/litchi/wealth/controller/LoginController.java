package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.dto.auth.PasswordLoginRequest;
import com.litchi.wealth.dto.auth.TokenDto;
import com.litchi.wealth.service.auth.PasswordLoginService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Embrace
 * @version 1.0
 * @description: LoginController
 * @date 2025/9/12 21:47
 */
@RestController
@RequestMapping("/auth")
@Tag(name = "用户认证接口", description = "用户登录、注册、密码管理等认证相关接口")
@Slf4j
public class LoginController {

    @Autowired
    private PasswordLoginService passwordLoginService;


    @Operation(
            summary = "密码登录",
            description = "使用用户邮箱和密码进行登录认证，返回JWT访问令牌。支持邮箱和密码的验证。"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "登录成功，返回访问令牌",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "请求参数错误，邮箱或密码为空"),
            @ApiResponse(responseCode = "401", description = "邮箱或密码错误"),
            @ApiResponse(responseCode = "403", description = "用户账号被禁用"),
            @ApiResponse(responseCode = "500", description = "服务器内部异常"),
            @ApiResponse(responseCode = "998", description = "接口限流熔断，请稍后重试")
    })
    @PostMapping(value = "/v1/password/login")
    public Result passwordLogin(@Validated @RequestBody PasswordLoginRequest passwordLoginRequest) {
        TokenDto tokenDto = passwordLoginService.passwordLogin(passwordLoginRequest);
        return Result.success(tokenDto);
    }
}
