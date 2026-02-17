package com.litchi.wealth.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.litchi.wealth.entity.UserPositionSnapshot;
import com.litchi.wealth.vo.PositionSnapshotVo;

import java.time.LocalDate;
import java.util.List;

/**
 * 用户持仓快照表 服务类
 *
 * @author Embrace
 * @date 2026-02-17
 */
public interface UserPositionSnapshotService extends IService<UserPositionSnapshot> {

    /**
     * 为指定用户创建持仓快照
     *
     * @param userId 用户ID
     * @param snapshotDate 快照日期
     * @return 创建的快照数量
     */
    int createSnapshotForUser(String userId, LocalDate snapshotDate);

    /**
     * 为所有用户创建持仓快照
     *
     * @param snapshotDate 快照日期
     * @return 创建的快照数量
     */
    int createSnapshotForAllUsers(LocalDate snapshotDate);

    /**
     * 获取指定日期的用户持仓快照
     *
     * @param userId 用户ID
     * @param snapshotDate 快照日期
     * @return 快照列表
     */
    List<UserPositionSnapshot> getSnapshotByDate(String userId, LocalDate snapshotDate);

    /**
     * 获取指定股票的历史快照
     *
     * @param userId 用户ID
     * @param stockCode 股票代码
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @return 快照列表
     */
    List<UserPositionSnapshot> getStockHistorySnapshots(String userId, String stockCode,
                                                        LocalDate startDate, LocalDate endDate);

    /**
     * 删除指定日期的快照（用于重新快照）
     *
     * @param snapshotDate 快照日期
     * @return 删除数量
     */
    int deleteSnapshotsByDate(LocalDate snapshotDate);

    /**
     * 获取指定日期的用户持仓快照（VO格式）
     *
     * @param userId 用户ID
     * @param snapshotDate 快照日期
     * @return 快照VO列表
     */
    List<PositionSnapshotVo> getSnapshotVoByDate(String userId, LocalDate snapshotDate);

    /**
     * 获取指定股票的历史快照（VO格式）
     *
     * @param userId 用户ID
     * @param stockCode 股票代码
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @return 快照VO列表
     */
    List<PositionSnapshotVo> getStockHistorySnapshotVos(String userId, String stockCode,
                                                        LocalDate startDate, LocalDate endDate);
}
