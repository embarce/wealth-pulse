package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * @author Embrace
 * @version 1.0
 * @description: ImageEditHistoryVo - 图片编辑历史返回对象
 * @date 2025/12/18
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "ImageEditHistoryVo对象", description = "图片编辑历史返回对象")
public class GenerationsHistoryVo {

    @Schema(name = "jobId", description = "任务ID")
    private String jobId;

    @Schema(name = "coverImage", description = "封面图")
    private FileResultVo coverImage;

    @Schema(name = "jobTime", description = "任务创建时间")
    private Date jobTime;

    @Schema(name = "status", description = "任务状态")
    private String status;
}
