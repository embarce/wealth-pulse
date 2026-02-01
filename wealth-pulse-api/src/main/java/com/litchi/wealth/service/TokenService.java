package com.litchi.wealth.service;

import cn.hutool.core.util.IdUtil;
import com.litchi.wealth.constant.Constants;
import com.litchi.wealth.dto.auth.TokenDto;
import com.litchi.wealth.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * token验证处理
 *
 * @author Embrace
 */
@Component
@Slf4j
public class TokenService {
    /**
     * 令牌自定义标识
     */
    @Value("${token.header}")
    private String header;

    /**
     * 令牌秘钥
     */
    @Value("${token.secret}")
    private String secret;

    /**
     * 令牌有效期（默认30分钟）
     */
    @Value("${token.accessExpireTime}")
    private int accessTokenExpireTime;


    protected static final long MILLIS_SECOND = 1000;

    protected static final long MILLIS_MINUTE = 60 * MILLIS_SECOND;

    private static final Long MILLIS_MINUTE_TEN = 20 * 60 * 1000L;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * 获取用户身份信息
     *
     * @return 用户信息
     */
    public User getLoginUser(HttpServletRequest request) {
        /**
         * 获取请求携带的令牌
         */
        String token = getToken(request);
        if (StringUtils.isNotEmpty(token)) {
            try {
                Claims claims = parseToken(token);
                // 解析对应的权限以及用户信息
                String uuid = (String) claims.get(Constants.LOGIN_USER_KEY);
                String userId = uuid.split("-")[0];
                String uToken = uuid.split("-")[1];
                String userKey = getTokenKey(userId);
                User user = (User) redisTemplate.opsForValue().get(userKey);
                if (user == null) {
                    return null;
                }
                String userToken = user.getToken();
                if (userToken.equals(uToken)) {
                    return user;
                } else {
                    return null;
                }
            } catch (Exception e) {
                log.error("get login user error:", e);
            }
        }
        return null;
    }


    /**
     * 设置用户身份信息
     */
    public void setLoginUser(User loginUser) {
        if (loginUser != null && StringUtils.isNotEmpty(loginUser.getToken())) {
            refreshToken(loginUser);
        }
    }

    /**
     * 删除用户身份信息
     */
    public void delLoginUser(String userId) {
        if (StringUtils.isNotEmpty(userId)) {
            String userKey = getTokenKey(userId);
            redisTemplate.delete(userKey);
        }
    }

    /**
     * 创建令牌
     *
     * @param loginUser 用户信息
     * @return 令牌
     */
    public TokenDto createToken(User loginUser) {
        String token = IdUtil.simpleUUID();
        loginUser.setToken(token);
        String userKey = getTokenKey(loginUser.getUserId());

        loginUser.setExpireTime(System.currentTimeMillis() + accessTokenExpireTime * MILLIS_MINUTE);

        redisTemplate.opsForValue().set(userKey, loginUser, accessTokenExpireTime, TimeUnit.MINUTES);

        Map<String, Object> claims = new HashMap<>();
        claims.put(Constants.LOGIN_USER_KEY, loginUser.getUserId() + "-" + token);

        String accessToken = createToken(claims);

        TokenDto tokenDto = new TokenDto();
        tokenDto.setAccessToken(accessToken);
        return tokenDto;
    }

    /**
     * 验证令牌有效期，相差不足20分钟，自动刷新缓存
     *
     * @param loginUser
     * @return 令牌
     */
    public void verifyToken(User loginUser) {
        long expireTime = loginUser.getExpireTime();
        long currentTime = System.currentTimeMillis();
        if (expireTime - currentTime <= MILLIS_MINUTE_TEN) {
            refreshToken(loginUser);
        }
    }

    /**
     * 刷新令牌有效期
     *
     * @param loginUser 登录信息
     */
    public void refreshToken(User loginUser) {
        // 根据uuid将loginUser缓存
        String userKey = getTokenKey(loginUser.getUserId());
        loginUser.setExpireTime(System.currentTimeMillis() + accessTokenExpireTime * MILLIS_MINUTE);
        redisTemplate.opsForValue().set(userKey, loginUser, accessTokenExpireTime, TimeUnit.MINUTES);
    }


    /**
     * 从数据声明生成令牌
     *
     * @param claims 数据声明
     * @return 令牌
     */
    public String createToken(Map<String, Object> claims) {
        return Jwts.builder()
                .header()
                .add("typ", "JWT")
                .add("alg", "HS512")
                .and()
                .claims(claims)
                .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
                .compact();
    }


    /**
     * 从令牌中获取数据声明
     *
     * @param token 令牌
     * @return 数据声明
     */
    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(secret.getBytes()))
                .build()
                .parseSignedClaims(token).getPayload();
    }


    /**
     * 从令牌中获取用户名
     *
     * @param token 令牌
     * @return 用户名
     */
    public String getUsernameFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.getSubject();
    }

    /**
     * 获取请求token
     *
     * @param request
     * @return token
     */
    private String getToken(HttpServletRequest request) {
        String token = request.getHeader(header);
        if (StringUtils.isNotEmpty(token) && token.startsWith(Constants.TOKEN_PREFIX)) {
            token = token.replace(Constants.TOKEN_PREFIX, "");
        }
        return token;
    }


    private String getTokenKey(String uuid) {
        return Constants.LOGIN_TOKEN_KEY + uuid;
    }
}
