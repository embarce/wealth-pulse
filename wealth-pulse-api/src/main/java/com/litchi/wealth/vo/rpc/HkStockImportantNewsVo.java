package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 港股要闻 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: 新浪港股要闻
 * @date 2026/3/8
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股要闻")
public class HkStockImportantNewsVo {

    @Schema(description = "新闻标题")
    private String title;

    @Schema(description = "新闻链接")
    private String url;

    @Schema(description = "数据来源", example = "新浪财经")
    private String datasource;
}
