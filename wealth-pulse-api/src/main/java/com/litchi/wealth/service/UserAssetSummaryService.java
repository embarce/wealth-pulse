package com.litchi.wealth.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.litchi.wealth.entity.UserAssetSummary;

/**
* @description 用户资产总览 服务类
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-05
*/
public interface UserAssetSummaryService extends IService<UserAssetSummary> {

    /**
     * 实时计算并更新用户资产数据（基于最新股价）
     * 会重新计算持仓市值、总资产，并回写数据库
     *
     * @param userId 用户ID
     * @return 更新后的用户资产数据
     */
    UserAssetSummary recalculateAssetsWithRealtimePrice(String userId);
}
