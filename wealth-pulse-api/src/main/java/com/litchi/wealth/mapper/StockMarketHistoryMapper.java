package com.litchi.wealth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.litchi.wealth.entity.StockMarketHistory;
import org.apache.ibatis.annotations.Mapper;

/**
* @description 股票历史行情表 Mapper 接口
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-05
*/
@Mapper
public interface StockMarketHistoryMapper extends BaseMapper<StockMarketHistory> {

}
