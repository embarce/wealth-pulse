package com.litchi.wealth.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.litchi.wealth.entity.User;
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

}
