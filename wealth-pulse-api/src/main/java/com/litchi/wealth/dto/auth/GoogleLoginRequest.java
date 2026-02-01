package com.litchi.wealth.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * @author Embrace
 * @Classname GoogleLoginRequest
 * @Description GoogleLoginRequest
 * @Date 2024/9/1 23:39
 * @git: https://github.com/embarce
 */
@Data
@Schema(name = "GoogleLoginRequest", description = "谷歌登录实体")
public class GoogleLoginRequest {

    @JsonProperty("authorizationCode")
    @Schema(name = "authorizationCode", description = "鉴权码", requiredMode = REQUIRED)
    @NotBlank(message = "鉴权码不能为空")
    private String authorizationCode;
}
