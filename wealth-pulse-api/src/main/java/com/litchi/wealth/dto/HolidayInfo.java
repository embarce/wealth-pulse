package com.litchi.wealth.dto;

import cn.hutool.json.JSONObject;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 假期信息对象
 *
 * @author Embrace
 * @date 2026-03-11
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HolidayInfo {

    /**
     * 假期日期
     */
    private String date;

    /**
     * 假期名称
     */
    private String name;

    /**
     * 市场休市信息
     */
    private String market;

    /**
     * 是否需要结算
     * true - 需要结算（非港股休市假期）
     * false - 不需要结算（港股休市假期）
     */
    private Boolean needSettle;

    /**
     * 是否为假期
     */
    private Boolean isHoliday;

    /**
     * 从 JSONObject 构建 HolidayInfo
     *
     * @param jsonObject JSON 对象
     * @param needSettle 是否需要结算
     * @return HolidayInfo 对象
     */
    public static HolidayInfo fromJson(JSONObject jsonObject, Boolean needSettle) {
        return HolidayInfo.builder()
                .date(jsonObject.getStr("date"))
                .name(jsonObject.getStr("name"))
                .market(jsonObject.getStr("market"))
                .needSettle(needSettle)
                .isHoliday(true)
                .build();
    }

    /**
     * 创建非假期的 HolidayInfo
     *
     * @param date 日期
     * @return HolidayInfo 对象
     */
    public static HolidayInfo nonHoliday(String date) {
        return HolidayInfo.builder()
                .date(date)
                .name(null)
                .market(null)
                .needSettle(true)
                .isHoliday(false)
                .build();
    }

    /**
     * 判断是否为港股休市
     *
     * @return true - 港股休市，false - 非港股休市
     */
    public boolean isHongKongMarketClosed() {
        return market != null && market.contains("香港市场休市");
    }
}
