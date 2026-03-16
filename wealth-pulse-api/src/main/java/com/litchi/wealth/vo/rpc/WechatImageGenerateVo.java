package com.litchi.wealth.vo.rpc;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 微信图片生成响应 VO
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/03/15
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WechatImageGenerateVo {

    /**
     * 图片 URL
     */
    private String imageUrl;

    /**
     * 使用的图片生成提示词
     */
    private String promptUsed;

    /**
     * 是否成功
     */
    public boolean isSuccess() {
        return imageUrl != null && !imageUrl.isEmpty();
    }
}
