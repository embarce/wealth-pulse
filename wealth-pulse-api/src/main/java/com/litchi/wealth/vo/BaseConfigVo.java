package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author Embrace
 * @version 1.0
 * @description: BaseConfigVo
 * @date 2025/12/18 22:45
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(name = "BaseConfigVo", description = "模型配置视图")
public class BaseConfigVo {


    @Schema(name = "id", description = "主键ID")
    private String id;

    @Schema(name = "name", description = "AI配置名称")
    private String name;
}
