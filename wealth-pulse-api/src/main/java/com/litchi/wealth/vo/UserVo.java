package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 用户信息视图对象
 *
 * @author Embrace
 * @version 1.0
 * @description: 用于返回用户基本信息的数据传输对象
 * @date 2025/10/23 20:29
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "UserVo", description = "用户信息视图对象")
public class UserVo {

    @Schema(
            name = "nickName",
            description = "用户昵称",
            example = "张三",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String nickName;

    @Schema(
            name = "email",
            description = "用户邮箱地址",
            example = "zhangsan@example.com",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED,
            format = "email"
    )
    private String email;

    @Schema(
            name = "avatar",
            description = "用户头像URL地址",
            example = "https://example.com/avatar.jpg",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED,
            format = "uri"
    )
    private String avatar;

}
