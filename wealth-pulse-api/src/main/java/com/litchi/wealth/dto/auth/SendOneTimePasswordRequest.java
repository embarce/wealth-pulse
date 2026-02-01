package com.litchi.wealth.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * @author Embrace
 * @Classname SendOneTimePasswordRequest
 * @Description SendOneTimePasswordRequest
 * @Date 2025/10/19 23:39
 * @git: https://github.com/embarce
 */
@Data
@Schema(name = "SendOneTimePasswordRequest", description = "发送一次性代码")
public class SendOneTimePasswordRequest {

    @JsonProperty("email")
    @Schema(name = "email", description = "邮箱", requiredMode = REQUIRED)
    @NotBlank(message = "邮箱不能为空")
    private String email;

    @JsonProperty("token")
    @Schema(name = "token", description = "token", requiredMode = REQUIRED)
    @NotBlank(message = "人机验证不能为空")
    private String token;
}
