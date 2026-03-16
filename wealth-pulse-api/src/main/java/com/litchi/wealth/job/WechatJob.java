package com.litchi.wealth.job;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.io.FileUtil;
import cn.hutool.http.HttpUtil;
import com.litchi.wealth.constant.Constants;
import com.litchi.wealth.dto.rpc.WechatDraftAddRequest;
import com.litchi.wealth.dto.rpc.WechatFreePublishSubmitRequest;
import com.litchi.wealth.dto.rpc.WechatUploadMaterialRequest;
import com.litchi.wealth.rpc.PythonStockRpc;
import com.litchi.wealth.rpc.WechatRpc;
import com.litchi.wealth.utils.MarkdownUtils;
import com.litchi.wealth.utils.RedisCache;
import com.litchi.wealth.vo.ai.HkStockMarketAnalysisVo;
import com.litchi.wealth.vo.rpc.WechatDraftAddVo;
import com.litchi.wealth.vo.rpc.WechatFreePublishSubmitVo;
import com.litchi.wealth.vo.rpc.WechatImageGenerateVo;
import com.litchi.wealth.vo.rpc.WechatUploadMaterialVo;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.Collections;

/**
 * 微信发布定时任务
 * 每天 9:15、14:15、18:15 自动发布港股市场分析到微信公众号
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/03/15
 */
@Slf4j
@Component
public class WechatJob {

    @Autowired
    private WechatRpc wechatRpc;

    @Autowired
    private PythonStockRpc pythonStockRpc;

    @Autowired
    private RedisCache redisCache;

    @Value("${wechat.job.enabled:true}")
    private boolean wechatJobEnabled;

    /**
     * 初始化时打印配置状态
     */
    @PostConstruct
    public void init() {
        log.info("WechatJob 初始化完成，启用状态：enabled={}", wechatJobEnabled);
    }

    /**
     * 每天 9:15、14:15、18:15 执行
     */
    @Scheduled(cron = "0 15 9,14,18 * * ?")
    public void publishAnalysisToWechat() {
        // 检查 Job 是否启用
        if (!wechatJobEnabled) {
            log.warn("WechatJob 当前被禁用，跳过执行。如需启用，请设置 wechat.job.enabled=true");
            return;
        }

        log.info("========== 开始执行微信发布定时任务 ==========");
        long startTime = System.currentTimeMillis();

        try {
            // 获取今天日期
            String today = DateUtil.today();
            String redisKey = Constants.ANALYSIS_REDIS_KEY_PREFIX + today;

            log.info("从 Redis 获取分析数据，key: {}", redisKey);

            // 从 Redis 获取分析数据
            HkStockMarketAnalysisVo analysis = redisCache.getCacheObject(redisKey);
            if (analysis == null || analysis.getInvestmentReport() == null) {
                log.warn("未找到分析数据，Redis Key: {}", redisKey);
                return;
            }

            log.info("分析数据获取成功，报告长度：{} 字符", analysis.getInvestmentReport().length());

            // 步骤 1: 获取 Markdown 报告内容
            String markdownContent = MarkdownUtils.removeMarkdownCodeBlock(analysis.getInvestmentReport());
            log.info("Markdown 内容长度：{} 字符", markdownContent.length());

            // 步骤 2: 调用 Python API 生成图片（返回 URL）
            WechatImageGenerateVo imageResult = generateAnalysisImage(markdownContent, today);
            if (imageResult == null || !imageResult.isSuccess()) {
                log.error("生成图片失败，终止发布流程");
                return;
            }
            String imageUrl = imageResult.getImageUrl();
            log.info("图片生成成功，URL: {}", imageUrl);
            log.info("使用的提示词：{}", imageResult.getPromptUsed());

            // 步骤 3: 下载图片到本地
            String localImagePath = downloadImage(imageUrl, today);
            log.info("图片下载成功，本地路径：{}", localImagePath);

            // 步骤 4: 上传素材到微信素材库
            WechatUploadMaterialVo uploadResult = uploadMaterialToWechat(localImagePath);
            if (uploadResult == null || !uploadResult.isSuccess()) {
                log.error("上传素材失败：{}", uploadResult != null ? uploadResult.getErrmsg() : "未知错误");
                return;
            }
            String mediaId = uploadResult.getMediaId();
            log.info("素材上传成功，mediaId: {}, url: {}", mediaId, uploadResult.getUrl());

            // 步骤 5: 新增草稿
            WechatDraftAddVo draftResult = createDraft(analysis, mediaId, today);
            if (draftResult == null || !draftResult.isSuccess()) {
                log.error("新增草稿失败：{}", draftResult != null ? draftResult.getErrmsg() : "未知错误");
                return;
            }
            String draftId = draftResult.getMediaId();
            log.info("草稿创建成功，draftId: {}", draftId);

//            // 步骤 6: 发布草稿
//            WechatFreePublishSubmitVo publishResult = publishDraft(draftId);
//            if (publishResult == null || !publishResult.isSuccess()) {
//                log.error("发布草稿失败：{}", publishResult != null ? publishResult.getErrmsg() : "未知错误");
//                return;
//            }
//            Long publishId = publishResult.getPublishId();
//            log.info("草稿发布成功，publishId: {}", publishId);

            long duration = System.currentTimeMillis() - startTime;
            log.info("========== 微信发布定时任务完成 ==========");
            log.info("分析日期：{}", today);
            log.info("Redis Key: {}", redisKey);
            log.info("Image URL: {}", imageUrl);
            log.info("Media ID: {}", mediaId);
            log.info("Draft ID: {}", draftId);
//            log.info("Publish ID: {}", publishId);
            log.info("总耗时：{} ms", duration);

        } catch (Exception e) {
            log.error("微信发布定时任务执行失败", e);
        }
    }


