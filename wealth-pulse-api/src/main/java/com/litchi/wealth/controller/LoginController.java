package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.dto.auth.*;
import com.litchi.wealth.service.auth.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.litchi.wealth.constant.Constants.CLOUDFLARE_IP;

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
    private GoogleLoginService googleLoginService;

    @Autowired
    private PasswordLoginService passwordLoginService;

    @Autowired
    private OneTimePasswordService oneTimePasswordService;

    @Autowired
    private CloudflareTurnstileService cloudflareTurnstileService;

    @Autowired
    private RegisterService registerService;

    @Operation(
            summary = "Google授权登录",
            description = "使用Google授权码进行用户登录，返回JWT访问令牌。需要先通过Google OAuth2获取授权码。",
            parameters = {
                    @Parameter(
                            name = "googleLoginRequest",
                            description = "Google登录请求参数",
                            required = true,
                            schema = @Schema(implementation = GoogleLoginRequest.class)
                    )
            }
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "登录成功，返回访问令牌",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class, example = """
                                    {
                                        "code": 200,
                                        "msg": "success",
                                        "data": {
                                            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                        }
                                    }
                                    """)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "请求参数错误，授权码为空或格式错误"),
            @ApiResponse(responseCode = "401", description = "Google授权码无效或已过期"),
            @ApiResponse(responseCode = "403", description = "用户被禁止访问"),
            @ApiResponse(responseCode = "500", description = "服务器内部异常"),
            @ApiResponse(responseCode = "998", description = "接口限流熔断，请稍后重试")
    })
    @PostMapping(value = "/v1/google/login")
    public Result googleLogin(@Validated @RequestBody GoogleLoginRequest googleLoginRequest) {
        TokenDto tokenDto = googleLoginService.googleLogin(googleLoginRequest);
        return Result.success(tokenDto);
    }


    @Operation(
            summary = "密码登录",
            description = "使用用户邮箱和密码进行登录认证，返回JWT访问令牌。支持邮箱和密码的验证。",
            parameters = {
                    @Parameter(
                            name = "passwordLoginRequest",
                            description = "密码登录请求参数",
                            required = true,
                            schema = @Schema(implementation = PasswordLoginRequest.class)
                    )
            }
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "登录成功，返回访问令牌",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class, example = """
                                    {
                                        "code": 200,
                                        "msg": "success",
                                        "data": {
                                            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                        }
                                    }
                                    """)
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


    @Operation(
            summary = "发送一次性密码验证邮件",
            description = "向指定邮箱发送一次性密码（OTP）验证邮件，用于后续的邮箱验证或登录。需要通过Cloudflare Turnstile人机验证。",
            parameters = {
                    @Parameter(
                            name = "sendOneTimePasswordRequest",
                            description = "发送一次性密码请求参数",
                            required = true,
                            schema = @Schema(implementation = SendOneTimePasswordRequest.class)
                    )
            }
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "邮件发送成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class, example = """
                                    {
                                        "code": 200,
                                        "msg": "success",
                                        "data": "验证码已发送至您的邮箱，请查收"
                                    }
                                    """)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "请求参数错误，邮箱格式不正确或人机验证token为空"),
            @ApiResponse(responseCode = "403", description = "人机验证失败"),
            @ApiResponse(responseCode = "429", description = "发送频率过高，请稍后重试"),
            @ApiResponse(responseCode = "500", description = "邮件发送失败或服务器内部异常"),
            @ApiResponse(responseCode = "998", description = "接口限流熔断，请稍后重试")
    })
    @PostMapping(value = "/v1/send/oneTimePassword")
    public Result sendOneTimePassword(@Validated @RequestBody SendOneTimePasswordRequest sendOneTimePasswordRequest, HttpServletRequest request) {
        String ip = request.getHeader(CLOUDFLARE_IP);
        if (StringUtils.isBlank(ip)) {
            ip = request.getRemoteAddr();
        }
        log.info("ip: {} try to send email", ip);
        // 人机验证（Cloudflare Turnstile）
        boolean passed = cloudflareTurnstileService.verify(sendOneTimePasswordRequest.getToken());
        if (!passed) {
            return Result.error(-3, "Turnstile verification failed");
        }
        return Result.success(oneTimePasswordService.sendOneTimePassword(sendOneTimePasswordRequest.getEmail()));
    }


    @Operation(
            summary = "用户注册",
            description = "创建新的用户账号。需要提供邮箱、密码等信息，并通过Cloudflare Turnstile人机验证。",
            parameters = {
                    @Parameter(
                            name = "registerRequest",
                            description = "用户注册请求参数",
                            required = true,
                            schema = @Schema(implementation = RegisterRequest.class)
                    )
            }
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "注册成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class, example = """
                                    {
                                        "code": 200,
                                        "msg": "success",
                                        "data": null
                                    }
                                    """)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "请求参数错误，邮箱格式不正确或密码不符合要求"),
            @ApiResponse(responseCode = "403", description = "人机验证失败"),
            @ApiResponse(responseCode = "409", description = "邮箱已被注册"),
            @ApiResponse(responseCode = "500", description = "服务器内部异常"),
            @ApiResponse(responseCode = "998", description = "接口限流熔断，请稍后重试")
    })
    @PostMapping(value = "/v1/register")
    public Result register(@Validated @RequestBody RegisterRequest registerRequest) {
        boolean passed = cloudflareTurnstileService.verify(registerRequest.getToken());
        if (!passed) {
            return Result.error(-3, "Turnstile verification failed");
        }
        boolean register = registerService.register(registerRequest);
        if (!register) {
            return Result.error(-1, "Register failed");
        }
        return Result.success();
    }


    @Operation(
            summary = "忘记密码",
            description = "用户忘记密码时，通过邮箱验证来重置密码。系统会发送重置密码邮件到指定邮箱。",
            parameters = {
                    @Parameter(
                            name = "forgetPasswordRequest",
                            description = "忘记密码请求参数",
                            required = true,
                            schema = @Schema(implementation = ForgetPasswordRequest.class)
                    )
            }
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "重置密码邮件发送成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Result.class, example = """
                                    {
                                        "code": 200,
                                        "msg": "success",
                                        "data": "重置密码邮件已发送至您的邮箱"
                                    }
                                    """)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "请求参数错误，邮箱格式不正确"),
            @ApiResponse(responseCode = "403", description = "人机验证失败"),
            @ApiResponse(responseCode = "404", description = "邮箱地址未注册"),
            @ApiResponse(responseCode = "429", description = "发送频率过高，请稍后重试"),
            @ApiResponse(responseCode = "500", description = "邮件发送失败或服务器内部异常"),
            @ApiResponse(responseCode = "998", description = "接口限流熔断，请稍后重试")
    })
    @PostMapping(value = "/v1/forget/password")
    public Result forgetPassword(@Validated @RequestBody ForgetPasswordRequest forgetPasswordRequest) {
        boolean passed = cloudflareTurnstileService.verify(forgetPasswordRequest.getToken());
        if (!passed) {
            return Result.error(-3, "Turnstile verification failed");
        }
        return Result.success(passwordLoginService.forgetPassword(forgetPasswordRequest));
    }
}
