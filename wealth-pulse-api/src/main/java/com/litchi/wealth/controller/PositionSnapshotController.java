package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.job.PositionSnapshotJob;
import com.litchi.wealth.service.UserPositionSnapshotService;
import com.litchi.wealth.utils.SecurityUtils;
import com.litchi.wealth.vo.PositionSnapshotVo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 用户持仓快照控制器
 *
 * @author Embrace
 * @description 提供持仓快照查询和手动快照触发接口
 * @date 2026-02-17
 */
@RestController
@RequestMapping("/position-snapshot")
@Tag(name = "持仓快照", description = "提供用户持仓快照相关的 API 接口")
public class PositionSnapshotController {

    @Autowired
    private UserPositionSnapshotService userPositionSnapshotService;

    @Autowired
    private PositionSnapshotJob positionSnapshotJob;

    /**
     * 获取指定日期的持仓快照
     */
    @GetMapping("/list")
    @Operation(summary = "获取指定日期的持仓快照", description = "获取当前用户在指定日期的所有持仓快照")
    public Result getSnapshotByDate(
            @Parameter(description = "快照日期，格式：yyyy-MM-dd，默认为今天")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        String userId = SecurityUtils.getUserId();
        LocalDate snapshotDate = date != null ? date : LocalDate.now();

        List<PositionSnapshotVo> snapshots = userPositionSnapshotService.getSnapshotVoByDate(userId, snapshotDate);
        return Result.success(snapshots);
    }

    /**
     * 获取指定股票的历史快照
     */
    @GetMapping("/stock-history")
    @Operation(summary = "获取股票历史快照", description = "获取指定股票在指定时间范围内的历史快照")
    public Result getStockHistory(
            @Parameter(description = "股票代码", required = true)
            @RequestParam String stockCode,

            @Parameter(description = "开始日期，格式：yyyy-MM-dd")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,

            @Parameter(description = "结束日期，格式：yyyy-MM-dd")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate) {

        String userId = SecurityUtils.getUserId();

        // 默认查询最近30天
        if (startDate == null) {
            startDate = LocalDate.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        List<PositionSnapshotVo> snapshots = userPositionSnapshotService.getStockHistorySnapshotVos(
                userId, stockCode, startDate, endDate);
        return Result.success(snapshots);
    }

    /**
     * 手动触发快照（仅用于测试和管理）
     */
    @PostMapping("/trigger")
    @Operation(summary = "手动触发快照", description = "手动触发为所有用户创建持仓快照（通常由定时任务自动执行）")
    public Result triggerSnapshot(
            @Parameter(description = "快照日期，格式：yyyy-MM-dd，默认为今天")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        LocalDate snapshotDate = date != null ? date : LocalDate.now();
        positionSnapshotJob.manualSnapshot(snapshotDate);
        return Result.success("快照任务已触发，日期: " + snapshotDate);
    }
}
