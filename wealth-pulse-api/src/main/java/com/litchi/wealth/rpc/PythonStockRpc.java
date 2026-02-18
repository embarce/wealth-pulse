package com.litchi.wealth.rpc;

import cn.hutool.http.HttpRequest;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.litchi.wealth.dto.rpc.CreateAccessTokenDto;
import com.litchi.wealth.exception.ServiceException;
import com.litchi.wealth.utils.RedisCache;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

import static com.litchi.wealth.constant.Constants.PYTHON_RPC_TOKEN;

/**
 * @author Embrace
 * @version 1.0
 * @description: PythonStockRpc
 * @date 2026/2/18 0:13
 */
@Slf4j
@Service
public class PythonStockRpc {

    @Value("${rpc.python.url}")
    private String pythonApiUrl;

    @Value("${rpc.python.clientId}")
    private String clientId;

    @Value("${rpc.python.clientSecret}")
    private String clientSecret;

    @Autowired
    private RedisCache redisCache;


    /**
     * create_access_token
     *
     * @return
     */
    public String createAccessToken() {
        if (redisCache.hasKey(PYTHON_RPC_TOKEN)) {
            return redisCache.getCacheObject(PYTHON_RPC_TOKEN);
        }
        /**
         * curl -X POST http://localhost:8000/api/auth/token \
         *   -H "Content-Type: application/json" \
         *   -d '{
         *     "client_id": "wealth-pulse-java",
         *     "client_secret": "wealth-pulse-client-secret"
         *   }'
         * Response:
         *
         * {
         *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
         *   "token_type": "bearer",
         *   "expires_in": 86400
         * }
         */
        CreateAccessTokenDto createAccessTokenDto = CreateAccessTokenDto.builder().client_secret(clientSecret).client_id(clientId).build();
        String json = JSONUtil.toJsonStr(createAccessTokenDto);
        String resultStr = HttpRequest.post(pythonApiUrl + "/api/auth/token")
                .body(json)
                .execute().body();
        log.info("获取token结果：{}", resultStr);
        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            String accessToken = data.getStr("access_token");
            redisCache.setCacheObject(PYTHON_RPC_TOKEN, accessToken, 80400, TimeUnit.SECONDS);
            return accessToken;
        } else {
            log.error("获取token失败：{}", result);
            throw new ServiceException("获取token失败");
        }
    }

    /**
     * todo api list
     */

}
