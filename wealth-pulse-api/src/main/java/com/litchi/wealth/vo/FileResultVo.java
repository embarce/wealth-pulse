package com.litchi.wealth.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author Embrace
 * @Classname UploadFileResult
 * @Description UploadFileResult
 * @Date 2024/1/30 0:16
 * @git: https://github.com/embarce
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(name = "FileResultVo", description = "上传返回视图")
public class FileResultVo {

    @JsonProperty("sourceName")
    @Schema(name = "sourceName", description = "源文件名")
    private String sourceName;

    @JsonProperty("fileName")
    @Schema(name = "fileName", description = "文件名")
    private String fileName;

    @JsonProperty("url")
    @Schema(name = "url", description = "文件地址")
    private String url;

    @JsonProperty("fileId")
    @Schema(name = "fileId", description = "文件id")
    private String fileId;
}
