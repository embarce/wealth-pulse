package com.litchi.wealth.vo.rpc;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 微信发布草稿响应 VO
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/03/15
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WechatFreePublishSubmitVo {

    /**
     * 错误码，0 表示成功
     */
    private Integer errcode;

    /**
     * 错误信息
     */
    private String errmsg;

    /**
     * 发布成功后的发布 ID
     */
    @JsonAlias("publish_id")
    private Long publishId;

    /**
     * 是否成功
     */
    public boolean isSuccess() {
        return errcode != null && errcode == 0;
    }
}
