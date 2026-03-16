package com.litchi.wealth.rpc;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.litchi.wealth.constant.Constants;
import com.litchi.wealth.dto.rpc.WechatDraftAddRequest;
import com.litchi.wealth.dto.rpc.WechatFreePublishSubmitRequest;
import com.litchi.wealth.dto.rpc.WechatUploadMaterialRequest;
import com.litchi.wealth.exception.ServiceException;
import com.litchi.wealth.utils.RedisCache;
import com.litchi.wealth.vo.rpc.WechatDraftAddVo;
import com.litchi.wealth.vo.rpc.WechatFreePublishSubmitVo;
import com.litchi.wealth.vo.rpc.WechatUploadMaterialVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.concurrent.TimeUnit;

/**
 * 微信 RPC 接入服务
 * 参考文档：https://developers.weixin.qq.com/doc/subscription/api/base/api_getstableaccesstoken.html
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/03/15
 */
@Slf4j
@Service
public class WechatRpc {

    /**
     * 获取 stable_access_token 的 API 地址
     */
    private static final String GET_STABLE_ACCESS_TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/stable_token";

    /**
     * 新增草稿的 API 地址
     */
    private static final String DRAFT_ADD_URL = "https://api.weixin.qq.com/cgi-bin/draft/add";

    /**
     * 上传永久素材的 API 地址
     */
    private static final String UPLOAD_MATERIAL_URL = "https://api.weixin.qq.com/cgi-bin/material/add_material";

    /**
     * 发布草稿的 API 地址 /freepublish/submit?access_token=ACCESS_TOKEN
     * 云调用
     */
    private static final String FREE_PUBLISH_SUBMIT_URL = "https://api.weixin.qq.com/cgi-bin/freepublish/submit";

    @Value("${rpc.wechat.appId}")
    private String appId;

    @Value("${rpc.wechat.appSecret}")
    private String appSecret;

    @Autowired
    private RedisCache redisCache;

    /**
     * 获取微信 stable_access_token
     * 使用Redis缓存全局 accessToken，有效期 6000 秒
     *
     * @return stable_access_token
     */
    public String getStableAccessToken() {
        // 1. 先从 Redis 检查是否已有缓存的 token
        if (redisCache.hasKey(Constants.WECHAT_ACCESS_TOKEN_KEY)) {
            String cachedToken = redisCache.getCacheObject(Constants.WECHAT_ACCESS_TOKEN_KEY);
            log.debug("从 Redis 缓存获取微信 accessToken: {}", cachedToken);
            return cachedToken;
        }

        // 2. Redis 中没有，调用微信 API 获取新的 token
        return fetchAndCacheNewToken();
    }

    /**
     * 强制刷新微信 stable_access_token
     * 用于 token 失效或需要主动刷新的场景
     *
     * @return stable_access_token
     */
    public String refreshStableAccessToken() {
        // 删除旧 token
        redisCache.deleteObject(Constants.WECHAT_ACCESS_TOKEN_KEY);
        return fetchAndCacheNewToken();
    }

    /**
     * 获取并缓存新的 stable_access_token
     *
     * @return stable_access_token
     */
    private String fetchAndCacheNewToken() {
        log.info("开始调用微信 API 获取 stable_access_token，appId: {}", appId);

        // 构建请求参数
        JSONObject requestBody = new JSONObject();
        requestBody.set("grant_type", "client_credential");
        requestBody.set("appid", appId);
        requestBody.set("secret", appSecret);

        String json = JSONUtil.toJsonStr(requestBody);
        log.debug("请求参数：{}", json);

        // 发送 POST 请求
        String resultStr = HttpRequest.post(GET_STABLE_ACCESS_TOKEN_URL)
                .header("Content-Type", "application/json")
                .body(json)
                .execute()
                .body();

        log.info("微信 API 返回：{}", resultStr);

        // 解析响应
        JSONObject result = JSONUtil.parseObj(resultStr);

        // 检查是否返回错误码
        if (result.containsKey("errcode")) {
            Integer errCode = result.getInt("errcode");
            String errMsg = result.getStr("errmsg", "未知错误");
            log.error("获取微信 stable_access_token 失败：errcode={}, errmsg={}", errCode, errMsg);
            throw new ServiceException("获取微信 stable_access_token 失败：" + errMsg);
        }

        // 获取 access_token
        String accessToken = result.getStr("access_token");
        if (StrUtil.isBlank(accessToken)) {
            log.error("获取微信 stable_access_token 失败：返回数据中 access_token 为空");
            throw new ServiceException("获取微信 stable_access_token 失败：access_token 为空");
        }

        // 获取有效期（秒），默认为 7200 秒
        Integer expiresIn = result.getInt("expires_in", 7200);
        log.info("获取微信 stable_access_token 成功，expiresIn: {} 秒", expiresIn);

        // 缓存到 Redis，设置有效期为 6000 秒（略小于微信官方 7200 秒，预留缓冲时间）
        int cacheExpireTime = Math.min(expiresIn - 1200, 6000);
        redisCache.setCacheObject(Constants.WECHAT_ACCESS_TOKEN_KEY, accessToken, cacheExpireTime, TimeUnit.SECONDS);
        log.info("微信 stable_access_token 已缓存到 Redis，缓存有效期：{} 秒", cacheExpireTime);

        return accessToken;
    }

