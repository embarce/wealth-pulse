package com.litchi.wealth.controller;

import com.litchi.wealth.constant.Result;
import com.litchi.wealth.rpc.PythonStockRpc;
import com.litchi.wealth.vo.rpc.HkStockAllNewsVo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 港股新闻控制器
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供港股新闻数据的 API 接口
 * @date 2026/3/8
 */
@Slf4j
@RestController
@RequestMapping("/hkstock")
@Tag(name = "港股新闻管理", description = "提供港股新闻数据的 API 接口")
public class HkStockNewsController {

    @Resource
    private PythonStockRpc pythonStockRpc;

    @Operation(
            summary = "获取所有港股新闻",
            description = "获取所有港股相关新闻（要闻 + 大行研报 + 公司新闻），包含汇总统计信息",
            method = "GET",
            tags = {"港股新闻管理"}
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "获取成功",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = HkStockAllNewsVo.class)
                    )
            )
    })
    @GetMapping("/news/all")
    public Result getAllNews() {
        log.info("收到获取所有港股新闻请求");

        try {
            HkStockAllNewsVo result = pythonStockRpc.getAllNews();
            log.info("获取所有港股新闻成功：总数={}",
                    result.getSummary() != null ? result.getSummary().getTotalCount() : 0);
            return Result.success(result);
        } catch (Exception e) {
            log.error("获取所有港股新闻失败", e);
            return Result.error("获取所有港股新闻失败：" + e.getMessage());
        }
    }
}
