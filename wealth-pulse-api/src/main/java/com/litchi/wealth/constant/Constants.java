package com.litchi.wealth.constant;

import io.jsonwebtoken.Claims;
import lombok.Data;

/**
 * 通用常量信息
 */
@Data
public class Constants {
    /**
     * UTF-8 字符集
     */
    public static final String UTF8 = "UTF-8";

    /**
     * GBK 字符集
     */
    public static final String GBK = "GBK";

    /**
     * http请求
     */
    public static final String HTTP = "http://";

    /**
     * https请求
     */
    public static final String HTTPS = "https://";

    /**
     * 通用成功标识
     */
    public static final String SUCCESS = "0";

    /**
     * 通用失败标识
     */
    public static final String FAIL = "1";

    /**
     * 登录成功
     */
    public static final String LOGIN_SUCCESS = "Success";

    /**
     * 注销
     */
    public static final String LOGOUT = "Logout";

    /**
     * 注册
     */
    public static final String REGISTER = "Register";

    /**
     * 登录失败
     */
    public static final String LOGIN_FAIL = "Error";

    /**
     * 验证码 redis key
     */
    public static final String CAPTCHA_CODE_KEY = "captcha_codes:";

    /**
     * 登录用户 redis key
     */
    public static final String LOGIN_TOKEN_KEY = "litchi:login_tokens:";

    /**
     * 防重提交 redis key
     */
    public static final String REPEAT_SUBMIT_KEY = "repeat_submit:";

    /**
     * 限流 redis key
     */
    public static final String RATE_LIMIT_KEY = "rate_limit:";

    /**
     * 验证码有效期（分钟）
     */
    public static final Integer CAPTCHA_EXPIRATION = 2;

    /**
     * 令牌
     */
    public static final String TOKEN = "token";

    /**
     * 令牌前缀
     */
    public static final String TOKEN_PREFIX = "Bearer ";

    /**
     * 令牌前缀
     */
    public static final String LOGIN_USER_KEY = "litchi:login_user_key";

    /**
     * 用户ID
     */
    public static final String JWT_USERID = "userid";

    /**
     * 用户名称
     */
    public static final String JWT_USERNAME = Claims.SUBJECT;

    /**
     * 用户头像
     */
    public static final String JWT_AVATAR = "avatar";

    /**
     * 创建时间
     */
    public static final String JWT_CREATED = "created";

    /**
     * 用户权限
     */
    public static final String JWT_AUTHORITIES = "authorities";


    /**
     * Cloudflare
     */
    public static final String CLOUDFLARE_IP = "CF-Connecting-IP";


    /**
     * Cloudflare
     */
    public static final String CLOUDFLARE_IP_COUNTRY = "CF-IPCountry";


    /**
     * 钱包锁
     */
    public static final String WALLET_LOCK_KEY = "litchi-mini-wallet-lock-%s";

    /**
     * 钱包缓存
     */
    public static final String WALLET_CACHE_KEY = "litchi-mini-wallet-cache::%s";


    /**
     * 用户角色
     */
    public static final String USER_ROLE = "USER";



    /**
     * 用户密码错误次数
     */
    public static final String USER_PASSWORD_ERROR_TIMES_KEY = "litchi-user-password-error-times::%s";


    /**
     * 一次性邮箱验证码
     */
    public static final String ONCE_EMAIL_CODE_KEY = "litchi-once-email-code::%s";


    /**
     * 用户邮箱验证码1分钟限制
     */
    public static final String SEND_EMAIL_LIMIT_KEY = "litchi-send-email-code::%s";



    /**
     * 用户注册限制
     */
    public static final String USER_REGISTER_KEY = "litchi-user-register::%s";


    /**
     * 图片处理任务
     */
    public static final String GENERATIONS_IMAGE_JOB_KEY = "generations_image_job::%s-%s";


    /**
     * 没有补偿的订单状态
     */
    public static final String NOT_COMPENSATE_STATUS = "0";

    /**
     * 补偿完成的订单状态
     */
    public static final String COMPENSATE_STATUS = "1";


    /**
     * 图片前缀
     */
    public static final String FOLDER_PATH = "image/";


    /**
     * 资产处理任务锁
     */
    public static final String USER_ASSET_JOB_LOCK_KEY = "asset_job_lock::%s";



    /**
     * python rpc token
     */
    public static final String PYTHON_RPC_TOKEN = "python_rpc_token";


    /**
     * Redis Key analysis 前缀
     */
    public static final String ANALYSIS_REDIS_KEY_PREFIX = "hkstock:market:analysis:";

    /**
     * 微信 AccessToken
     */
    public static final String WECHAT_ACCESS_TOKEN_KEY = "wechat:access_token";
}
