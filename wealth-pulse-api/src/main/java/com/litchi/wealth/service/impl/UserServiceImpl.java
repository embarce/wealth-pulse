package com.litchi.wealth.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.mapper.UserMapper;
import com.litchi.wealth.service.UserService;
import com.litchi.wealth.utils.SecurityUtils;
import com.litchi.wealth.vo.UserVo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * @author Embrace 01
 * @description litchi 用户表 服务实现类
 * @git: https://github.com/embarce
 * @date 2025-09-10
 */
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {


    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveUser(User user) {
        boolean save = save(user);
        return save;
    }

    @Override
    public UserVo getUserVo() {
        String userId = SecurityUtils.getUserId();
        User user = getById(userId);
        return UserVo.builder()
                .nickName(user.getNickName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .build();
    }
}
