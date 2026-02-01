package com.litchi.wealth.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * @author Embrace
 * @version 1.0
 * @description: RegisterRequestDto
 * @date 2025/10/20 20:40
 */
@Data
@Schema(name = "RegisterRequestDto", description = "注册")
public class RegisterRequest {

    /**
     * 用户昵称
     */
    @JsonProperty("nickName")
    @Schema(name = "nickName", description = "用户名", requiredMode = REQUIRED)
    @NotBlank(message = "用户名不能为空")
    private String nickName;

    /**
     * 邮箱
     */
    @JsonProperty("email")
    @Schema(name = "email", description = "邮箱", requiredMode = REQUIRED)
    @NotBlank(message = "邮箱不能为空")
    private String email;

    /**
     * 密码
     */
    @JsonProperty("password")
    @Schema(name = "password", description = "密码", requiredMode = REQUIRED)
    @NotBlank(message = "密码不能为空")
    private String password;


    /**
     * 验证码
     */
    @JsonProperty("code")
    @Schema(name = "code", description = "验证码", requiredMode = REQUIRED)
    @NotBlank(message = "验证码不能为空")
    private String code;


    /**
     * token
     */
    @JsonProperty("token")
    @Schema(name = "token", description = "token人机验证", requiredMode = REQUIRED)
    @NotBlank(message = "token不能为空")
    private String token;
}
