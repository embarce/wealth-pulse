package com.litchi.wealth.dto.rpc;

import cn.hutool.core.annotation.Alias;
import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 微信发布草稿请求 DTO
 * 参考文档：https://developers.weixin.qq.com/doc/subscription/api/public/api_freepublish_submit.html
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/03/15
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WechatFreePublishSubmitRequest {

    /**
     * 草稿箱 ID，即通过新增草稿接口获得的 media_id
     */
    @Alias("media_id")
    private String mediaId;
}
