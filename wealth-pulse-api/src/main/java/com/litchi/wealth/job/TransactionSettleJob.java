package com.litchi.wealth.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.litchi.wealth.entity.StockTransactionLog;
import com.litchi.wealth.service.StockTransactionLogService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

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

    /**
     * 每日凌晨1点执行交易结算
     * 将所有未结算的交易标记为已结算
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void dailySettle() {
        log.info("开始执行每日交易结算任务");
        try {
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
                    .collect(Collectors.toList());

            // 逐个用户结算
            int totalSettled = 0;
            for (String userId : userIds) {
                try {
                    int count = stockTransactionLogService.settleTransactions(userId);
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
