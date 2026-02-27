package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 港股公司信息视图对象（新浪财经）
 *
 * @author Embrace
 * @date 2026-02-27
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股公司信息（新浪财经）")
public class HkStockCompanyInfoSinaVo {

    @Schema(description = "证券代码")
    private String securityCode;

    @Schema(description = "公司名称(中文)")
    private String companyNameCn;

    @Schema(description = "公司名称(英文)")
    private String companyNameEn;

    @Schema(description = "公司业务")
    private String businessDescription;

    @Schema(description = "所属行业")
    private String industry;

    @Schema(description = "港股股份数目")
    private String totalShares;

    @Schema(description = "主席")
    private String chairman;

    @Schema(description = "主要持股人")
    private String majorShareholders;

    @Schema(description = "董事")
    private String directors;

    @Schema(description = "公司秘书")
    private String companySecretary;

    @Schema(description = "注册办事处")
    private String registeredOffice;

    @Schema(description = "公司总部")
    private String headquarters;

    @Schema(description = "股份过户登记处")
    private String shareRegistrar;

    @Schema(description = "核数师")
    private String auditor;

    @Schema(description = "主要往来银行")
    private String mainBank;

    @Schema(description = "法律顾问")
    private String legalAdvisor;

    @Schema(description = "公司网址")
    private String website;

    @Schema(description = "电邮地址")
    private String email;

    @Schema(description = "电话号码")
    private String phone;

    @Schema(description = "传真号码")
    private String fax;

    @Schema(description = "数据来源")
    private String datasource;
}
