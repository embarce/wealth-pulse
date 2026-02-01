package com.litchi.wealth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;
import org.apache.commons.lang3.StringUtils;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serializable;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/**
 * @author Embrace 01
 * @description litchi 用户表
 * @git: https://github.com/embarce
 * @date 2025-09-10
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tb_user")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity implements UserDetails, Serializable {


    /**
     * 用户ID
     */
    @TableId(value = "user_id", type = IdType.ASSIGN_ID)
    private String userId;

    /**
     * 用户昵称
     */
    @TableField("nick_name")
    private String nickName;

    /**
     * 邮箱
     */
    @TableField("email")
    private String email;

    /**
     * 头像地址
     */
    @TableField("avatar")
    private String avatar;

    /**
     * 密码
     */
    @TableField("password")
    private String password;

    /**
     * 帐号状态（0正常 1停用）
     */
    @TableField("status")
    private String status;

    /**
     * 删除标志（0代表存在 2代表删除）
     */
    @TableField("del_flag")
    private String delFlag;

    /**
     * 角色
     */
    @TableField("role")
    private String role;

    /**
     * google 唯一标识
     */
    @TableField("google_id")
    private String googleId;

    /**
     * 微软唯一标识
     */
    @TableField("microsoft_id")
    private String microsoftId;


    /**
     * token
     */
    @TableField(exist = false)
    private String token;

    /**
     * 过期时间
     */
    @TableField(exist = false)
    private Long expireTime;


    @Override
    @JsonIgnore
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (StringUtils.isNotBlank(this.role)) {
            String[] split = this.role.split(",");
            Set<SimpleGrantedAuthority> roleSet = new HashSet<>();
            for (String s : split) {
                roleSet.add(new SimpleGrantedAuthority(s));
            }
            return roleSet;
        }
        return null;
    }

    @Override
    @JsonIgnore
    public String getUsername() {
        return this.userId;
    }

    @Override
    @JsonIgnore
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    @JsonIgnore
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    @JsonIgnore
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    @JsonIgnore
    public boolean isEnabled() {
        return this.status.equals("0");
    }
}
