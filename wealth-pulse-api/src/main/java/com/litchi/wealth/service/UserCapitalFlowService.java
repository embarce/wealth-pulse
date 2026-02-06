package com.litchi.wealth.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.litchi.wealth.dto.capital.CapitalOperationRequest;
import com.litchi.wealth.entity.UserCapitalFlow;
import com.litchi.wealth.qo.TradePageQo;
import com.litchi.wealth.vo.CapitalFlowVo;

/**
* @description 用户本金操作流水表 服务类
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-06
*/
public interface UserCapitalFlowService extends IService<UserCapitalFlow> {

    /**
     * 分页查询用户本金流水记录
     *
     * @param userId 用户ID
     * @param query 查询条件
     * @return 本金流水记录分页结果
     */
    IPage<CapitalFlowVo> getCapitalFlowPage(String userId, TradePageQo query);

    /**
     * 资金入金
     *
     * @param userId 用户ID
     * @param request 入金请求
     */
    void deposit(String userId, CapitalOperationRequest request);

    /**
     * 提取本金
     *
     * @param userId 用户ID
     * @param request 提取请求
     */
    void withdraw(String userId, CapitalOperationRequest request);
}
