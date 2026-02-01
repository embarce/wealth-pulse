package com.litchi.wealth.security.handle;

import cn.hutool.json.JSONUtil;
import com.litchi.wealth.constant.HttpStatus;
import com.litchi.wealth.constant.Result;
import com.litchi.wealth.entity.User;
import com.litchi.wealth.service.TokenService;
import com.litchi.wealth.utils.ServletUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;

/**
 * 自定义退出处理类 返回成功
 *
 * @author Embrace
 */
@Configuration
public class LogoutSuccessHandlerImpl implements LogoutSuccessHandler {
    @Autowired
    private TokenService tokenService;

    /**
     * 退出处理
     *
     * @return
     */
    @Override
    public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        User loginUser = tokenService.getLoginUser(request);
        if (loginUser != null) {
            // 删除用户缓存记录
            tokenService.delLoginUser(loginUser.getUserId());
        }
        ServletUtils.renderString(response, JSONUtil.toJsonStr(Result.error(HttpStatus.SUCCESS, "退出成功")));
    }
}
