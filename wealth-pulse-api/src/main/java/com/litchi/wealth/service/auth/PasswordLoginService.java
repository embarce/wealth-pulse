package com.litchi.wealth.service.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.litchi.wealth.dto.auth.ForgetPasswordRequest;
import com.litchi.wealth.dto.auth.PasswordLoginRequest;
import com.litchi.wealth.dto.auth.TokenDto;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.exception.ServiceException;
import com.litchi.wealth.service.TokenService;
import com.litchi.wealth.service.UserService;
import com.litchi.wealth.utils.RedisCache;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import static com.litchi.wealth.constant.Constants.*;

/**
 * @author Embrace
 * @version 1.0
 * @description: PasswordLoginService
 * @date 2025/10/19 21:42
 */
@Service
@Slf4j
public class PasswordLoginService {

    @Autowired
    private UserService userService;

    @Autowired
    private TokenService tokenService;

    @Resource
    private AuthenticationManager authenticationManager;

    @Autowired
    private RedisCache redisCache;


    public TokenDto passwordLogin(PasswordLoginRequest passwordLoginRequest) {
        String username = passwordLoginRequest.getEmail();
        String password = passwordLoginRequest.getPassword();
        log.info("try to login:{} by password login", username);

        String timesKey = USER_PASSWORD_ERROR_TIMES_KEY.formatted(username);

        // 检查并处理登录错误次数
        checkLoginAttempts(username, timesKey, passwordLoginRequest.getCode());

        User user = userService.getOne(new LambdaQueryWrapper<User>().eq(User::getEmail, username));
        if (user == null) {
            log.error("user not exist:{}", username);
            recordLoginFailure(username, timesKey);
        }

        // 用户验证
        Authentication authentication = null;
        try {
            // 该方法会去调用UserDetailsServiceImpl.loadUserByUsername
            authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        } catch (Exception e) {
            if (e instanceof BadCredentialsException) {
                log.error("password or username not valid:{}", username);
                recordLoginFailure(username, timesKey);
            }
            throw e;
        }

        User loginUser = (User) authentication.getPrincipal();
        // 清理缓存数据
        cleanupLoginData(username, timesKey);
        // 生成token
        return tokenService.createToken(loginUser);
    }

    /**
     * 检查登录尝试次数
     */
    private void checkLoginAttempts(String username, String timesKey, String code) {
        if (redisCache.hasKey(timesKey)) {
            int times = redisCache.getCacheObject(timesKey);
            // 大于6次 暂停登录
            if (times > 6) {
                log.error("password error times exceed limit:{}", username);
                throw new ServiceException("password error times exceed limit", -2);
            }
        }
    }

    /**
     * 记录登录失败
     */
    private void recordLoginFailure(String username, String timesKey) {
        Long increment = redisCache.increment(timesKey);
        if (increment > 6) {
            log.error("password error times exceed limit:{}", username);
            throw new ServiceException("password error times exceed limit", -2);
        }
        throw new ServiceException("password or username not valid", -1);
    }

    /**
     * 清理登录相关缓存数据
     */
    private void cleanupLoginData(String username, String timesKey) {
        // 删除错误次数
        redisCache.deleteObject(timesKey);
        // 删除可能存在的验证码
        String onceEmailCodeKey = ONCE_EMAIL_CODE_KEY.formatted(username);
        redisCache.deleteObject(onceEmailCodeKey);
    }


    /**
     * 忘记密码
     * @param forgetPasswordRequest
     * @return
     */
    public boolean forgetPassword(ForgetPasswordRequest forgetPasswordRequest) {
        String username = forgetPasswordRequest.getEmail();
        String code = forgetPasswordRequest.getCode();
        String onceEmailCodeKey = ONCE_EMAIL_CODE_KEY.formatted(username);
        String cachedCode = redisCache.getCacheObject(onceEmailCodeKey);
        if (!cachedCode.equals(code)) {
            log.error("username:{} code:{} not equals requestCode:{}", username, cachedCode, code);
            throw new ServiceException("code not valid", -4);
        } else {
            redisCache.deleteObject(onceEmailCodeKey);
        }
        BCryptPasswordEncoder bCryptPasswordEncoder = new BCryptPasswordEncoder();
        return userService.update(new LambdaUpdateWrapper<User>().set(User::getPassword, bCryptPasswordEncoder.encode(forgetPasswordRequest.getPassword())).eq(User::getEmail, username));
    }


    @PostConstruct
    public void init() {
        String admin = "729374717@qq.com";
        String password = "13602449816";
        User user = userService.getOne(new LambdaQueryWrapper<User>().eq(User::getEmail, admin));
        if (user == null) {
            BCryptPasswordEncoder bCryptPasswordEncoder = new BCryptPasswordEncoder();
            log.info("try to init admin:{}", admin);
            User adminUser = User.builder()
                    .email(admin)
                    .nickName("admin")
                    .avatar("https://www.embracechw.top/img/embraceqaq_avatar.png")
                    .password(bCryptPasswordEncoder.encode(password))
                    .role(USER_ROLE)
                    .build();
            userService.saveUser(adminUser);
        }
    }
}
