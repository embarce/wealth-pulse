package com.litchi.wealth.service.auth;

import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.litchi.wealth.dto.auth.GoogleLoginRequest;
import com.litchi.wealth.dto.auth.TokenDto;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.service.TokenService;
import com.litchi.wealth.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

import static cn.hutool.core.util.RandomUtil.BASE_CHAR_NUMBER;
import static cn.hutool.core.util.RandomUtil.BASE_NUMBER;
import static com.litchi.wealth.constant.Constants.USER_ROLE;

/**
 * @author Embrace
 * @version 1.0
 * @description: GoogleLoginService
 * @date 2025/9/12 22:05
 */
@Service
@Slf4j
public class GoogleLoginService {

    @Value("${google.auth.clientId}")
    private String clientId;

    @Value("${google.auth.clientSecret}")
    private String clientSecret;

    @Value("${google.auth.redirectUri}")
    private String redirectUri;

    @Autowired
    private UserService userService;

    @Autowired
    private TokenService tokenService;


    /**
     * Google登录
     *
     * @param googleLoginRequest
     * @return
     */
    @Transactional(rollbackFor = Exception.class)
    public TokenDto googleLogin(GoogleLoginRequest googleLoginRequest) {
        // 这里的 getAuthorizationCode 实际上拿到的可能是前端传来的 credential (JWT)
        String idTokenString = googleLoginRequest.getAuthorizationCode();
        log.info("Try to verify Google ID Token");

        // 1. 直接验证前端传来的 ID Token (JWT)，跳过请求 Google 换取 token 的步骤
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        ).setAudience(Collections.singletonList(clientId)).build();

        GoogleIdToken idToken = null;
        try {
            // 直接校验 JWT
            idToken = verifier.verify(idTokenString);
        } catch (Exception e) {
            log.error("Verify id token error:", e);
            throw new RuntimeException("Invalid ID token.");
        }

        if (idToken != null) {
            GoogleIdToken.Payload payload = idToken.getPayload();
            String userId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");

            // 2. 查找/创建用户并生成你自己的 Token
            User user = autoRegisterOrLogin(userId, email, name, pictureUrl);
            return tokenService.createToken(user);
        } else {
            throw new RuntimeException("Invalid ID token.");
        }
    }


    public User autoRegisterOrLogin(String userId, String email, String name, String pictureUrl) {
        LambdaQueryWrapper<User> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(User::getGoogleId, userId);
        User user = userService.getOne(queryWrapper);
        if (user == null) {
            queryWrapper.clear();
            queryWrapper.eq(User::getEmail, email);
            user = userService.getOne(queryWrapper);
            if (user == null) {
                BCryptPasswordEncoder bCryptPasswordEncoder = new BCryptPasswordEncoder();
                String chars = BASE_NUMBER + BASE_CHAR_NUMBER;
                String password = RandomUtil.randomString(chars, 12);
                user = User.builder()
                        .googleId(userId)
                        .nickName(name)
                        .email(email)
                        .avatar(pictureUrl)
                        .role(USER_ROLE)
                        .password(bCryptPasswordEncoder.encode(password))
                        .build();
                userService.saveUser(user);
            } else {
                user.setGoogleId(userId);
                user.setNickName(name);
                user.setAvatar(pictureUrl);
                userService.updateById(user);
            }
        }
        return user;
    }


}
