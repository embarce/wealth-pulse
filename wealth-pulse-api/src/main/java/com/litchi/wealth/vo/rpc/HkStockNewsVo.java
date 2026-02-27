package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 港股新闻视图对象（新浪财经）
 *
 * @author Embrace
 * @date 2026-02-27
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股新闻")
public class HkStockNewsVo {

    @Schema(description = "新闻标题")
    private String title;

    @Schema(description = "新闻链接")
    private String url;

    @Schema(description = "数据来源")
    private String datasource;

    @Schema(description = "发布时间")
    private String publishTime;
}
