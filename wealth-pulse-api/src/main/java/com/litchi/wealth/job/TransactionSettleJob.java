package com.litchi.wealth.job;

import cn.hutool.core.date.DateUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.litchi.wealth.dto.HolidayInfo;
import com.litchi.wealth.entity.StockTransactionLog;
import com.litchi.wealth.service.StockTransactionLogService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;

/**
 * 交易结算定时任务
 *
 * @author Embrace
 * @description 每日自动结算未结算的交易
 * @date 2026-02-07
 */
@Slf4j
@Component
public class TransactionSettleJob {

    @Autowired
    private StockTransactionLogService stockTransactionLogService;


    private static final String HOLIDAY_JSON = """
            [
              {"date":"2026-01-01","name":"一月一日/元旦假期","market":"香港市场休市,北向互换通-休市"},
              {"date":"2026-01-02","name":"元旦假期","market":"北向互换通-休市"},
              {"date":"2026-01-03","name":"元旦假期","market":""},
              {"date":"2026-02-15","name":"春节假期","market":""},
              {"date":"2026-02-16","name":"春节假期","market":"北向互换通-休市"},
              {"date":"2026-02-17","name":"农历年初一/春节假期","market":"香港市场休市,北向互换通-休市"},
              {"date":"2026-02-18","name":"农历年初二/春节假期","market":"香港市场休市,北向互换通-休市"},
              {"date":"2026-02-19","name":"农历年初三/春节假期","market":"香港市场休市,北向互换通-休市"},
              {"date":"2026-02-20","name":"春节假期","market":"北向互换通-休市"},
              {"date":"2026-02-21","name":"春节假期","market":""},
              {"date":"2026-02-22","name":"春节假期","market":""},
              {"date":"2026-02-23","name":"春节假期","market":"北向互换通-休市"},
              {"date":"2026-04-03","name":"耶稣受难节","market":"香港市场休市"},
              {"date":"2026-04-04","name":"耶稣受难节翌日/清明节假期","market":"香港市场休市"},
              {"date":"2026-04-05","name":"清明节假期","market":""},
              {"date":"2026-04-06","name":"清明节翌日/清明节假期","market":"香港市场休市,北向互换通-休市"},
              {"date":"2026-04-07","name":"复活节星期一翌日","market":"香港市场休市"},
              {"date":"2026-05-01","name":"劳动节/劳动节假期","market":"香港市场休市,北向互换通-休市"},
              {"date":"2026-05-02","name":"劳动节假期","market":""},
              {"date":"2026-05-03","name":"劳动节假期","market":""},
              {"date":"2026-05-04","name":"劳动节假期","market":"北向互换通-休市"},
              {"date":"2026-05-05","name":"劳动节假期","market":"北向互换通-休市"},
              {"date":"2026-05-25","name":"佛诞翌日","market":"香港市场休市"},
              {"date":"2026-06-19","name":"端午节/端午节假期","market":"香港市场休市,北向互换通-休市"},
              {"date":"2026-06-20","name":"端午节假期","market":""},
              {"date":"2026-06-21","name":"端午节假期","market":""},
              {"date":"2026-07-01","name":"香港特别行政区成立纪念日","market":"香港市场休市"},
              {"date":"2026-09-25","name":"中秋节假期","market":"北向互换通-休市"},
              {"date":"2026-09-26","name":"中秋节翌日/中秋节假期","market":"香港市场休市"},
              {"date":"2026-09-27","name":"中秋节假期","market":""},
              {"date":"2026-10-01","name":"国庆日/国庆假期","market":"香港市场休市,北向互换通-休市"},
              {"date":"2026-10-02","name":"国庆假期","market":"北向互换通-休市"},
              {"date":"2026-10-03","name":"国庆假期","market":""},
              {"date":"2026-10-04","name":"国庆假期","market":""},
              {"date":"2026-10-05","name":"国庆假期","market":"北向互换通-休市"},
              {"date":"2026-10-06","name":"国庆假期","market":"北向互换通-休市"},
              {"date":"2026-10-07","name":"国庆假期","market":"北向互换通-休市"},
              {"date":"2026-10-19","name":"重阳节翌日","market":"香港市场休市"},
              {"date":"2026-12-25","name":"圣诞节","market":"香港市场休市"},
              {"date":"2026-12-26","name":"圣诞节后第一个周日","market":"香港市场休市"}
            ]
            """;

    /**
     * 每日凌晨1点执行交易结算
     * 将所有未结算的交易标记为已结算
     */
    @Scheduled(cron = "0 0 16 * * MON-FRI")
    public void dailySettle() {
        log.info("开始执行每日交易结算任务");
        try {
            // 获取当前时间
            Date date = new Date();
            // 确定是否为公共假期
            HolidayInfo holidayInfo = getHolidayFlag();
            if (holidayInfo.getIsHoliday() && !holidayInfo.getNeedSettle()) {
                log.info("今天是公共假期 [{}]，假期名称 [{}]，市场休市信息 [{}]，不进行交易结算",
                        holidayInfo.getDate(), holidayInfo.getName(), holidayInfo.getMarket());
                return;
            }
            // 查询所有未结算的交易
            LambdaQueryWrapper<StockTransactionLog> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(StockTransactionLog::getIsSettled, false);
            List<StockTransactionLog> unsettledTransactions = stockTransactionLogService.list(queryWrapper);

            if (unsettledTransactions.isEmpty()) {
                log.info("没有需要结算的交易");
                return;
            }

            // 按用户分组
            List<String> userIds = unsettledTransactions.stream()
                    .map(StockTransactionLog::getUserId)
                    .distinct()
                    .toList();

            // 逐个用户结算
            int totalSettled = 0;
            for (String userId : userIds) {
                try {
                    int count = stockTransactionLogService.settleTransactions(userId, date);
                    totalSettled += count;
                    log.info("用户 {} 交易结算完成，结算 {} 笔", userId, count);
                } catch (Exception e) {
                    log.error("用户 {} 交易结算失败", userId, e);
                }
            }

            log.info("每日交易结算任务完成，共结算 {} 个用户的 {} 笔交易", userIds.size(), totalSettled);
        } catch (Exception e) {
            log.error("每日交易结算任务执行失败", e);
        }
    }


