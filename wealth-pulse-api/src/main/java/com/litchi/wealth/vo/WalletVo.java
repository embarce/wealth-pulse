package com.litchi.wealth.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * 钱包信息视图对象
 *
 * @author Embrace
 * @version 1.0
 * @description: 用于返回用户钱包信息的数据传输对象
 * @date 2025/9/21 11:46
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "WalletVo", description = "钱包信息视图对象")
public class WalletVo {

    @JsonProperty("quota")
    @Schema(
            name = "quota",
            description = "用户积分余额",
            example = "1000",
            requiredMode = Schema.RequiredMode.REQUIRED,
            minimum = "0"
    )
    private Integer quota;

    @JsonProperty("lastUpdateTime")
    @Schema(
            name = "lastUpdateTime",
            description = "钱包最后更新时间",
            example = "2025-12-09T10:30:00Z",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED,
            format = "date-time"
    )
    private Date lastUpdateTime;
}