    /**
     * 调用 Python API 生成分析图片
     *
     * @param markdownContent Markdown 内容
     * @param reportDate      报告日期
     * @return 图片生成结果，包含 imageUrl 和 promptUsed
     */
    private WechatImageGenerateVo generateAnalysisImage(String markdownContent, String reportDate) {
        log.info("开始调用 Python API 生成分析图片...");

        try {
            // 调用 Python RPC 生成图片（返回 URL）
            WechatImageGenerateVo result = pythonStockRpc.generateWechatAnalysisImage(markdownContent, reportDate);

            if (result == null || !result.isSuccess()) {
                log.error("Python API 返回的图片 URL 为空");
                return null;
            }

            return result;

        } catch (Exception e) {
            log.error("调用 Python API 生成图片失败", e);
            return null;
        }
    }

    /**
     * 下载图片到本地临时目录
     *
     * @param imageUrl   图片 URL
     * @param reportDate 报告日期
     * @return 本地文件路径，失败返回 null
     */
    private String downloadImage(String imageUrl, String reportDate) {
        log.info("开始下载图片：{}", imageUrl);
        String timestamp = DateUtil.format(new java.util.Date(), "yyyyMMdd_HHmmss");
        String fileName = "wechat_analysis_" + reportDate + "_" + timestamp + ".png";
        File file = FileUtil.file("/tmp/" + fileName);
        long size = HttpUtil.downloadFile(imageUrl, file);
        System.out.println("Download size: " + size);
        return "/tmp/" + fileName;
    }

    /**
     * 上传素材到微信
     *
     * @param imagePath 图片文件路径
     * @return 上传结果
     */
    private WechatUploadMaterialVo uploadMaterialToWechat(String imagePath) {
        log.info("开始上传素材到微信，图片路径：{}", imagePath);

        try {
            File imageFile = FileUtil.file(imagePath);
            if (!imageFile.exists()) {
                log.error("图片文件不存在：{}", imagePath);
                return null;
            }

            WechatUploadMaterialRequest request = WechatUploadMaterialRequest.builder()
                    .filePath(imagePath)
                    .fileName(imageFile.getName())
                    .build();

            return wechatRpc.uploadMaterial(request);

        } catch (Exception e) {
            log.error("上传素材失败", e);
            return null;
        }
    }

    /**
     * 创建草稿
     *
     * @param analysis 分析数据
     * @param mediaId  素材 media_id
     * @param today    发布日期
     * @return 草稿创建结果
     */
    private WechatDraftAddVo createDraft(HkStockMarketAnalysisVo analysis, String mediaId, String today) {
        log.info("开始创建草稿...");

        try {
            // 构建文章内容
            String now = DateUtil.now();
            String title = "港股市场分析报告-" + now;
            String digest = buildDigest(analysis);
            String content = buildArticleContent(analysis, today);

            WechatDraftAddRequest.WechatDraftArticle article =
                    WechatDraftAddRequest.WechatDraftArticle.builder()
                            .title(title)
                            .author("Embrace")
                            .digest(digest)
                            .thumbMediaId(mediaId)
                            .needOpenComment(1)
                            .showCoverImg(1)
                            .content(content)
                            .build();

            WechatDraftAddRequest request = WechatDraftAddRequest.builder()
                    .articles(Collections.singletonList(article))
                    .draftType(0)
                    .build();

            return wechatRpc.addDraft(request);

        } catch (Exception e) {
            log.error("创建草稿失败", e);
            return null;
        }
    }

    /**
     * 构建文章摘要
     */
    private String buildDigest(HkStockMarketAnalysisVo analysis) {
        // 从报告中提取前 50 个字符作为摘要
        String report = analysis.getInvestmentReport();
        if (StringUtils.isBlank(report)) {
            return "港股市场每日分析报告";
        }

        // 移除 Markdown 标记
        String cleanText = MarkdownUtils.removeMarkdownCodeBlock(report);
        // 截取前 50 个字符
        if (cleanText.length() > 50) {
            return cleanText.substring(0, 50) + "...";
        }
        return cleanText;
    }

    /**
     * 构建文章内容（HTML 格式 - 微信公众号专用）
     * 复用邮件模板样式，生成精美的 HTML 文章
     */
    private String buildArticleContent(HkStockMarketAnalysisVo analysis, String today) {
        // 使用新生成的完整文章 HTML 方法（复用邮件模板样式）
        return MarkdownUtils.generateWechatArticleHtml(analysis, today);
    }

    /**
     * 发布草稿
     *
     * @param mediaId 草稿 ID
     * @return 发布结果
     */
    private WechatFreePublishSubmitVo publishDraft(String mediaId) {
        log.info("开始发布草稿，mediaId: {}", mediaId);

        try {
            WechatFreePublishSubmitRequest request = WechatFreePublishSubmitRequest.builder()
                    .mediaId(mediaId)
                    .build();

            return wechatRpc.freePublishSubmit(request);

        } catch (Exception e) {
            log.error("发布草稿失败", e);
            return null;
        }
    }


    /**
     * 手动触发发布（用于测试或补执行）
     */
    public void publishManual() {
        log.info("手动触发微信发布任务");
        publishAnalysisToWechat();
    }
}
