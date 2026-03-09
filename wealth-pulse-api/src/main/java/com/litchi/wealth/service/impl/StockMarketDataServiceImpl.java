package com.litchi.wealth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.litchi.wealth.entity.StockMarketData;
import com.litchi.wealth.mapper.StockMarketDataMapper;
import com.litchi.wealth.service.StockMarketDataService;
import org.springframework.stereotype.Service;

/**
 * @author Embrace
 * @description 股票行情数据表 服务实现类
 * @git: https://github.com/embarce
 * @date 2026-02-05
 */
@Service
public class StockMarketDataServiceImpl extends ServiceImpl<StockMarketDataMapper, StockMarketData> implements StockMarketDataService {

    @Override
    public StockMarketData getLatestMarketData(String stockCode) {
        LambdaQueryWrapper<StockMarketData> marketQuery = new LambdaQueryWrapper<>();
        marketQuery.eq(StockMarketData::getStockCode, stockCode)
                .orderByDesc(StockMarketData::getMarketDate)
                .orderByDesc(StockMarketData::getQuoteTime)
                .last("LIMIT 1");
        return getOne(marketQuery);
    }
}
