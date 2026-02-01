package com.litchi.wealth.utils;

import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 * @author Embrace
 * @Classname BodyUtils
 * @Description BodyUtils
 * @Date 2024/4/8 23:39
 * @git: https://github.com/embarce
 */
@Slf4j
public class BodyUtils {

    public static String getRequestBody(HttpServletRequest request) {
        StringBuffer sb = new StringBuffer();
        try (ServletInputStream inputStream = request.getInputStream();
             BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
        ) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        } catch (IOException e) {
            log.error("读取数据流异常:", e);
            throw new RuntimeException(e);
        }
        return sb.toString();

    }
}
