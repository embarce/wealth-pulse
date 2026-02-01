package com.litchi.wealth.utils;

import cn.hutool.core.util.RandomUtil;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.exception.UnAuthException;
import org.apache.commons.lang3.StringUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 安全服务工具类
 *
 * @author Embrace
 */
public class SecurityUtils {
    /**
     * 用户ID
     **/
    public static String getUserId() {
        try {
            return getLoginUser().getUserId();
        } catch (Exception e) {
            throw new UnAuthException();
        }
    }

    /**
     * 获取用户账户
     **/
    public static String getUsername() {
        try {
            return getLoginUser().getUsername();
        } catch (Exception e) {
            throw new UnAuthException();
        }
    }

    /**
     * 获取用户
     **/
    public static User getLoginUser() {
        try {
            return (User) getAuthentication().getPrincipal();
        } catch (Exception e) {
            throw new UnAuthException();
        }
    }

    /**
     * 获取Authentication
     */
    public static Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    /**
     * 是否登录
     *
     * @return boolean
     * @author Embrace
     * @date 2023/3/19 23:47
     */
    public static boolean isLogin() {
        try {
            String userId = getUserId();
            return StringUtils.isNotBlank(userId);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 生成BCryptPasswordEncoder密码
     *
     * @param password 密码
     * @return 加密字符串
     */
    public static String encryptPassword(String password) {
        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        return passwordEncoder.encode(password);
    }

    /**
     * 判断密码是否相同
     *
     * @param rawPassword     真实密码
     * @param encodedPassword 加密后字符
     * @return 结果
     */
    public static boolean matchesPassword(String rawPassword, String encodedPassword) {
        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }


    /**
     * 检查密码强度
     *
     * @param password
     * @return
     */
    public static boolean isValidPassword(String password) {
        // 使用正则表达式来匹配密码格式
        String regex = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d!@#$%^&*?]{8,}$";
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(password);
        return matcher.matches();
    }

    public static String randomPassword() {
        String number = RandomUtil.randomString("0123456789", 6);
        String upper = RandomUtil.randomString(4);
        String specialChars = RandomUtil.randomString("!@#$%^&*", 2);
        String resultSb = number + upper + specialChars;
        String[] split = resultSb.split("");
        List<String> strings = Arrays.asList(split);
        Collections.shuffle(strings);
        StringBuilder stringBuilder = new StringBuilder(strings.size());
        strings.forEach(stringBuilder::append);
        return stringBuilder.toString();
    }

}
