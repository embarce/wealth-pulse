package com.litchi.wealth.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * @author Embrace
 * @version 1.0
 * @description: GenerationsDto
 * @date 2025/11/6 23:07
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "GenerationsDto对象", description = "GenerationsDto对象")
public class GenerationsDto {

    @Schema(name = "fileIds", description = "文件id列表")
    private List<String> fileIds;


    @NotBlank(message = "提示词不能为空")
    @Schema(name = "prompt", description = "提示词")
    private String prompt;


    @NotBlank(message = "图片尺寸不能为空")
    @Schema(name = "size", description = "图片尺寸2048x2048 2304x1728 1728x2304")
    private String size;



    @Schema(name = "n", description = "生成图片数量")
    private int n;



    @NotBlank(message = "配置id不能为空")
    @Schema(name = "configId", description = "配置id")
    private String configId;
}
