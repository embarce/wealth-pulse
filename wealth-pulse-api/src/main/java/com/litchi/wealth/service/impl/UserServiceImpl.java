package com.litchi.wealth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.litchi.wealth.entity.StockInfo;
import com.litchi.wealth.entity.StockMarketData;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.entity.UserAssetSummary;
import com.litchi.wealth.entity.UserPosition;
import com.litchi.wealth.mapper.UserMapper;
import com.litchi.wealth.service.StockInfoService;
import com.litchi.wealth.service.StockMarketDataService;
import com.litchi.wealth.service.UserAssetSummaryService;
import com.litchi.wealth.service.UserPositionService;
import com.litchi.wealth.service.UserService;
import com.litchi.wealth.utils.SecurityUtils;
import com.litchi.wealth.vo.AssetDashboardVo;
import com.litchi.wealth.vo.PositionDashboardVo;
import com.litchi.wealth.vo.UserVo;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.SimpleDateFormat;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author Embrace 01
 * @description litchi 用户表 服务实现类
 * @git: https://github.com/embarce
 * @date 2025-09-10
 */
@Slf4j
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Resource
    private UserAssetSummaryService userAssetSummaryService;

    @Resource
    private UserPositionService userPositionService;

    @Resource
    private StockMarketDataService stockMarketDataService;

    @Resource
    private StockInfoService stockInfoService;


    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveUser(User user) {
        boolean save = save(user);
        return save;
    }

    @Override
    public UserVo getUserVo() {
        String userId = SecurityUtils.getUserId();
        User user = getById(userId);
        return UserVo.builder()
                .nickName(user.getNickName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .build();
    }

    @Override
    public AssetDashboardVo getAssetDashboard() {
        String userId = SecurityUtils.getUserId();

        // 查询用户资产总览
        LambdaQueryWrapper<UserAssetSummary> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserAssetSummary::getUserId, userId);
        UserAssetSummary assetSummary = userAssetSummaryService.getOne(queryWrapper);

        if (assetSummary == null) {
            // 如果没有数据，返回空的 VO
            return AssetDashboardVo.builder()
                    .totalAssets(BigDecimal.ZERO)
                    .cumulativeProfitLoss(BigDecimal.ZERO)
                    .cumulativeProfitLossRate(BigDecimal.ZERO)
                    .availableCash(BigDecimal.ZERO)
                    .purchasingPower(BigDecimal.ZERO)
                    .positionValue(BigDecimal.ZERO)
                    .totalPrincipal(BigDecimal.ZERO)
                    .todayProfitLoss(BigDecimal.ZERO)
                    .todayProfitLossRate(BigDecimal.ZERO)
                    .yesterdayTotalAssets(BigDecimal.ZERO)
                    .totalCashflow(BigDecimal.ZERO)
                    .totalBuyCount(0L)
                    .totalSellCount(0L)
                    .build();
        }

        // 计算今日盈亏
        BigDecimal todayProfitLoss = calculateTodayProfitLoss(assetSummary);
        BigDecimal todayProfitLossRate = calculateRate(todayProfitLoss, assetSummary.getYesterdayTotalAssets());

        // 计算累计盈亏比例
        BigDecimal cumulativeProfitLossRate = calculateRate(assetSummary.getCumulativeProfitLoss(), assetSummary.getTotalPrincipal());

        return AssetDashboardVo.builder()
                .totalAssets(assetSummary.getTotalAssets())
                .cumulativeProfitLoss(assetSummary.getCumulativeProfitLoss())
                .cumulativeProfitLossRate(cumulativeProfitLossRate)
                .availableCash(assetSummary.getAvailableCash())
                .purchasingPower(assetSummary.getPurchasingPower())
                .positionValue(assetSummary.getPositionValue())
                .totalPrincipal(assetSummary.getTotalPrincipal())
                .todayProfitLoss(todayProfitLoss)
                .todayProfitLossRate(todayProfitLossRate)
                .yesterdayTotalAssets(assetSummary.getYesterdayTotalAssets())
                .totalCashflow(assetSummary.getTotalCashflow())
                .totalBuyCount(assetSummary.getTotalBuyCount())
                .totalSellCount(assetSummary.getTotalSellCount())
                .build();
    }

    @Override
    public PositionDashboardVo getPositionDashboard() {
        String userId = SecurityUtils.getUserId();

        // 查询所有持仓（状态为1-持有中）
        LambdaQueryWrapper<UserPosition> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserPosition::getUserId, userId)
                .eq(UserPosition::getPositionStatus, 1);
        List<UserPosition> positions = userPositionService.list(queryWrapper);

        if (positions.isEmpty()) {
            return PositionDashboardVo.builder()
                    .totalPositionValue(BigDecimal.ZERO)
                    .totalCost(BigDecimal.ZERO)
                    .totalProfitLoss(BigDecimal.ZERO)
                    .totalProfitLossRate(BigDecimal.ZERO)
                    .positionCount(0)
                    .profitableCount(0)
                    .lossCount(0)
                    .positions(List.of())
                    .build();
        }

        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");

        // 构建持仓明细列表
        List<PositionDashboardVo.PositionItemVo> positionItems = positions.stream().map(position -> {
            // 获取股票基本信息
            LambdaQueryWrapper<StockInfo> stockInfoQuery = new LambdaQueryWrapper<>();
            stockInfoQuery.eq(StockInfo::getStockCode, position.getStockCode());
            StockInfo stockInfo = stockInfoService.getOne(stockInfoQuery);

            // 获取当前市场价格
            LambdaQueryWrapper<StockMarketData> marketDataQuery = new LambdaQueryWrapper<>();
            marketDataQuery.eq(StockMarketData::getStockCode, position.getStockCode())
                    .orderByDesc(StockMarketData::getQuoteTime)
                    .last("LIMIT 1");
            StockMarketData marketData = stockMarketDataService.getOne(marketDataQuery);

            BigDecimal currentPrice = marketData != null ? marketData.getLastPrice() : BigDecimal.ZERO;
            BigDecimal marketValue = position.getQuantity().multiply(currentPrice);
            BigDecimal costValue = position.getQuantity().multiply(position.getAvgCost());
            BigDecimal profitLoss = marketValue.subtract(costValue);
            BigDecimal profitLossRate = calculateRate(profitLoss, costValue);

            return PositionDashboardVo.PositionItemVo.builder()
                    .stockCode(position.getStockCode())
                    .companyName(stockInfo != null ? stockInfo.getCompanyName() : null)
                    .companyNameCn(stockInfo != null ? stockInfo.getCompanyNameCn() : null)
                    .currency(position.getCostCurrency())
                    .quantity(position.getQuantity())
                    .avgCost(position.getAvgCost())
                    .currentPrice(currentPrice)
                    .marketValue(marketValue)
                    .costValue(costValue)
                    .profitLoss(profitLoss)
                    .profitLossRate(profitLossRate)
                    .positionStatus(position.getPositionStatus())
                    .firstBuyDate(position.getFirstBuyDate() != null ? dateFormat.format(position.getFirstBuyDate()) : null)
                    .lastBuyDate(position.getLastBuyDate() != null ? dateFormat.format(position.getLastBuyDate()) : null)
                    .build();
        }).collect(Collectors.toList());

        // 计算汇总数据
        BigDecimal totalPositionValue = positionItems.stream()
                .map(PositionDashboardVo.PositionItemVo::getMarketValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCost = positionItems.stream()
                .map(PositionDashboardVo.PositionItemVo::getCostValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProfitLoss = positionItems.stream()
                .map(PositionDashboardVo.PositionItemVo::getProfitLoss)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProfitLossRate = calculateRate(totalProfitLoss, totalCost);

        long profitableCount = positionItems.stream()
                .filter(item -> item.getProfitLoss().compareTo(BigDecimal.ZERO) > 0)
                .count();

        long lossCount = positionItems.stream()
                .filter(item -> item.getProfitLoss().compareTo(BigDecimal.ZERO) < 0)
                .count();

        return PositionDashboardVo.builder()
                .totalPositionValue(totalPositionValue)
                .totalCost(totalCost)
                .totalProfitLoss(totalProfitLoss)
                .totalProfitLossRate(totalProfitLossRate)
                .positionCount(positionItems.size())
                .profitableCount((int) profitableCount)
                .lossCount((int) lossCount)
                .positions(positionItems)
                .build();
    }

    /**
     * 计算今日盈亏
     */
    private BigDecimal calculateTodayProfitLoss(UserAssetSummary assetSummary) {
        if (assetSummary.getYesterdayTotalAssets() == null || assetSummary.getYesterdayTotalAssets().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return assetSummary.getTotalAssets().subtract(assetSummary.getYesterdayTotalAssets());
    }

    /**
     * 计算百分比
     */
    private BigDecimal calculateRate(BigDecimal profitLoss, BigDecimal base) {
        if (base == null || base.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return profitLoss.divide(base, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP);
    }
}
