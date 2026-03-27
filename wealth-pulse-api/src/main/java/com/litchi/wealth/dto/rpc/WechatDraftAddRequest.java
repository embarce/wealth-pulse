package com.litchi.wealth.dto.rpc;

import cn.hutool.core.annotation.Alias;
import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 微信新增草稿请求 DTO
 * 参考文档：https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/03/15
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WechatDraftAddRequest {

    /**
     * 图文消息，一个 articles 数组对应一条图文消息
     */
    private List<WechatDraftArticle> articles;

    /**
     * 草稿箱类型，可选，默认为 0
     * 0: 普通图文
     * 1: 视频图文
     */
    @Alias("draft_type")
    private Integer draftType;

    /**
     * 是否开启定时发布，可选，默认为 false
     */
    @Alias("is_timing")
    private Boolean isTiming;

    /**
     * 定时发布时间（时间戳），可选
     */
    @Alias("timing_time")
    private Long timingTime;

    /**
     * 是否开启评论区，可选，默认为 true
     */
    @Alias("open_comment")
    private Boolean openComment;

    /**
     * 图文消息的文章
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WechatDraftArticle {

        /**
         * 标题
         */
        private String title;

        /**
         * 作者
         */
        private String author;

        /**
         * 图文消息的摘要，仅控制在 50 字以内
         */
        private String digest;

        /**
         * 图文消息的封面图片素材 id（必须是永久 mediaID）
         */
        @Alias("thumb_media_id")
        private String thumbMediaId;

        /**
         * 是否显示封面，0/1
         */
        @Alias("show_cover_pic")
        private Integer showCoverImg;

        /**
         * 图文消息的完整内容，支持 HTML 或 Markdown 格式
         */
        private String content;

        /**
         * 图文消息的原文地址 URL
         */
        @Alias("content_source_url")
        private String contentSourceUrl;

        /**
         * 图文消息的封面大图 mediaId
         */
        @Alias("thumb_media_id_hd")
        private String thumbMediaIdHd;

        /**
         * 封面图片的裁剪位置，0/1
         */
        @Alias("need_horizontal_cover")
        private Integer needHorizontalCover;

        /**
         * 是否允许转载，0/1，默认为 0（不允许转载）
         */
        @Alias("can_reward")
        private Integer canReward;

        /**
         * 是否显示广告，0/1，默认为 0（不显示）
         */
        @Alias("show_ad")
        private Integer adType;

        /**
         * 文章是否支持付费阅读，0/1，默认为 0（不支持）
         */
        @Alias("is_paid")
        private Integer isPaid;

        /**
         * 转载类型，0/1/2/3，默认为 0（禁止转载）
         * 0: 禁止转载
         * 1: 全平台可转载
         * 2: 仅公众号互选可转载
         * 3: 白名单内公众号可转载
         */
        @Alias("reprint_type")
        private Integer rePrintType;

        /**
         * 是否插入原创声明，0/1，默认为 0（不插入）
         */
        @Alias("is_original_declare")
        private Integer isOriginalDeclare;

        /**
         * 文章是否开启评论，0/1，默认为 1（开启）
         */
        @Alias("is_auto_comment")
        private Integer isAutoComment;

        /**
         * 是否需要打开评论，0/1，默认为 0（不需要）
         */
        @Alias("need_open_comment")
        private Integer needOpenComment;

        /**
         * 是否仅粉丝可评论，0/1，默认为 0（否）
         */
        @Alias("only_fans_can_comment")
        private Integer onlyFansCanComment;

        /**
         * 235:1 封面裁剪坐标，格式："X1_Y1_X2_Y2"
         */
        @Alias("pic_crop_235_1")
        private String picCrop2351;

        /**
         * 1:1 封面裁剪坐标，格式："X1_Y1_X2_Y2"
         */
        @Alias("pic_crop_1_1")
        private String picCrop11;
    }
}
