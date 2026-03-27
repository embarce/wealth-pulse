package com.litchi.wealth.vo.rpc;

import cn.hutool.core.annotation.Alias;
import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 微信新增草稿响应 VO
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/03/15
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WechatDraftAddVo {

    /**
     * 错误码，0 表示成功
     */
    private Integer errcode;

    /**
     * 错误信息
     */
    private String errmsg;

    /**
     * 媒体 ID（返回的永久素材 media_id）
     */
    @Alias("media_id")
    @JsonAlias("media_id")
    private String mediaId;

    /**
     * 返回项列表
     */
    private List<WechatDraftItem> item;

    /**
     * 草稿项
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WechatDraftItem {
        /**
         * 草稿 ID
         */
        @Alias("draft_id")
        @JsonAlias("draft_id")
        private Long draftId;

        /**
         * 错误码
         */
        private Integer errcode;

        /**
         * 错误信息
         */
        private String errmsg;
    }

    /**
     * 是否成功
     */
    public boolean isSuccess() {
        return errcode != null && errcode == 0;
    }
}
