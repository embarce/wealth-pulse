package com.litchi.wealth.rpc;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.litchi.wealth.dto.rpc.CreateAccessTokenDto;
import com.litchi.wealth.dto.rpc.KlineAnalysisRequestDto;
import com.litchi.wealth.dto.rpc.PositionAnalysisRequestDto;
import com.litchi.wealth.dto.rpc.StockAnalysisRequestDto;
import com.litchi.wealth.exception.ServiceException;
import com.litchi.wealth.utils.RedisCache;
import com.litchi.wealth.vo.ai.KlineAnalysisVo;
import com.litchi.wealth.vo.ai.PositionAnalysisVo;
import com.litchi.wealth.vo.ai.StockAnalysisVo;
import com.litchi.wealth.vo.ai.TechnicalPointVo;
import com.litchi.wealth.vo.ai.HkStockMarketAnalysisVo;
import com.litchi.wealth.dto.ai.HkStockMarketAnalysisRequest;
import com.litchi.wealth.vo.rpc.HkStockAllNewsVo;
import com.litchi.wealth.vo.rpc.HkStockCompanyInfoSinaVo;
import com.litchi.wealth.vo.rpc.HkStockCompanyNoticeVo;
import com.litchi.wealth.vo.rpc.HkStockCompanyProfileVo;
import com.litchi.wealth.vo.rpc.HkStockEnhancedHistoryVo;
import com.litchi.wealth.vo.rpc.HkStockFinancialIndicatorEmVo;
import com.litchi.wealth.vo.rpc.HkStockFinancialIndicatorVo;
import com.litchi.wealth.vo.rpc.HkStockFinancialIndicatorsSinaVo;
import com.litchi.wealth.vo.rpc.HkStockMinuteHistoryVo;
import com.litchi.wealth.vo.rpc.HkStockNewsVo;
import com.litchi.wealth.vo.rpc.HkStockSecurityProfileVo;
import com.litchi.wealth.vo.rpc.LLMProviderInfoVo;
import com.litchi.wealth.vo.rpc.WechatImageGenerateVo;
import com.litchi.wealth.dto.ai.TradeScoreRequest;
import com.litchi.wealth.dto.ai.BrokerScreenshotRequest;
import com.litchi.wealth.vo.ai.TradeScoreVo;
import com.litchi.wealth.vo.ai.BrokerScreenshotVo;
import com.litchi.wealth.vo.ai.AINewsVo;
import com.litchi.wealth.vo.ai.AIHotspotVo;
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
        log.info("获取 token 结果：{}", resultStr);
        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            String accessToken = data.getStr("access_token");
            redisCache.setCacheObject(PYTHON_RPC_TOKEN, accessToken, 80400, TimeUnit.SECONDS);
            return accessToken;
        } else {
            log.error("获取 token 失败：{}", result);
            throw new ServiceException("获取 token 失败");
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
        log.info("调用 Python API 获取证券资料：stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockSecurityProfileVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取证券资料失败：code={}, msg={}", code, msg);
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
        log.info("调用 Python API 获取公司资料：stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockCompanyProfileVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取公司资料失败：code={}, msg={}", code, msg);
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
        log.info("调用 Python API 获取财务指标：stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockFinancialIndicatorVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取财务指标失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取财务指标失败");
        }
    }

    /**
     * 获取港股增强历史数据（K 线图数据）
     *
     * @param stockCode 股票代码，如 03900.HK
     * @param period    周期类型：daily/weekly/monthly
     * @param adjust    复权类型：空字符串=不复权，qfq=前复权，hfq=后复权
     * @param startDate 开始日期，可为 null
     * @param endDate   结束日期，可为 null
     * @return K 线图数据列表
     */
    @Cacheable(value = "getEnhancedHistory", key = "#stockCode +'-' + #period +'-'+ #adjust + '-'+#startDate +'-'+ #endDate")
    public List<HkStockEnhancedHistoryVo> getEnhancedHistory(String stockCode, String period,
                                                             String adjust, LocalDate startDate, LocalDate endDate) {
        String token = createAccessToken();

        // 构建 URL 和查询参数
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
        log.info("调用 Python API 获取增强历史数据：stockCode={}, period={}, url={}", stockCode, period, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, HkStockEnhancedHistoryVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取增强历史数据失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取增强历史数据失败");
        }
    }

    /**
     * 获取港股分钟级历史数据（分时图数据）
     *
     * @param stockCode 股票代码，如 03900.HK
     * @param period    周期：1/5/15/30/60 (分钟)
     * @param adjust    复权类型：空字符串=不复权，hfq=后复权
     * @param startDate 开始日期时间，可为 null
     * @param endDate   结束日期时间，可为 null
     * @return 分时图数据列表
     */
    @Cacheable(value = "getMinuteHistory", key = "#stockCode +'-' + #period +'-'+ #adjust + '-'+#startDate +'-'+ #endDate")
    public List<HkStockMinuteHistoryVo> getMinuteHistory(String stockCode, String period,
                                                         String adjust, String startDate, String endDate) {
        String token = createAccessToken();

        // 构建 URL 和查询参数
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
        log.info("调用 Python API 获取分钟级历史数据：stockCode={}, period={}, url={}", stockCode, period, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, HkStockMinuteHistoryVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取分钟级历史数据失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取分钟级历史数据失败");
        }
    }

    /**
     * 获取港股新闻（新浪财经）
     *
     * @param stockCode 股票代码，如 0700.HK
     * @return 新闻列表
     */
    @Cacheable(value = "getStockNews", key = "#stockCode")
    public List<HkStockNewsVo> getStockNews(String stockCode) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/stocks/" + stockCode + "/news";
        log.info("调用 Python API 获取股票新闻：stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, HkStockNewsVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取股票新闻失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取股票新闻失败");
        }
    }

    /**
     * 获取港股公司信息（新浪财经）
     *
     * @param stockCode 股票代码，如 01810.HK
     * @return 公司信息
     */
    @Cacheable(value = "getCompanyInfoSina", key = "#stockCode")
    public HkStockCompanyInfoSinaVo getCompanyInfoSina(String stockCode) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/stocks/" + stockCode + "/company-info-sina";
        log.info("调用 Python API 获取公司信息 (新浪): stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockCompanyInfoSinaVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取公司信息失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取公司信息失败");
        }
    }

    /**
     * 获取港股财务指标（新浪财经）
     *
     * @param stockCode 股票代码，如 01810.HK
     * @return 财务指标
     */
    @Cacheable(value = "getFinancialIndicatorsSina", key = "#stockCode")
    public HkStockFinancialIndicatorsSinaVo getFinancialIndicatorsSina(String stockCode) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/stocks/" + stockCode + "/financial-indicators-sina";
        log.info("调用 Python API 获取财务指标 (新浪): stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockFinancialIndicatorsSinaVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取财务指标失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取财务指标失败");
        }
    }

    /**
     * 获取港股公司公告（新浪财经）
     *
     * @param stockCode 股票代码，如 09868.HK
     * @param maxPages  最大爬取页数（1-10）
     * @return 公告列表
     */
    @Cacheable(value = "getCompanyNotices", key = "#stockCode + '-' + #maxPages")
    public List<HkStockCompanyNoticeVo> getCompanyNotices(String stockCode, Integer maxPages) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/stocks/" + stockCode + "/company-notices?max_pages=" + maxPages;
        log.info("调用 Python API 获取公司公告 (新浪): stockCode={}, maxPages={}, url={}", stockCode, maxPages, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, HkStockCompanyNoticeVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取公司公告失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取公司公告失败");
        }
    }

    /**
     * 获取港股增强财务指标（扩展指标）
     *
     * @param stockCode 股票代码，如 01810.HK
     * @return 增强财务指标
     */
    @Cacheable(value = "getFinancialIndicatorEm", key = "#stockCode")
    public HkStockFinancialIndicatorEmVo getFinancialIndicatorEm(String stockCode) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/stocks/" + stockCode + "/financial-indicator-em";
        log.info("调用 Python API 获取增强财务指标：stockCode={}, url={}", stockCode, url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockFinancialIndicatorEmVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取增强财务指标失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取增强财务指标失败");
        }
    }

    /**
     * AI 分析 K 线
     *
     * @param request K 线分析请求
     * @return K 线分析结果
     */
    public KlineAnalysisVo analyzeKline(KlineAnalysisRequestDto request) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/analyze-kline";
        log.info("调用 Python AI API 分析 K 线：stockCode={}, provider={}, url={}", request.getStockCode(), request.getProvider(), url);

        String json = JSONUtil.toJsonStr(request);
        log.debug("请求参数：{}", json);

        String resultStr = HttpRequest.post(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .body(json)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, KlineAnalysisVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("AI 分析 K 线失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "AI 分析失败");
        }
    }

    /**
     * 获取 LLM 供应商列表
     *
     * @return LLM 供应商列表
     */
    public List<LLMProviderInfoVo> listProviders() {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/providers";
        log.info("调用 Python AI API 获取 LLM 供应商列表：url={}", url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, LLMProviderInfoVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取 LLM 供应商列表失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取 LLM 供应商列表失败");
        }
    }

    /**
     * 获取可用的 LLM 供应商
     *
     * @return 可用的 LLM 供应商名称列表
     */
    public List<String> listAvailableProviders() {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/available-providers";
        log.info("调用 Python AI API 获取可用的 LLM 供应商：url={}", url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, String.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取可用的 LLM 供应商失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取可用的 LLM 供应商失败");
        }
    }

    /**
     * AI 分析股票（需要认证）
     *
     * @param request 股票分析请求
     * @return 股票分析结果
     */
    public StockAnalysisVo analyzeStock(StockAnalysisRequestDto request) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/analyze-stock";
        log.info("调用 Python AI API 分析股票：stockCode={}, provider={}, url={}", request.getStockCode(), request.getProvider(), url);

        String json = JSONUtil.toJsonStr(request);
        log.debug("请求参数：{}", json);

        String resultStr = HttpRequest.post(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .body(json)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, StockAnalysisVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("AI 分析股票失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "AI 分析股票失败");
        }
    }

    /**
     * AI 分析持仓（需要认证）
     *
     * @param request 持仓分析请求
     * @return 持仓分析结果
     */
    public PositionAnalysisVo analyzePosition(PositionAnalysisRequestDto request) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/analyze-position";
        log.info("调用 Python AI API 分析持仓：positionCount={}, provider={}, url={}",
                request.getPositions() != null ? request.getPositions().size() : 0, request.getProvider(), url);

        String json = JSONUtil.toJsonStr(request);
        log.debug("请求参数：{}", json);

        String resultStr = HttpRequest.post(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .body(json)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, PositionAnalysisVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("AI 分析持仓失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "AI 分析持仓失败");
        }
    }

    /**
     * AI 分析港股市场
     *
     * @param request 港股市场分析请求
     * @return 港股市场分析结果
     */
    public HkStockMarketAnalysisVo analyzeHkStockMarket(HkStockMarketAnalysisRequest request) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/analyze-hkstock-market";
        log.info("调用 Python AI API 分析港股市场：provider={}, model={}, url={}",
                request != null ? request.getProvider() : "default",
                request != null ? request.getModel() : "default", url);

        String json = JSONUtil.toJsonStr(request);
        log.debug("请求参数：{}", json);

        String resultStr = HttpRequest.post(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .body(json)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockMarketAnalysisVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("AI 分析港股市场失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "AI 分析港股市场失败");
        }
    }

    /**
     * 获取所有港股新闻
     *
     * @return 港股新闻汇总结果
     */
    @Cacheable(value = "hkstock:news:all")
    public HkStockAllNewsVo getAllNews() {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/hkstock/news/all-raw";
        log.info("调用 Python API 获取所有港股新闻：url={}", url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, HkStockAllNewsVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取所有港股新闻失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取所有港股新闻失败");
        }
    }

    /**
     * AI 分析贸易评分
     *
     * @param request 贸易评分请求
     * @return 贸易评分结果
     */
    public TradeScoreVo analyzeTrade(TradeScoreRequest request) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/analyze-trade";
        log.info("调用 Python AI API 分析贸易：stockCode={}, transactionDate={}, instruction={}, url={}",
                request.getStockCode(), request.getTransactionDate(), request.getInstruction(), url);

        String json = JSONUtil.toJsonStr(request);
        log.debug("请求参数：{}", json);

        String resultStr = HttpRequest.post(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .body(json)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, TradeScoreVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("AI 分析贸易失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "AI 分析贸易失败");
        }
    }

    /**
     * AI 分析券商截图
     *
     * @param request 券商截图识别请求
     * @return 识别结果
     */
    public BrokerScreenshotVo analyzeBrokerScreenshot(BrokerScreenshotRequest request) {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/analyze-broker-screenshot";
        log.info("调用 Python AI API 分析券商截图：url={}", url);

        String json = JSONUtil.toJsonStr(request);
        log.debug("请求参数：{}", json);

        String resultStr = HttpRequest.post(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .body(json)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONObject data = result.getJSONObject("data");
            return JSONUtil.toBean(data, BrokerScreenshotVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("AI 分析券商截图失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "AI 分析券商截图失败");
        }
    }

    /**
     * 获取 AI 新闻摘要
     *
     * @return AI 新闻摘要列表
     */
    public List<AINewsVo> getNewsSummary() {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/news-summary";
        log.info("调用 Python AI API 获取 AI 新闻摘要：url={}", url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, AINewsVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取 AI 新闻摘要失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取 AI 新闻摘要失败");
        }
    }

    /**
     * 获取 AI 热点
     *
     * @return AI 热点列表
     */
    public List<AIHotspotVo> getHotspots() {
        String token = createAccessToken();

        String url = pythonApiUrl + "/api/ai/hotspots";
        log.info("调用 Python AI API 获取 AI 热点：url={}", url);

        String resultStr = HttpRequest.get(url)
                .header("Authorization", "Bearer " + token)
                .execute()
                .body();

        log.info("Python API 返回：{}", resultStr);

        JSONObject result = JSONUtil.parseObj(resultStr);
        Integer code = result.getInt("code");
        if (code == 200) {
            JSONArray dataArray = result.getJSONArray("data");
            return JSONUtil.toList(dataArray, AIHotspotVo.class);
        } else {
            String msg = result.getStr("msg");
            log.error("获取 AI 热点失败：code={}, msg={}", code, msg);
            throw new ServiceException(StrUtil.isNotBlank(msg) ? msg : "获取 AI 热点失败");
        }
    }

    /**
     * 生成微信分析图片
     * 调用 Python API 生成港股市场分析图片，用于微信公众号文章封面
     *
     * @param markdownContent Markdown 内容
     * @param reportDate      报告日期
     * @return 图片生成结果，包含 image_url 和 prompt_used
     */
    public WechatImageGenerateVo generateWechatAnalysisImage(String markdownContent, String reportDate) {
        log.info("调用 Python API 生成微信分析图片：reportDate={}", reportDate);

        try {
            String token = createAccessToken();

            String url = pythonApiUrl + "/api/wechat/generate-analysis-image";

            // 构建请求参数
            JSONObject requestBody = new JSONObject();
            requestBody.set("markdown_content", markdownContent);
            requestBody.set("report_date", reportDate);

            String json = JSONUtil.toJsonStr(requestBody);
            log.debug("请求参数：{}", json);

            String resultStr = HttpRequest.post(url)
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .body(json)
                    .execute()
                    .body();

            log.info("Python API 返回：{}", resultStr);

            JSONObject result = JSONUtil.parseObj(resultStr);
            Integer code = result.getInt("code");
            if (code == 200) {
                JSONObject data = result.getJSONObject("data");
                String imageUrl = data.getStr("image_url");
                String promptUsed = data.getStr("prompt_used");

                log.info("图片生成成功，URL: {}, 提示词：{}", imageUrl, promptUsed);

                return WechatImageGenerateVo.builder()
                        .imageUrl(imageUrl)
                        .promptUsed(promptUsed)
                        .build();
            } else {
                String msg = result.getStr("msg");
                log.error("生成图片失败：code={}, msg={}", code, msg);
                return null;
            }

        } catch (Exception e) {
            log.error("调用 Python API 生成图片失败", e);
            return null;
        }
    }
}
