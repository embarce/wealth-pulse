package com.litchi.wealth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.litchi.wealth.entity.UserCapitalFlow;
import com.litchi.wealth.qo.TradePageQo;
import com.litchi.wealth.vo.CapitalFlowVo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
* @description 用户本金操作流水表 Mapper 接口
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-06
*/
@Mapper
public interface UserCapitalFlowMapper extends BaseMapper<UserCapitalFlow> {

    /**
     * 分页查询用户本金流水记录
     *
     * @param page 分页对象
     * @param userId 用户ID
     * @param query 查询条件
     * @return 本金流水记录分页结果
     */
    IPage<CapitalFlowVo> selectCapitalFlowPage(Page<CapitalFlowVo> page,
                                               @Param("userId") String userId,
                                               @Param("query") TradePageQo query);
}
