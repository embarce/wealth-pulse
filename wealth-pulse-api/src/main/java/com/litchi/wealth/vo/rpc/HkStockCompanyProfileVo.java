package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 港股公司资料视图对象
 *
 * @author Embrace
 * @date 2026-02-20
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股公司资料")
public class HkStockCompanyProfileVo {

    @Schema(description = "证券代码")
    private String stockCode;

    @Schema(description = "公司名称")
    private String companyName;

    @Schema(description = "英文名称")
    private String companyNameEn;

    @Schema(description = "注册地")
    private String registrationPlace;

    @Schema(description = "公司成立日期")
    private String establishmentDate;

    @Schema(description = "所属行业")
    private String industry;

    @Schema(description = "董事长")
    private String chairman;

    @Schema(description = "公司秘书")
    private String companySecretary;

    @Schema(description = "员工人数")
    private Integer employeeCount;

    @Schema(description = "办公地址")
    private String officeAddress;

    @Schema(description = "公司网址")
    private String website;

    @Schema(description = "E-MAIL")
    private String email;

    @Schema(description = "年结日")
    private String yearEndDate;

    @Schema(description = "联系电话")
    private String phone;

    @Schema(description = "核数师")
    private String auditor;

    @Schema(description = "传真")
    private String fax;

    @Schema(description = "公司介绍")
    private String companyIntroduction;
}
