package com.litchi.wealth.service.impl;

import cn.hutool.core.date.DateField;
import cn.hutool.core.date.DateTime;
import cn.hutool.core.date.DateUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.litchi.wealth.entity.StockInfo;
import com.litchi.wealth.entity.StockMarketData;
import com.litchi.wealth.entity.UserPosition;
import com.litchi.wealth.entity.UserPositionSnapshot;
import com.litchi.wealth.mapper.UserPositionSnapshotMapper;
import com.litchi.wealth.service.StockInfoService;
import com.litchi.wealth.service.StockMarketDataService;
import com.litchi.wealth.service.UserPositionService;
import com.litchi.wealth.service.UserPositionSnapshotService;
import com.litchi.wealth.utils.PositionSnapshotConverter;
import com.litchi.wealth.utils.SecurityUtils;
import com.litchi.wealth.vo.PositionSnapshotChartVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 用户持仓快照表 服务实现类
 *
 * @author Embrace
 * @date 2026-02-17
 */
@Slf4j
@Service
public class UserPositionSnapshotServiceImpl extends ServiceImpl<UserPositionSnapshotMapper, UserPositionSnapshot>
        implements UserPositionSnapshotService {

    @Autowired
    private UserPositionService userPositionService;

    @Autowired
    private StockMarketDataService stockMarketDataService;

    @Autowired
    private StockInfoService stockInfoService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int createSnapshotForUser(String userId, LocalDate snapshotDate) {
        log.info("开始为用户创建持仓快照, userId={}, date={}", userId, snapshotDate);

        // 1. 获取用户所有持有中的持仓
        LambdaQueryWrapper<UserPosition> positionWrapper = new LambdaQueryWrapper<>();
        positionWrapper.eq(UserPosition::getUserId, userId)
                .eq(UserPosition::getPositionStatus, 1); // 1-持有中
        List<UserPosition> positions = userPositionService.list(positionWrapper);

        if (positions.isEmpty()) {
            log.info("用户 {} 没有需要快照的持仓", userId);
            return 0;
        }

        // 2. 先删除当天已有的快照（避免重复）
        deleteSnapshotsByUserAndDate(userId, snapshotDate);

        // 3. 批量创建快照
        int count = 0;
        for (UserPosition position : positions) {
            try {
                UserPositionSnapshot snapshot = buildSnapshot(position, snapshotDate);
                if (snapshot != null) {
                    save(snapshot);
                    count++;
                    log.debug("创建快照成功: userId={}, stock={}, quantity={}, price={}",
                            userId, position.getStockCode(), position.getQuantity(), snapshot.getCurrentPrice());
                }
            } catch (Exception e) {
                log.error("创建快照失败: userId={}, stock={}", userId, position.getStockCode(), e);
            }
        }

        log.info("用户 {} 持仓快照完成，共创建 {} 条", userId, count);
        return count;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int createSnapshotForAllUsers(LocalDate snapshotDate) {
        log.info("开始为所有用户创建持仓快照, date={}", snapshotDate);

        // 1. 获取所有有持仓的用户ID
        LambdaQueryWrapper<UserPosition> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPosition::getPositionStatus, 1) // 1-持有中
                .select(UserPosition::getUserId);
        List<UserPosition> positions = userPositionService.list(wrapper);

        Set<String> userIds = positions.stream()
                .map(UserPosition::getUserId)
                .collect(Collectors.toSet());

        if (userIds.isEmpty()) {
            log.info("没有需要快照的用户");
            return 0;
        }

        // 2. 逐个用户创建快照
        int totalCount = 0;
        for (String userId : userIds) {
            try {
                int count = createSnapshotForUser(userId, snapshotDate);
                totalCount += count;
            } catch (Exception e) {
                log.error("用户 {} 快照失败", userId, e);
            }
        }

        log.info("所有用户持仓快照完成，共创建 {} 条", totalCount);
        return totalCount;
    }

    @Override
    public List<UserPositionSnapshot> getSnapshotByDate(String userId, LocalDate snapshotDate) {
        LambdaQueryWrapper<UserPositionSnapshot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPositionSnapshot::getUserId, userId)
                .eq(UserPositionSnapshot::getSnapshotDate, snapshotDate)
                .orderByDesc(UserPositionSnapshot::getMarketValue);
        return list(wrapper);
    }

    @Override
    public List<UserPositionSnapshot> getStockHistorySnapshots(String userId, String stockCode,
                                                               LocalDate startDate, LocalDate endDate) {
        LambdaQueryWrapper<UserPositionSnapshot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPositionSnapshot::getUserId, userId)
                .eq(UserPositionSnapshot::getStockCode, stockCode)
                .ge(UserPositionSnapshot::getSnapshotDate, startDate)
                .le(UserPositionSnapshot::getSnapshotDate, endDate)
                .orderByAsc(UserPositionSnapshot::getSnapshotDate);
        return list(wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int deleteSnapshotsByDate(LocalDate snapshotDate) {
        LambdaQueryWrapper<UserPositionSnapshot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPositionSnapshot::getSnapshotDate, snapshotDate);
        int count = Math.toIntExact(count(wrapper));
        remove(wrapper);
        log.info("删除日期 {} 的快照 {} 条", snapshotDate, count);
        return count;
    }

    /**
     * 删除指定用户和日期的快照
     */
    private void deleteSnapshotsByUserAndDate(String userId, LocalDate snapshotDate) {
        LambdaQueryWrapper<UserPositionSnapshot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPositionSnapshot::getUserId, userId)
                .eq(UserPositionSnapshot::getSnapshotDate, snapshotDate);
        remove(wrapper);
    }

    /**
     * 构建快照对象
     */
    private UserPositionSnapshot buildSnapshot(UserPosition position, LocalDate snapshotDate) {
        String stockCode = position.getStockCode();

        // 1. 获取当前股价
        BigDecimal currentPrice = getCurrentPrice(stockCode, snapshotDate);
        if (currentPrice == null || currentPrice.compareTo(BigDecimal.ZERO) <= 0) {
            // 如果没有股价数据，使用成本价
            currentPrice = position.getAvgCost();
            log.warn("股票 {} 没有行情数据，使用成本价: {}", stockCode, currentPrice);
        }

        // 2. 获取股票名称
        String stockName = getStockName(stockCode);

        // 3. 计算市值和盈亏
        BigDecimal quantity = position.getQuantity();
        BigDecimal avgCost = position.getAvgCost();
        BigDecimal marketValue = currentPrice.multiply(quantity);
        BigDecimal costValue = avgCost.multiply(quantity);
        BigDecimal profitLoss = marketValue.subtract(costValue);

        // 计算盈亏比例
        BigDecimal profitLossRate = BigDecimal.ZERO;
        if (costValue.compareTo(BigDecimal.ZERO) > 0) {
            profitLossRate = profitLoss.divide(costValue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        // 4. 构建快照对象
        UserPositionSnapshot snapshot = new UserPositionSnapshot();
        snapshot.setUserId(position.getUserId());
        snapshot.setStockCode(stockCode);
        snapshot.setStockName(stockName);
        snapshot.setSnapshotDate(snapshotDate);
        snapshot.setQuantity(quantity);
        snapshot.setAvgCost(avgCost);
        snapshot.setCurrentPrice(currentPrice);
        snapshot.setMarketValue(marketValue);
        snapshot.setCostValue(costValue);
        snapshot.setProfitLoss(profitLoss);
        snapshot.setProfitLossRate(profitLossRate);
        snapshot.setCurrency(position.getCostCurrency());

        return snapshot;
    }

    /**
     * 获取指定日期的股价
     */
    private BigDecimal getCurrentPrice(String stockCode, LocalDate date) {
        LambdaQueryWrapper<StockMarketData> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StockMarketData::getStockCode, stockCode)
                .eq(StockMarketData::getMarketDate, date)
                .last("LIMIT 1");
        StockMarketData marketData = stockMarketDataService.getOne(wrapper);
        return marketData != null ? marketData.getLastPrice() : null;
    }

    /**
     * 获取股票名称
     */
    private String getStockName(String stockCode) {
        LambdaQueryWrapper<StockInfo> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StockInfo::getStockCode, stockCode);
        StockInfo stockInfo = stockInfoService.getOne(wrapper);
        return stockInfo != null ? stockInfo.getCompanyName() : stockCode;
    }

    @Override
    public List<com.litchi.wealth.vo.PositionSnapshotVo> getSnapshotVoByDate(String userId, LocalDate snapshotDate) {
        List<UserPositionSnapshot> snapshots = getSnapshotByDate(userId, snapshotDate);
        return PositionSnapshotConverter.toVoList(snapshots);
    }

    @Override
    public List<com.litchi.wealth.vo.PositionSnapshotVo> getStockHistorySnapshotVos(String userId, String stockCode,
                                                                                    LocalDate startDate, LocalDate endDate) {
        List<UserPositionSnapshot> snapshots = getStockHistorySnapshots(userId, stockCode, startDate, endDate);
        return PositionSnapshotConverter.toVoList(snapshots);
    }

    @Override
    public List<PositionSnapshotChartVo> getMarketValueChart(String model) {
        String userId = SecurityUtils.getUserId();

        // 1. 根据 model 确定天数
        int days = calculateDays(model);

        // 2. 计算日期范围（从今天往前推）
        Date endDate = DateUtil.endOfDay(new Date());
        DateTime startDate = DateUtil.beginOfDay(DateUtil.offset(endDate, DateField.DAY_OF_YEAR, -days));

        // 3. 查询日期范围内的快照数据
        LambdaQueryWrapper<UserPositionSnapshot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPositionSnapshot::getUserId, userId)
                .ge(UserPositionSnapshot::getSnapshotDate, startDate)
                .le(UserPositionSnapshot::getSnapshotDate, endDate)
                .orderByAsc(UserPositionSnapshot::getSnapshotDate);

        List<UserPositionSnapshot> snapshots = list(wrapper);

        // 4. 如果没有数据，返回空列表
        if (snapshots.isEmpty()) {
            return List.of();
        }

        // 5. 按日期分组汇总市值
        Map<LocalDate, BigDecimal> dailyMarketValue = snapshots.stream()
                .collect(Collectors.groupingBy(
                        UserPositionSnapshot::getSnapshotDate,
                        TreeMap::new,
                        Collectors.reducing(
                                BigDecimal.ZERO,
                                UserPositionSnapshot::getMarketValue,
                                BigDecimal::add
                        )
                ));

        // 6. 转换为 VO
        List<PositionSnapshotChartVo> result = dailyMarketValue.entrySet().stream()
                .map(entry -> PositionSnapshotChartVo.builder()
                        .snapshotDate(entry.getKey().toString())
                        .marketValue(entry.getValue())
                        .build())
                .collect(Collectors.toList());

        log.info("用户 {} 市值图表数据查询完成，model={}, 范围={}~{}, 数据点数={}",
                userId, model, startDate, endDate, result.size());

        return result;
    }

    /**
     * 根据 model 参数计算天数
     *
     * @param model 范围: 0-5天, 1-7天, 2-15天, 3-30天
     * @return 天数
     */
    private int calculateDays(String model) {
        if (model == null) {
            return 7; // 默认7天
        }

        return switch (model) {
            case "0" -> 5;
            case "1" -> 7;
            case "2" -> 15;
            case "3" -> 30;
            default -> 7; // 默认7天
        };
    }
}
