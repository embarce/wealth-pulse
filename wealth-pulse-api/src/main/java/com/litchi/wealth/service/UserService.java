package com.litchi.wealth.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.litchi.wealth.dto.UserConfigDto;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.vo.AssetDashboardVo;
import com.litchi.wealth.vo.PositionDashboardVo;
import com.litchi.wealth.vo.UserConfigVo;
import com.litchi.wealth.vo.UserVo;

/**
 * @description litchi 用户表 服务类
 * @author Embrace 01
 * @git: https://github.com/embarce
 * @date 2025-09-10
 */
public interface UserService extends IService<User> {


    /**
     * 保存用户
     * @param user
     * @return
     */
    boolean saveUser(User user);



    /**
     * 获取用户信息
     * @return
     */
    UserVo getUserVo();

    /**
     * 获取资产总览
     * @return
     */
    AssetDashboardVo getAssetDashboard();

    /**
     * 获取仓位总览
     * @return
     */
    PositionDashboardVo getPositionDashboard();

    /**
     * 获取用户配置
     * @return 用户配置 VO
     */
    UserConfigVo getUserConfig();

    /**
     * 保存用户配置
     * @param dto 用户配置 DTO
     * @return 是否保存成功
     */
    boolean saveUserConfig(UserConfigDto dto);

}
