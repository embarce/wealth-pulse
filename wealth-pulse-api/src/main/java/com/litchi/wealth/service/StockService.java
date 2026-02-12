package com.litchi.wealth.service;

import com.litchi.wealth.dto.trade.FeeCalculationRequest;
import com.litchi.wealth.vo.FeeCalculationVo;
import com.litchi.wealth.vo.StockHistoryVo;
import com.litchi.wealth.vo.StockInfoVo;
import com.litchi.wealth.vo.StockMarketDataVo;

import java.util.Date;
import java.util.List;

/**
 * 股票服务接口
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供股票信息查询的业务逻辑
 * @date 2026/2/12
 */
public interface StockService {

    /**
     * 获取热榜股票（按成交额排序）
     *
     * @param limit 返回数量限制
     * @return 热门股票列表
     */
    List<StockMarketDataVo> getHotStocks(Integer limit);

    /**
     * 获取股票实时行情
     *
     * @param stockCode 股票代码
     * @return 股票实时行情数据
     */
    StockMarketDataVo getMarketData(String stockCode);

    /**
     * 获取股票基本信息
     *
     * @param stockCode 股票代码
     * @return 股票基本信息
     */
    StockInfoVo getStockInfo(String stockCode);

    /**
     * 获取股票历史数据
     *
     * @param stockCode 股票代码
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @param limit 返回数量限制
     * @return 历史行情数据列表
     */
    List<StockHistoryVo> getStockHistory(String stockCode, Date startDate, Date endDate, Integer limit);

    /**
     * 计算手续费
     *
     * @param request 手续费计算请求
     * @return 手续费计算结果
     */
    FeeCalculationVo calculateFee(FeeCalculationRequest request);
}
