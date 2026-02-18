package com.litchi.wealth.dto.rpc;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author Embrace
 * @version 1.0
 * @description: CreateAccessTokenDto
 * @date 2026/2/18 10:26
 */
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
public class CreateAccessTokenDto {

    @JsonAlias("client_id")
    private String client_id;

    @JsonAlias("client_secret")
    private String client_secret;
}
