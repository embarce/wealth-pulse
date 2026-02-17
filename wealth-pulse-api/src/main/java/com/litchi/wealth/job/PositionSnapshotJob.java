package com.litchi.wealth.job;

import com.litchi.wealth.service.UserPositionSnapshotService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * 用户持仓快照定时任务
 *
 * @author Embrace
 * @description 每天下午6点自动创建用户持仓快照，用于历史涨跌统计
 * @date 2026-02-17
 */
@Slf4j
@Component
public class PositionSnapshotJob {

    @Autowired
    private UserPositionSnapshotService userPositionSnapshotService;

    /**
     * 每天下午6点执行持仓快照
     * Cron表达式: 秒 分 时 日 月 周
     * 0 0 18 * * ? 表示每天18:00:00执行
     */
    @Scheduled(cron = "0 0 18 * * ?")
    public void dailySnapshot() {
        log.info("========================================");
        log.info("开始执行每日持仓快照任务");
        long startTime = System.currentTimeMillis();

        try {
            LocalDate today = LocalDate.now();

            // 删除当天已有的快照（避免重复）
            log.info("清理当天已有快照...");
            int deletedCount = userPositionSnapshotService.deleteSnapshotsByDate(today);

            // 创建新的快照
            log.info("开始创建新快照...");
            int createdCount = userPositionSnapshotService.createSnapshotForAllUsers(today);

            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            log.info("每日持仓快照任务完成");
            log.info("删除旧快照: {} 条, 创建新快照: {} 条, 耗时: {} ms",
                    deletedCount, createdCount, duration);
            log.info("========================================");

        } catch (Exception e) {
            log.error("每日持仓快照任务执行失败", e);
        }
    }

    /**
     * 手动触发快照的测试方法
     * 可以通过API调用此方法进行手动快照
     */
    public void manualSnapshot(LocalDate date) {
        log.info("手动触发持仓快照, date={}", date);
        int count = userPositionSnapshotService.createSnapshotForAllUsers(date);
        log.info("手动快照完成，创建 {} 条", count);
    }
}
