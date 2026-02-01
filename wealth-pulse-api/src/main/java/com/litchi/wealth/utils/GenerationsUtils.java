//package com.litchi.wealth.utils;
//
//import cn.hutool.core.collection.CollectionUtil;
//import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
//import com.litchi.wealth.dto.auth.GenerationsDto;
//import com.litchi.wealth.vo.FileResultVo;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Component;
//
//import java.util.ArrayList;
//import java.util.List;
//
///**
// * 生成任务工具类
// *
// * @author Embrace
// * @version 1.0
// * @description: GenerationsUtils
// * @date 2025/12/16
// */
//@Component
//@Slf4j
//public class GenerationsUtils {
//
//    @Autowired
//    private FileUploadService fileUploadService;
//
//    @Value("${cloudflare.R2.url}")
//    private String r2FileUrl;
//
//    /**
//     * 根据文件ID列表获取图片URL列表
//     *
//     * @param param 生成参数
//     * @param userId 用户ID
//     * @param jobId 任务ID（用于日志）
//     * @return 图片URL列表
//     * @throws RuntimeException 当文件不存在时抛出异常
//     */
//    public List<String> getImageUrlList(GenerationsDto param, String userId, String jobId) {
//        List<String> fileIds = param.getFileIds();
//
//        if (CollectionUtil.isEmpty(fileIds)) {
//            log.debug("No file IDs provided for job:{}", jobId);
//            return new ArrayList<>();
//        }
//
//        LambdaQueryWrapper<FileUpload> fileUploadLambdaQueryWrapper = new LambdaQueryWrapper<>();
//        fileUploadLambdaQueryWrapper.in(FileUpload::getId, fileIds)
//                .eq(FileUpload::getCreateBy, userId);
//        List<FileUpload> fileUploadList = fileUploadService.list(fileUploadLambdaQueryWrapper);
//
//        if (CollectionUtil.isEmpty(fileUploadList)) {
//            log.error("Job:{} files not found", jobId);
//            throw new RuntimeException("Files not found");
//        }
//
//        List<String> imageUrlList = new ArrayList<>();
//        for (FileUpload fileUpload : fileUploadList) {
//            String imageUrl = r2FileUrl + fileUpload.getR2Url();
//            imageUrlList.add(imageUrl);
//            log.debug("Added image URL for job:{} file:{}", jobId, fileUpload.getId());
//        }
//
//        log.info("Retrieved {} image URLs for job:{}", imageUrlList.size(), jobId);
//        return imageUrlList;
//    }
//
//    /**
//     * 根据文件ID列表获取图片URL列表（不包含日志）
//     *
//     * @param fileIds 文件ID列表
//     * @param userId 用户ID
//     * @return 图片URL列表
//     * @throws RuntimeException 当文件不存在时抛出异常
//     */
//    public List<String> getImageUrlList(List<String> fileIds, String userId) {
//        if (CollectionUtil.isEmpty(fileIds)) {
//            return new ArrayList<>();
//        }
//
//        LambdaQueryWrapper<FileUpload> fileUploadLambdaQueryWrapper = new LambdaQueryWrapper<>();
//        fileUploadLambdaQueryWrapper.in(FileUpload::getId, fileIds)
//                .eq(FileUpload::getCreateBy, userId);
//        List<FileUpload> fileUploadList = fileUploadService.list(fileUploadLambdaQueryWrapper);
//
//        if (CollectionUtil.isEmpty(fileUploadList)) {
//            throw new RuntimeException("Files not found");
//        }
//
//        List<String> imageUrlList = new ArrayList<>();
//        for (FileUpload fileUpload : fileUploadList) {
//            String imageUrl = r2FileUrl + fileUpload.getR2Url();
//            imageUrlList.add(imageUrl);
//        }
//
//        return imageUrlList;
//    }
//
//    /**
//     * 获取文件上传记录
//     *
//     * @param fileIds 文件ID列表
//     * @param userId 用户ID
//     * @return 文件上传记录列表
//     */
//    public List<FileUpload> getFileUploads(List<String> fileIds, String userId) {
//        if (CollectionUtil.isEmpty(fileIds)) {
//            return new ArrayList<>();
//        }
//
//        LambdaQueryWrapper<FileUpload> fileUploadLambdaQueryWrapper = new LambdaQueryWrapper<>();
//        fileUploadLambdaQueryWrapper.in(FileUpload::getId, fileIds)
//                .eq(FileUpload::getCreateBy, userId);
//
//        return fileUploadService.list(fileUploadLambdaQueryWrapper);
//    }
//
//
//
//
//    public List<FileResultVo> getFileResultVoList(List<String> fileIds, String userId) {
//        List<FileUpload> fileUploads = getFileUploads(fileIds, userId);
//        return fileUploads.stream().map(fileUpload -> FileResultVo.builder()
//                .fileId(fileUpload.getId())
//                .fileName(fileUpload.getName())
//                .sourceName(fileUpload.getSourceName())
//                .url(r2FileUrl + fileUpload.getR2Url())
//                .build()).toList();
//    }
//}
