package com.litchi.wealth.utils;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/**
 * @author Embrace
 * @Classname ServletUtils
 * @Description 服务渲染类
 * @Date 2022/9/26 22:54
 * @git: https://github.com/embarce
 */
public class ServletUtils {
    public static void renderString(HttpServletResponse response, String string) {
        try {
            response.setStatus(200);
            response.setContentType("application/json");
            response.setCharacterEncoding("utf-8");
            response.getWriter().print(string);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    public static void renderString(HttpServletResponse response, int code, String string) {
        try {
            response.setStatus(code);
            response.setContentType("application/json");
            response.setCharacterEncoding("utf-8");
            response.getWriter().print(string);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
