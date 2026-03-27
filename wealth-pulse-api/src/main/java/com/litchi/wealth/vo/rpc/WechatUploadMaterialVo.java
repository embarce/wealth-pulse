package com.litchi.wealth.vo.rpc;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 微信上传永久素材响应 VO
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/03/15
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WechatUploadMaterialVo {

    /**
     * 错误码，0 表示成功
     */
    private Integer errcode;

    /**
     * 错误信息
     */
    private String errmsg;

    /**
     * 上传成功后返回的媒体文件 ID
     */
    @JsonAlias("media_id")
    private String mediaId;

    /**
     * 图片 URL（仅图片素材会返回）
     */
    @JsonAlias("url")
    private String url;

    /**
     * 是否成功
     */
    public boolean isSuccess() {
        return errcode != null && errcode == 0;
    }
}
