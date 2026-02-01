package com.litchi.wealth.service.auth;

import cn.hutool.core.util.RandomUtil;
import com.litchi.wealth.utils.EmailUtils;
import com.litchi.wealth.utils.RedisCache;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static com.litchi.wealth.constant.Constants.*;

/**
 * @author Embrace
 * @version 1.0
 * @description: OneTimePasswordService
 * @date 2025/10/19 22:33
 */
@Service
@Slf4j
public class OneTimePasswordService {

    @Autowired
    private RedisCache redisCache;

    @Autowired
    private EmailUtils emailUtils;


    public boolean sendOneTimePassword(String email) {
        String limitKey = SEND_EMAIL_LIMIT_KEY.formatted(email);
        if (redisCache.hasKey(limitKey)) {
            log.info("用户 {} 尝试在 1 分钟内 多次发送验证码", email);
            return false;
        }
        String randomNumber = RandomUtil.randomNumbers(6);
        String otpKey = ONCE_EMAIL_CODE_KEY.formatted(email);
        redisCache.setCacheObject(limitKey, email, 1, TimeUnit.MINUTES);
        redisCache.setCacheObject(otpKey, randomNumber, 5, TimeUnit.MINUTES);
        Map<String, String> map = new LinkedHashMap<>();
        map.put("{{verificationCode}}", randomNumber);
        try {
            // 判断是否为中文
            Locale locale = LocaleContextHolder.getLocale();
            if (locale.getLanguage().equals(Locale.CHINESE.getLanguage())) {
                map.put("{{expirationTime}}", "5分钟内");
                emailUtils.sendEmailByResend(email, "[Litchi AI · 荔影智能] 一次性验证码", "verification_code_template", map);
            } else {
                map.put("{{expirationTime}}", "within 5 minutes");
                emailUtils.sendEmailByResend(email, "[Litchi AI · Liying Tech] Verification Code", "verification_code_template_eng", map);
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return true;
    }
}
