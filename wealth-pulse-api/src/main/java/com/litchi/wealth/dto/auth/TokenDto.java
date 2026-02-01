package com.litchi.wealth.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * @author Embrace
 * @version 1.0
 * @description: TokenDto
 * @date 2025/9/12 22:00
 */
@Data
@Schema(name = "TokenDto", description = "登录返回")
public class TokenDto {

    @JsonProperty("accessToken")
    @Schema(name = "accessToken", description = "accessToken")
    private String accessToken;
}
