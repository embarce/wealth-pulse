package com.litchi.wealth.qo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * @author Embrace
 * git: https://gitee.com/EmbraceQAQ
 * @version 1.0
 * @since JDK 1.8
 * Date: 2022/2/24 15:24
 * Description:
 * FileName: BasePageQo
 */
@Data
@Schema(name = "BasePageQo", description = "基础分页")
public class BasePageQo {
    /**
     * 名称
     */
    @Schema(name = "name", description = "名称")
    private String name;

    /**
     * id
     */
    @Schema(name = "id", description = "id")
    private String id;

    /**
     * 当前记录起始索引
     */
    @Schema(name = "pageNum", description = "当前记录起始索引")
    private Integer pageNum;

    /**
     * 每页显示记录数
     */
    @Schema(name = "pageSize", description = "每页显示记录数")
    private Integer pageSize;
}
