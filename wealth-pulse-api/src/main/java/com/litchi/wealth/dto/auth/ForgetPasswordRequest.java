package com.litchi.wealth.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * @author Embrace
 * @version 1.0
 * @description: ForgetPasswordRequest
 * @date 2025/10/21 22:25
 */
@Data
@Schema(name = "ForgetPasswordRequest", description = "忘记密码")
public class ForgetPasswordRequest {
    @JsonProperty("email")
    @Schema(name = "email", description = "邮箱", requiredMode = REQUIRED)
    @NotBlank(message = "邮箱不能为空")
    private String email;


    @JsonProperty("code")
    @Schema(name = "code", description = "验证码", requiredMode = REQUIRED)
    private String code;

    @JsonProperty("password")
    @Schema(name = "password", description = "密码", requiredMode = REQUIRED)
    @NotBlank(message = "密码不能为空")
    private String password;


    @JsonProperty("token")
    @Schema(name = "token", description = "人机验证token", requiredMode = REQUIRED)
    @NotBlank(message = "token不能为空")
    private String token;

}