    /**
     * [
     * {"date":"2026-01-01","name":"一月一日/元旦假期","market":"香港市场休市,北向互换通-休市"},
     * {"date":"2026-01-02","name":"元旦假期","market":"北向互换通-休市"},
     * {"date":"2026-01-03","name":"元旦假期","market":""},
     * {"date":"2026-02-15","name":"春节假期","market":""},
     * {"date":"2026-02-16","name":"春节假期","market":"北向互换通-休市"},
     * {"date":"2026-02-17","name":"农历年初一/春节假期","market":"香港市场休市,北向互换通-休市"},
     * {"date":"2026-02-18","name":"农历年初二/春节假期","market":"香港市场休市,北向互换通-休市"},
     * {"date":"2026-02-19","name":"农历年初三/春节假期","market":"香港市场休市,北向互换通-休市"},
     * {"date":"2026-02-20","name":"春节假期","market":"北向互换通-休市"},
     * {"date":"2026-02-21","name":"春节假期","market":""},
     * {"date":"2026-02-22","name":"春节假期","market":""},
     * {"date":"2026-02-23","name":"春节假期","market":"北向互换通-休市"},
     * {"date":"2026-04-03","name":"耶稣受难节","market":"香港市场休市"},
     * {"date":"2026-04-04","name":"耶稣受难节翌日/清明节假期","market":"香港市场休市"},
     * {"date":"2026-04-05","name":"清明节假期","market":""},
     * {"date":"2026-04-06","name":"清明节翌日/清明节假期","market":"香港市场休市,北向互换通-休市"},
     * {"date":"2026-04-07","name":"复活节星期一翌日","market":"香港市场休市"},
     * {"date":"2026-05-01","name":"劳动节/劳动节假期","market":"香港市场休市,北向互换通-休市"},
     * {"date":"2026-05-02","name":"劳动节假期","market":""},
     * {"date":"2026-05-03","name":"劳动节假期","market":""},
     * {"date":"2026-05-04","name":"劳动节假期","market":"北向互换通-休市"},
     * {"date":"2026-05-05","name":"劳动节假期","market":"北向互换通-休市"},
     * {"date":"2026-05-25","name":"佛诞翌日","market":"香港市场休市"},
     * {"date":"2026-06-19","name":"端午节/端午节假期","market":"香港市场休市,北向互换通-休市"},
     * {"date":"2026-06-20","name":"端午节假期","market":""},
     * {"date":"2026-06-21","name":"端午节假期","market":""},
     * {"date":"2026-07-01","name":"香港特别行政区成立纪念日","market":"香港市场休市"},
     * {"date":"2026-09-25","name":"中秋节假期","market":"北向互换通-休市"},
     * {"date":"2026-09-26","name":"中秋节翌日/中秋节假期","market":"香港市场休市"},
     * {"date":"2026-09-27","name":"中秋节假期","market":""},
     * {"date":"2026-10-01","name":"国庆日/国庆假期","market":"香港市场休市,北向互换通-休市"},
     * {"date":"2026-10-02","name":"国庆假期","market":"北向互换通-休市"},
     * {"date":"2026-10-03","name":"国庆假期","market":""},
     * {"date":"2026-10-04","name":"国庆假期","market":""},
     * {"date":"2026-10-05","name":"国庆假期","market":"北向互换通-休市"},
     * {"date":"2026-10-06","name":"国庆假期","market":"北向互换通-休市"},
     * {"date":"2026-10-07","name":"国庆假期","market":"北向互换通-休市"},
     * {"date":"2026-10-19","name":"重阳节翌日","market":"香港市场休市"},
     * {"date":"2026-12-25","name":"圣诞节","market":"香港市场休市"},
     * {"date":"2026-12-26","name":"圣诞节后第一个周日","market":"香港市场休市"}
     * ]
     */
    public static HolidayInfo getHolidayFlag() {
        String today = DateUtil.today();
        List<JSONObject> list = JSONUtil.toList(HOLIDAY_JSON, JSONObject.class);
        for (JSONObject jsonObject : list) {
            String dateStr = jsonObject.getStr("date");
            if (dateStr.equals(today)) {
                // 检查是否为港股休市
                String market = jsonObject.getStr("market");
                boolean isHongKongClosed = market != null && market.contains("香港市场休市");
                return HolidayInfo.fromJson(jsonObject, !isHongKongClosed);
            }
        }
        // 今天不是假期
        return HolidayInfo.nonHoliday(today);
    }

}
