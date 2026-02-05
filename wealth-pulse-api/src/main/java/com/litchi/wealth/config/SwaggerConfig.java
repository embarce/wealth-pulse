package com.litchi.wealth.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * @author Embrace
 * @Classname SwaggerConfig
 * @Description SwaggerConfig
 * @Date 2023/11/2 22:57
 * @git: https://github.com/embarce
 */
@Configuration
public class SwaggerConfig {

    /**
     * 设置Swagger文档
     */
    @Bean
    public OpenAPI springOpenAPI() {
        return new OpenAPI()
                .info(new Info().title("荔影财富脉搏API文档")
                        .description("荔影财富脉搏项目整体API网关文档")
                        .version("v1")
                        .license(new License().name("Apache 2.0").url("http://springdoc.org")))
                .components(components())
                .addSecurityItem(securityRequirement())
                .externalDocs(new ExternalDocumentation()
                        .description("github")
                        .url("https://springshop.wiki.github.org/docs"));
    }

    private SecurityRequirement securityRequirement() {
        return new SecurityRequirement()
                .addList("Bearer Authorization");
    }

    /**
     * 添加认证信息
     *
     * @return
     */
    private Components components() {
        return new Components()
                .addSecuritySchemes("Bearer Authorization",
                        new SecurityScheme()
                                .name("Bearer 认证")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .in(SecurityScheme.In.HEADER)
                );

    }
}
