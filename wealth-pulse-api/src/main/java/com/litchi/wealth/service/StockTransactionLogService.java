package com.litchi.wealth.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.litchi.wealth.dto.trade.StockTradeRequest;
import com.litchi.wealth.entity.StockTransactionLog;
import com.litchi.wealth.qo.TradePageQo;
import com.litchi.wealth.vo.TradeRecordVo;
import com.litchi.wealth.vo.TradeStatisticsVo;

import java.util.Date;

/**
* @description 股票交易流水表（记录买入和卖出操作） 服务类
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-06
*/
public interface StockTransactionLogService extends IService<StockTransactionLog> {

    /**
     * 分页查询用户交易记录
     *
     * @param userId 用户ID
     * @param query 查询条件
     * @return 交易记录分页结果
     */
    IPage<TradeRecordVo> getTradeRecordPage(String userId, TradePageQo query);

    /**
     * 买入股票
     *
     * @param userId 用户ID
     * @param request 买入请求
     */
    void buyStock(String userId, StockTradeRequest request);

    /**
     * 卖出股票
     *
     * @param userId 用户ID
     * @param request 卖出请求
     */
    void sellStock(String userId, StockTradeRequest request);

    /**
     * 结算当日交易（将未结算的交易标记为已结算）
     * 结算后购买力重置为可用现金
     *
     * @param userId 用户ID
     * @param date 结算日期
     * @return 结算的交易数量
     */
    int settleTransactions(String userId, Date date);

    /**
     * 获取近一个月的交易统计数据
     *
     * @param userId 用户ID
     * @return 交易统计数据
     */
    TradeStatisticsVo getTradeStatistics(String userId);
}
