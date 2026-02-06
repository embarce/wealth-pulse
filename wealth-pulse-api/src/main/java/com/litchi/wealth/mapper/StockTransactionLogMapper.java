package com.litchi.wealth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.litchi.wealth.entity.StockTransactionLog;
import com.litchi.wealth.qo.TradePageQo;
import com.litchi.wealth.vo.TradeRecordVo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
* @description 股票交易流水表（记录买入和卖出操作） Mapper 接口
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-06
*/
@Mapper
public interface StockTransactionLogMapper extends BaseMapper<StockTransactionLog> {

    /**
     * 分页查询用户交易记录（关联股票信息）
     *
     * @param page 分页对象
     * @param userId 用户ID
     * @param query 查询条件
     * @return 交易记录分页结果
     */
    IPage<TradeRecordVo> selectTradeRecordPage(Page<TradeRecordVo> page,
                                                @Param("userId") String userId,
                                                @Param("query") TradePageQo query);
}
