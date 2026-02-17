package com.litchi.wealth.job;

import cn.hutool.core.date.DateUtil;
import cn.hutool.http.Header;
import cn.hutool.http.HttpRequest;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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

    //itick key
    private String key="28500ce7b8dd49aeb44b8508027e91ac7f8dac25dfd74be1b93473fcbc3e512f";

    //url
    private String url = "https://api.itick.org/symbol/v2/holidays?code=HK";

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
            String today = DateUtil.today();
            //确定是否为公共假期
            boolean isHoliday = false;
            String result = HttpRequest.get("https://api.itick.org/symbol/v2/holidays?code=HK")
                    .header(Header.USER_AGENT, "PostmanRuntime/7.49.1")
                    .header(Header.ACCEPT, "application/json")
                    .header("Token", "28500ce7b8dd49aeb44b8508027e91ac7f8dac25dfd74be1b93473fcbc3e512f")
                    .timeout(20000)//超时，毫秒
                    .execute().body();
            log.info("获取假期数据：{}", result);
            JSONObject jsonObject = JSONUtil.parseObj(result);
            Integer code = jsonObject.getInt("code");
            if (code == 0){
                List<JSONObject> data = jsonObject.getBeanList("data", JSONObject.class);
                for (JSONObject item : data) {
                    /**
                     *"c": "HK",
                     *"r": "Hong Kong",
                     *"d": "2026-01-01",
                     *"t": "09:00-09:30,09:30-12:00|13:00-16:00,16:00-16:30",
                     *"z": "Asia/Hong_Kong",
                     *"v": "New Year's Day"
                     */
                    String day = item.getStr("d");
                    String vStr = item.getStr("v");
                    if (day.equals(today)){
                        isHoliday = true;
                        log.info("今天是公共假期：{}", vStr);
                    }
                }
            }
            if (isHoliday){
                log.info("今天是公共假期，不进行交易结算");
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
}
