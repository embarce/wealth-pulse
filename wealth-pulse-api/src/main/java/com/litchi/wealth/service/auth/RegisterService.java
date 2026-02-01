package com.litchi.wealth.service.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.litchi.wealth.dto.auth.RegisterRequest;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.exception.ServiceException;
import com.litchi.wealth.service.UserService;
import com.litchi.wealth.utils.RedisCache;
import com.litchi.wealth.utils.RedissonLock;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.litchi.wealth.constant.Constants.*;

/**
 * @author Embrace
 * @version 1.0
 * @description: RegisterService
 * @date 2025/10/20 20:48
 */
@Service
@Slf4j
public class RegisterService {


    @Autowired
    private UserService userService;

    @Autowired
    private RedisCache redisCache;

    @Autowired
    private RedissonLock redissonLock;


    private static final String PASSWORD_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$";


    @Transactional(rollbackFor = Exception.class)
    public boolean register(RegisterRequest registerRequest) {
        String email = registerRequest.getEmail();
        log.info("try to register:{}", email);
        //验证密码规则
        String password = registerRequest.getPassword();
        if (!password.matches(PASSWORD_REGEX)) {
            log.error("password not match regex:{}", password);
            throw new ServiceException("password not match regex", -3);
        }
        String lockKey = USER_REGISTER_KEY.formatted(email);
        boolean locked = false;
        try {
            locked = redissonLock.tryLock(lockKey);
            if (locked) {
                LambdaQueryWrapper<User> queryWrapper = new LambdaQueryWrapper<>();
                queryWrapper.eq(User::getEmail, email);
                if (userService.exists(queryWrapper)) {
                    log.error("Email already exists: {}", email);
                    throw new ServiceException(-2, "Email already exists");
                }
                String code = registerRequest.getCode();
                String onceEmailCodeKey = ONCE_EMAIL_CODE_KEY.formatted(email);
                String cachedCode = redisCache.getCacheObject(onceEmailCodeKey);
                if (!cachedCode.equals(code)) {
                    log.error("username:{} code:{} not equals requestCode:{}", email, cachedCode, code);
                    throw new ServiceException("code not valid", -4);
                }
                BCryptPasswordEncoder bCryptPasswordEncoder = new BCryptPasswordEncoder();
                User user = User.builder()
                        .avatar("/cat.jpg")
                        .nickName(registerRequest.getNickName())
                        .email(registerRequest.getEmail())
                        .password(bCryptPasswordEncoder.encode(password))
                        .role(USER_ROLE)
                        .build();
                userService.saveUser(user);
                redisCache.deleteObject(onceEmailCodeKey);
            }
        } finally {
            if (locked) {
                redissonLock.unlock(lockKey);
            }
        }
        return true;
    }
}
