package com.litchi.wealth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.litchi.wealth.entity.User;
import org.apache.ibatis.annotations.Mapper;

/**
* @description litchi 用户表 Mapper 接口
* @author Embrace 01
* @git: https://github.com/embarce
* @date 2025-09-10
*/
@Mapper
public interface UserMapper extends BaseMapper<User> {

}
