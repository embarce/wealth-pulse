package com.litchi.wealth.dto.rpc;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 微信上传永久素材请求 DTO（图片类型）
 * 参考文档：https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_addmaterial.html
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/03/15
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WechatUploadMaterialRequest {

    /**
     * 素材类型，图片固定为 "image"
     */
    private String type = "image";

    /**
     * 图片文件路径（本地文件路径或 URL）
     */
    private String filePath;

    /**
     * 图片文件字节数组（可选，与 filePath 二选一）
     */
    private byte[] fileData;

    /**
     * 文件名
     */
    private String fileName;
}
