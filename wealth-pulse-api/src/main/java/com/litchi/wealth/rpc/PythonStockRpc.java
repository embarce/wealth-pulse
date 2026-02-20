package com.litchi.wealth.rpc;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.litchi.wealth.dto.rpc.CreateAccessTokenDto;
import com.litchi.wealth.exception.ServiceException;
import com.litchi.wealth.utils.RedisCache;
import com.litchi.wealth.vo.rpc.HkStockCompanyProfileVo;
import com.litchi.wealth.vo.rpc.HkStockEnhancedHistoryVo;
import com.litchi.wealth.vo.rpc.HkStockFinancialIndicatorVo;
import com.litchi.wealth.vo.rpc.HkStockMinuteHistoryVo;
import com.litchi.wealth.vo.rpc.HkStockSecurityProfileVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
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
     * 获取港股证券资料
     *
     * @param stockCode 股票代码，如 03900.HK
     * @return 证券资料
     */
    @Cacheable(value = "getSecurityProfile", key = "#stockCode")
    public HkStockSecurityProfileVo getSecurityProfile(String stockCode) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/stocks/" + stockCode + "/security-profile";
        log.info("调用Python API获取证券资料: stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API返回: {}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockSecurityProfileVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取证券资料失败: code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取证券资料失败");
        }
    }

    /**
     * 获取港股公司资料
     *
     * @param stockCode 股票代码，如 03900.HK
     * @return 公司资料
     */
    @Cacheable(value = "getCompanyProfile", key = "#stockCode")
    public HkStockCompanyProfileVo getCompanyProfile(String stockCode) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/stocks/" + stockCode + "/company-profile";
        log.info("调用Python API获取公司资料: stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API返回: {}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockCompanyProfileVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取公司资料失败: code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取公司资料失败");
        }
    }

    /**
     * 获取港股财务指标
     *
     * @param stockCode 股票代码，如 03900.HK
     * @return 财务指标
     */
    @Cacheable(value = "getFinancialIndicator", key = "#stockCode")
    public HkStockFinancialIndicatorVo getFinancialIndicator(String stockCode) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/stocks/" + stockCode + "/financial-indicator";
        log.info("调用Python API获取财务指标: stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API返回: {}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockFinancialIndicatorVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取财务指标失败: code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取财务指标失败");
        }
    }

    /**
     * 获取港股增强历史数据（K线图数据）
     *
     * @param stockCode 股票代码，如 03900.HK
     * @param period 周期类型: daily/weekly/monthly
     * @param adjust 复权类型: 空字符串=不复权, qfq=前复权, hfq=后复权
     * @param startDate 开始日期，可为null
     * @param endDate 结束日期，可为null
     * @return K线图数据列表
     */
    @Cacheable(value = "getEnhancedHistory", key = "#stockCode + #period + #adjust + #startDate + #endDate")
    public List<HkStockEnhancedHistoryVo> getEnhancedHistory(String stockCode, String period,
                                                             String adjust, LocalDate startDate, LocalDate endDate) {
        String token = createAccessToken();

        // 构建URL和查询参数
        StringBuilder urlBuilder = new StringBuilder(pythonApiUrl)
                .append("/api/stocks/")
                .append(stockCode)
                .append("/enhanced-history?period=")
                .append(period);

        if (StrUtil.isNotBlank(adjust)) {
            urlBuilder.append("&adjust=").append(adjust);
        }
        if (startDate != null) {
            urlBuilder.append("&start_date=").append(startDate);
        }
        if (endDate != null) {
            urlBuilder.append("&end_date=").append(endDate);
        }

        String url = urlBuilder.toString();
        log.info("调用Python API获取增强历史数据: stockCode={}, period={}, url={}", stockCode, period, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API返回: {}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, HkStockEnhancedHistoryVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取增强历史数据失败: code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取增强历史数据失败");
        }
    }

    /**
     * 获取港股分钟级历史数据（分时图数据）
     *
     * @param stockCode 股票代码，如 03900.HK
     * @param period 周期: 1/5/15/30/60 (分钟)
     * @param adjust 复权类型: 空字符串=不复权, hfq=后复权
     * @param startDate 开始日期时间，可为null
     * @param endDate 结束日期时间，可为null
     * @return 分时图数据列表
     */
    @Cacheable(value = "getMinuteHistory", key = "#stockCode + #period + #adjust + #startDate + #endDate")
    public List<HkStockMinuteHistoryVo> getMinuteHistory(String stockCode, String period,
                                                         String adjust, String startDate, String endDate) {
        String token = createAccessToken();

        // 构建URL和查询参数
        StringBuilder urlBuilder = new StringBuilder(pythonApiUrl)
                .append("/api/stocks/")
                .append(stockCode)
                .append("/minute-history?period=")
                .append(period);

        if (StrUtil.isNotBlank(adjust)) {
            urlBuilder.append("&adjust=").append(adjust);
        }
        if (StrUtil.isNotBlank(startDate)) {
            urlBuilder.append("&start_date=").append(startDate);
        }
        if (StrUtil.isNotBlank(endDate)) {
            urlBuilder.append("&end_date=").append(endDate);
        }

        String url = urlBuilder.toString();
        log.info("调用Python API获取分钟级历史数据: stockCode={}, period={}, url={}", stockCode, period, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API返回: {}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, HkStockMinuteHistoryVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取分钟级历史数据失败: code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取分钟级历史数据失败");
        }
    }

}
