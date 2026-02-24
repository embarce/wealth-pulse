package com.litchi.wealth.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.litchi.wealth.entity.UserAssetSummary;
import com.litchi.wealth.service.UserAssetSummaryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 资产数据实时更新定时任务
 *
 * @author Embrace
 * @description 每10分钟自动更新所有用户的资产数据（基于最新股价）
 * @date 2026-02-16
 */
@Slf4j
@Component
public class AssetUpdateJob {

    @Autowired
    private UserAssetSummaryService userAssetSummaryService;

    /**
     * 每10分钟执行一次资产更新
     * 基于最新股价重新计算所有用户的持仓市值和总资产
     */
    @Scheduled(cron = "0 */10 8-18 * * MON-FRI")
    public void updateAssetsRealtime() {
        log.info("开始执行资产实时更新任务");
        long startTime = System.currentTimeMillis();

        try {
            // 查询所有用户资产总览记录
            LambdaQueryWrapper<UserAssetSummary> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.isNotNull(UserAssetSummary::getUserId);
            List<UserAssetSummary> allAssets = userAssetSummaryService.list(queryWrapper);

            if (allAssets.isEmpty()) {
                log.info("没有需要更新的用户资产数据");
                return;
            }

            int successCount = 0;
            int failCount = 0;

            // 逐个用户更新资产
            for (UserAssetSummary asset : allAssets) {
                String userId = asset.getUserId();
                try {
                    userAssetSummaryService.recalculateAssetsWithRealtimePrice(userId);
                    successCount++;
                    log.debug("用户 {} 资产更新成功", userId);
                } catch (Exception e) {
                    failCount++;
                    log.error("用户 {} 资产更新失败", userId, e);
                }
            }

            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            log.info("资产实时更新任务完成，成功: {}, 失败: {}, 耗时: {} ms",
                    successCount, failCount, duration);

        } catch (Exception e) {
            log.error("资产实时更新任务执行失败", e);
        }
    }

    /**
     * 每5分钟执行一次资产更新（高频版本，可选）
     * 如果市场波动较大，可以启用此任务，关闭上面的10分钟任务
     */
    // @Scheduled(cron = "0 */5 * * * ?")
    public void updateAssetsRealtimeHighFrequency() {
        log.info("开始执行资产高频更新任务（5分钟）");
        updateAssetsRealtime();
    }
}
