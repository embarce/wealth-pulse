package com.litchi.wealth.config;

import cn.hutool.core.util.ObjectUtil;
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.litchi.wealth.entity.BaseEntity;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.utils.SecurityUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.ibatis.reflection.MetaObject;

import java.util.Date;

/**
 * MP注入处理器
 *
 * @author Lion Li
 * @date 2021/4/25
 */
public class CreateAndUpdateMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        if (ObjectUtil.isNotNull(metaObject) && metaObject.getOriginalObject() instanceof BaseEntity) {
            BaseEntity baseEntity = (BaseEntity) metaObject.getOriginalObject();
            Date current = ObjectUtil.isNotNull(baseEntity.getCreateTime()) ? baseEntity.getCreateTime() : new Date();
            baseEntity.setCreateTime(current);
            baseEntity.setUpdateTime(current);
            String username = null;
            try {
                username = getLoginUsername();
                if (StringUtils.isBlank(username)) {
                    username = "System";
                }
            } catch (Exception e) {
                username = "System";
            }
            // 当前已登录 且 创建人为空 则填充
            baseEntity.setCreateBy(username);
            // 当前已登录 且 更新人为空 则填充
            baseEntity.setUpdateBy(username);
        }
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        if (ObjectUtil.isNotNull(metaObject) && metaObject.getOriginalObject() instanceof BaseEntity) {
            BaseEntity baseEntity = (BaseEntity) metaObject.getOriginalObject();
            Date current = new Date();
            // 更新时间填充(不管为不为空)
            baseEntity.setUpdateTime(current);
            String username = null;
            try {
                username = getLoginUsername();
                if (StringUtils.isBlank(username)) {
                    username = "System";
                }
            } catch (Exception e) {
                username = "System";
            }
            // 当前已登录 且 更新人为空 则填充
            baseEntity.setUpdateBy(username);
        }
    }


    /**
     * 获取登录用户名
     */
    private String getLoginUsername() {
        User loginUser;
        try {
            loginUser = SecurityUtils.getLoginUser();
        } catch (Exception e) {
            return null;
        }
        return loginUser.getUsername();
    }
}
