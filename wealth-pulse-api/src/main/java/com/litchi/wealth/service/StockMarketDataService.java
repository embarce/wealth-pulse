package com.litchi.wealth.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.litchi.wealth.entity.StockMarketData;

/**
* @description 股票行情数据表 服务类
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-05
*/
public interface StockMarketDataService extends IService<StockMarketData> {

    /**
     * 获取股票最新行情数据
     *
     * @param stockCode 股票代码
     * @return 最新行情数据
     */
    StockMarketData getLatestMarketData(String stockCode);
}
