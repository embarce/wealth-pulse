package com.litchi.wealth.vo;

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
 * @description: GenerationsResultVo
 * @date 2025/11/6 23:07
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "GenerationsResultVo对象", description = "GenerationsResultVo对象")
public class GenerationsResultVo {

    @Schema(name = "jobId", description = "jobId")
    private String jobId;

    @Schema(name = "inputFiles", description = "输入文件")
    private List<FileResultVo> inputFiles;

    @Schema(name = "prompt", description = "提示词")
    private String prompt;


    @Schema(name = "size", description = "图片尺寸2048x2048 2304x1728 1728x2304")
    private String size;


    @Schema(name = "n", description = "生成图片数量")
    private int n;


    @NotBlank(message = "配置id不能为空")
    @Schema(name = "configId", description = "配置id")
    private String configId;


    @Schema(name = "outputFiles", description = "输出文件")
    private List<FileResultVo> outputFiles;


    @Schema(name = "status", description = "状态")
    private String status;


    @Schema(name = "errorMsg", description = "错误信息")
    private String errorMsg;
}
