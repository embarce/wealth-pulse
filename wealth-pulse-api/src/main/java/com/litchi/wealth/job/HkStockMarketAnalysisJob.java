package com.litchi.wealth.job;

import cn.hutool.core.date.DateUtil;
import com.litchi.wealth.dto.ai.HkStockMarketAnalysisRequest;
import com.litchi.wealth.rpc.PythonStockRpc;
import com.litchi.wealth.utils.RedisCache;
import com.litchi.wealth.vo.ai.HkStockMarketAnalysisVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

import static com.litchi.wealth.constant.Constants.ANALYSIS_REDIS_KEY_PREFIX;

/**
 * 港股市场 AI 分析定时任务
 *
 * @author Embrace
 * @description 每天早上 9 点自动调用 Python AI 服务分析港股市场，结果存入 Redis
 * @date 2026/3/8
 */
@Slf4j
@Component
public class HkStockMarketAnalysisJob {

    @Autowired
    private PythonStockRpc pythonStockRpc;

    @Autowired
    private RedisCache redisCache;

    /**
     * 分析结果有效期：4 小时
     */
    private static final long CACHE_EXPIRE_HOURS = 4;

    /**
     * 固定分析模型
     */
    private static final String MODEL = "qwen";

    /**
     * 固定供应商
     */
    private static final String PROVIDER = "qwen3-max";


    /**
     * 每天9:00、14:00、18:00 执行
     */
    @Scheduled(cron = "0 0 9,14,18 * * ?")
    public void analyzeHkStockMarketDaily() {
        log.info("========== 开始执行港股市场 AI 分析定时任务 ==========");
        long startTime = System.currentTimeMillis();

        try {
            // 获取今天日期
            String today = DateUtil.today();
            String redisKey = ANALYSIS_REDIS_KEY_PREFIX + today;

            // 检查今天是否已执行过
            if (redisCache.hasKey(redisKey)) {
                log.info("今天已执行过港股市场 AI 分析，跳过执行");
                return;
            }

            log.info("开始调用 Python AI 服务分析港股市场...");

            // 调用 Python AI 服务
            HkStockMarketAnalysisRequest request = new HkStockMarketAnalysisRequest();
            // 可在这里配置默认的 provider 和 model
            request.setProvider(PROVIDER);
            request.setModel(MODEL);

            HkStockMarketAnalysisVo result = pythonStockRpc.analyzeHkStockMarket(request);

            // 存储到 Redis
            redisCache.setCacheObject(redisKey, result, (int) (CACHE_EXPIRE_HOURS * 60 * 60), TimeUnit.SECONDS);

            long duration = System.currentTimeMillis() - startTime;

            log.info("========== 港股市场 AI 分析定时任务完成 ==========");
            log.info("分析日期：{}", today);
            log.info("新闻总数：{}", result.getNewsSummary() != null ? result.getNewsSummary().getTotalCount() : 0);
            log.info("报告长度：{} 字符", result.getReport() != null ? result.getReport().length() : 0);
            log.info("Redis Key: {}", redisKey);
            log.info("有效期：{} 小时", CACHE_EXPIRE_HOURS);
            log.info("耗时：{} ms", duration);

        } catch (Exception e) {
            log.error("港股市场 AI 分析定时任务执行失败", e);
        }
    }

    /**
     * 手动触发分析（用于测试或补执行）
     * 不使用时可删除此方法
     */
    public void analyzeHkStockMarketManual() {
        log.info("手动触发港股市场 AI 分析");
        analyzeHkStockMarketDaily();
    }
}
