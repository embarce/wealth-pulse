package com.litchi.wealth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.litchi.wealth.entity.StockMarketData;
import com.litchi.wealth.entity.UserAssetSummary;
import com.litchi.wealth.entity.UserPosition;
import com.litchi.wealth.mapper.UserAssetSummaryMapper;
import com.litchi.wealth.service.StockMarketDataService;
import com.litchi.wealth.service.UserAssetSummaryService;
import com.litchi.wealth.service.UserPositionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * @author Embrace
 * @description 用户资产总览 服务实现类
 * @git: https://github.com/embarce
 * @date 2026-02-05
 */
@Slf4j
@Service
public class UserAssetSummaryServiceImpl extends ServiceImpl<UserAssetSummaryMapper, UserAssetSummary> implements UserAssetSummaryService {

    @Autowired
    private UserPositionService userPositionService;

    @Autowired
    private StockMarketDataService stockMarketDataService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserAssetSummary recalculateAssetsWithRealtimePrice(String userId) {
        log.info("开始实时计算用户资产, userId={}", userId);

        // 1. 获取用户资产总览
        LambdaQueryWrapper<UserAssetSummary> assetWrapper = new LambdaQueryWrapper<>();
        assetWrapper.eq(UserAssetSummary::getUserId, userId);
        UserAssetSummary assetSummary = getOne(assetWrapper);

        if (assetSummary == null) {
            log.warn("用户资产总览不存在, userId={}", userId);
            return null;
        }

        // 2. 获取用户所有持仓（只获取持有中的持仓）
        LambdaQueryWrapper<UserPosition> positionWrapper = new LambdaQueryWrapper<>();
        positionWrapper.eq(UserPosition::getUserId, userId)
                .eq(UserPosition::getPositionStatus, 1); // 1-持有中
        List<UserPosition> positions = userPositionService.list(positionWrapper);

        // 3. 计算实时持仓市值
        BigDecimal realTimePositionValue = BigDecimal.ZERO;
        for (UserPosition position : positions) {
            BigDecimal currentPrice = getCurrentPrice(position.getStockCode());
            if (currentPrice != null && currentPrice.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal positionValue = currentPrice.multiply(position.getQuantity());
                realTimePositionValue = realTimePositionValue.add(positionValue);
                log.debug("股票: {}, 数量: {}, 当前价: {}, 市值: {}",
                        position.getStockCode(), position.getQuantity(), currentPrice, positionValue);
            } else {
                // 如果没有最新股价，使用成本价作为保守估计
                BigDecimal positionValue = position.getAvgCost().multiply(position.getQuantity());
                realTimePositionValue = realTimePositionValue.add(positionValue);
                log.warn("股票 {} 没有最新股价数据，使用成本价计算市值: {}",
                        position.getStockCode(), positionValue);
            }
        }

        // 4. 更新持仓市值和总资产
        BigDecimal oldPositionValue = assetSummary.getPositionValue();
        assetSummary.setPositionValue(realTimePositionValue);

        // 总资产 = 可用现金 + 实时持仓市值
        BigDecimal newTotalAssets = assetSummary.getAvailableCash().add(realTimePositionValue);
        assetSummary.setTotalAssets(newTotalAssets);

        // 5. 回写数据库
        updateById(assetSummary);

        log.info("实时计算完成, userId={}, 旧持仓市值: {}, 新持仓市值: {}, 总资产: {}",
                userId, oldPositionValue, realTimePositionValue, newTotalAssets);

        return assetSummary;
    }

    /**
     * 获取股票最新价格
     * <p>按市场日期降序排序，取第一条最新的价格数据
     *
     * @param stockCode 股票代码
     * @return 最新价格，如果没有则返回 null
     */
    private BigDecimal getCurrentPrice(String stockCode) {
        LambdaQueryWrapper<StockMarketData> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StockMarketData::getStockCode, stockCode)
                .orderByDesc(StockMarketData::getMarketDate)
                .last("LIMIT 1");
        StockMarketData marketData = stockMarketDataService.getOne(wrapper);
        if (marketData != null) {
            log.debug("获取股票 {} 最新价格: {}, 日期: {}",
                    stockCode, marketData.getLastPrice(), marketData.getMarketDate());
        } else {
            log.warn("股票 {} 没有找到任何历史价格数据", stockCode);
        }
        return marketData != null ? marketData.getLastPrice() : null;
    }
}