    /**
     * 新增草稿
     * 参考文档：https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html
     *
     * @param request 新增草稿请求
     * @return 新增草稿响应，包含 media_id 和 item 列表
     */
    public WechatDraftAddVo addDraft(WechatDraftAddRequest request) {
        log.info("开始调用微信 API 新增草稿，appId: {}", appId);

        // 获取 access_token
        String accessToken = getStableAccessToken();

        // 构建请求 URL
        String url = DRAFT_ADD_URL + "?access_token=" + accessToken;

        // 构建请求参数
        String json = JSONUtil.toJsonStr(request);
        log.info("新增草稿请求参数：{}", json);

        // 发送 POST 请求
        String resultStr = HttpRequest.post(url)
                .header("Content-Type", "application/json")
                .body(json)
                .execute()
                .body();

        log.info("微信 API 返回：{}", resultStr);

        // 解析响应
        JSONObject result = JSONUtil.parseObj(resultStr);

        // 检查是否返回错误码
        if (result.containsKey("errcode")) {
            Integer errCode = result.getInt("errcode");
            String errMsg = result.getStr("errmsg", "未知错误");
            log.error("新增草稿失败：errcode={}, errmsg={}", errCode, errMsg);

            // 构建响应对象
            WechatDraftAddVo vo = WechatDraftAddVo.builder()
                    .errcode(errCode)
                    .errmsg(errMsg)
                    .build();
            return vo;
        }

        // 获取 media_id
        String mediaId = result.getStr("media_id");
        log.info("新增草稿成功，mediaId: {}", mediaId);

        // 构建响应对象
        WechatDraftAddVo vo = WechatDraftAddVo.builder()
                .errcode(0)
                .errmsg("ok")
                .mediaId(mediaId)
                .build();
        return vo;
    }

    /**
     * 上传永久素材（仅支持图片）
     * 参考文档：https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_addmaterial.html
     *
     * @param request 上传素材请求（包含文件路径或字节数组）
     * @return 上传响应，包含 media_id 和 url
     */
    public WechatUploadMaterialVo uploadMaterial(WechatUploadMaterialRequest request) {
        log.info("开始调用微信 API 上传永久素材，appId: {}, fileName: {}", appId, request.getFileName());

        // 获取 access_token
        String accessToken = getStableAccessToken();

        // 构建请求 URL
        String url = UPLOAD_MATERIAL_URL + "?access_token=" + accessToken + "&type=image";

        // 上传文件
        HashMap<String, Object> paramMap = new HashMap<>();
        //文件上传只需将参数中的键指定（默认file），值设为文件对象即可，对于使用者来说，文件上传与普通表单提交并无区别
        paramMap.put("media", FileUtil.file(request.getFilePath()));

        String resultStr = HttpUtil.post(url, paramMap);

        log.info("微信 API 返回：{}", resultStr);

        // 解析响应
        JSONObject result = JSONUtil.parseObj(resultStr);

        // 检查是否返回错误码
        if (result.containsKey("errcode")) {
            Integer errCode = result.getInt("errcode");
            String errMsg = result.getStr("errmsg", "未知错误");
            log.error("上传永久素材失败：errcode={}, errmsg={}", errCode, errMsg);

            // 构建响应对象
            WechatUploadMaterialVo vo = WechatUploadMaterialVo.builder()
                    .errcode(errCode)
                    .errmsg(errMsg)
                    .build();
            return vo;
        }

        // 获取返回结果
        String mediaId = result.getStr("media_id");
        String fileUrl = result.getStr("url");

        log.info("上传永久素材成功，mediaId: {}, url: {}", mediaId, fileUrl);

        // 构建响应对象
        WechatUploadMaterialVo vo = WechatUploadMaterialVo.builder()
                .errcode(0)
                .errmsg("ok")
                .mediaId(mediaId)
                .url(fileUrl)
                .build();
        return vo;
    }

    /**
     * 发布草稿
     * 参考文档：https://developers.weixin.qq.com/doc/subscription/api/public/api_freepublish_submit.html
     *
     * @param request 发布草稿请求
     * @return 发布响应，包含 publish_id
     */
    public WechatFreePublishSubmitVo freePublishSubmit(WechatFreePublishSubmitRequest request) {
        log.info("开始调用微信 API 发布草稿，appId: {}, mediaId: {}", appId, request.getMediaId());

        // 获取 access_token
        String accessToken = getStableAccessToken();

        // 构建请求 URL
        String url = FREE_PUBLISH_SUBMIT_URL + "?access_token=" + accessToken;

        // 构建请求参数
        String json = JSONUtil.toJsonStr(request);
        log.info("发布草稿请求参数：{}", json);

        // 发送 POST 请求
        String resultStr = HttpRequest.post(url)
                .header("Content-Type", "application/json")
                .body(json)
                .execute()
                .body();

        log.info("微信 API 返回：{}", resultStr);

        // 解析响应
        JSONObject result = JSONUtil.parseObj(resultStr);

        // 检查是否返回错误码
        if (result.containsKey("errcode")) {
            Integer errCode = result.getInt("errcode");
            String errMsg = result.getStr("errmsg", "未知错误");
            log.error("发布草稿失败：errcode={}, errmsg={}", errCode, errMsg);

            // 构建响应对象
            WechatFreePublishSubmitVo vo = WechatFreePublishSubmitVo.builder()
                    .errcode(errCode)
                    .errmsg(errMsg)
                    .build();
            return vo;
        }

        // 获取 publish_id
        Long publishId = result.getLong("publish_id");
        log.info("发布草稿成功，publishId: {}", publishId);

        // 构建响应对象
        WechatFreePublishSubmitVo vo = WechatFreePublishSubmitVo.builder()
                .errcode(0)
                .errmsg("ok")
                .publishId(publishId)
                .build();
        return vo;
    }
}
