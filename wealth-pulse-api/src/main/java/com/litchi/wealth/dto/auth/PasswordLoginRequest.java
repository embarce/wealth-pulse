package com.litchi.wealth.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.NOT_REQUIRED;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * @author Embrace
 * @Classname PasswordLoginRequest
 * @Description PasswordLoginRequest
 * @Date 2025/10/19 23:39
 * @git: https://github.com/embarce
 */
@Data
@Schema(name = "PasswordLoginRequest", description = "密码登录")
public class PasswordLoginRequest {

    @JsonProperty("email")
    @Schema(name = "email", description = "邮箱", requiredMode = REQUIRED)
    @NotBlank(message = "邮箱不能为空")
    private String email;

    @JsonProperty("password")
    @Schema(name = "password", description = "密码", requiredMode = REQUIRED)
    @NotBlank(message = "密码不能为空")
    private String password;


    @JsonProperty("code")
    @Schema(name = "code", description = "验证码", requiredMode = NOT_REQUIRED)
    private String code;
}
