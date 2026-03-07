package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 港股公司公告视图对象（新浪财经）
 *
 * @author Embrace
 * @date 2026-03-07
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股公司公告")
public class HkStockCompanyNoticeVo {

    @Schema(description = "公告标题")
    private String title;

    @Schema(description = "公告链接")
    private String url;

    @Schema(description = "数据来源")
    private String datasource;

    @Schema(description = "发布时间")
    private String publishTime;
}
