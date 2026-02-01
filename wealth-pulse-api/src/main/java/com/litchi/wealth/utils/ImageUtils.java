package com.litchi.wealth.utils;

import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;


/**
 * @author Embrace
 * @version 1.0
 * @description: ImageUtils
 * @date 2025/6/22 15:46
 */
public class ImageUtils {
    public static BufferedImage getImageDimensions(MultipartFile file) throws IOException {
        try {
            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image != null) {
                return image;
            } else {
                throw new IOException("文件不是有效图片");
            }
        } catch (IOException e) {
            throw new IOException("读取图片失败: " + e.getMessage());
        }
    }
}
