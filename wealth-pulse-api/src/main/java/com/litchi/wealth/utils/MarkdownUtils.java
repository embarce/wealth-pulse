package com.litchi.wealth.utils;

import com.vladsch.flexmark.ext.gfm.strikethrough.StrikethroughExtension;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.html2md.converter.FlexmarkHtmlConverter;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.data.DataHolder;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.vladsch.flexmark.util.misc.Extension;

import java.util.Arrays;
import java.util.List;

/**
 * Markdown 转 HTML 工具类
 * 使用 Flexmark 解析器，支持 GitHub Flavored Markdown (GFM)
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/3/9
 */
public class MarkdownUtils {

    /**
     * Markdown 扩展列表
     * - Tables: 表格支持
     * - Strikethrough: 删除线支持
     * - Autolinks: 自动链接
     * - TaskLists: 任务列表
     */
    private static final List<Extension> EXTENSIONS = Arrays.asList(
            TablesExtension.create(),
            StrikethroughExtension.create(),
            com.vladsch.flexmark.ext.autolink.AutolinkExtension.create(),
            com.vladsch.flexmark.ext.gfm.tasklist.TaskListExtension.create()
    );

    /**
     * Markdown 解析配置
     */
    private static final DataHolder OPTIONS = new MutableDataSet()
            .set(Parser.EXTENSIONS, EXTENSIONS)
            .set(TablesExtension.WITH_CAPTION, false)
            .set(TablesExtension.MIN_HEADER_ROWS, 1)
            .set(TablesExtension.MAX_HEADER_ROWS, 1)
            .set(TablesExtension.APPEND_MISSING_COLUMNS, true)
            .set(TablesExtension.DISCARD_EXTRA_COLUMNS, true)
            .set(TablesExtension.HEADER_SEPARATOR_COLUMN_MATCH, true);

    /**
     * HTML 渲染配置
     * 使用简洁配置，确保输出干净的 HTML
     */
    private static final DataHolder HTML_OPTIONS = new MutableDataSet();

    // 解析器实例
    private static final Parser PARSER = Parser.builder(OPTIONS).build();

    // HTML 渲染器实例
    private static final com.vladsch.flexmark.html.HtmlRenderer RENDERER =
            com.vladsch.flexmark.html.HtmlRenderer.builder(HTML_OPTIONS).build();

    /**
     * 将 Markdown 转换为 HTML
     *
     * @param markdown Markdown 文本
     * @return HTML 字符串
     */
    public static String convertToHtml(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "";
        }

        try {
            // 解析 Markdown 为 AST
            var document = PARSER.parse(markdown);
            // 渲染 AST 为 HTML
            return RENDERER.render(document);
        } catch (Exception e) {
            // 解析失败时返回原始文本（用 pre 标签包裹）
            return "<pre>" + escapeHtml(markdown) + "</pre>";
        }
    }

    /**
     * 将 Markdown 转换为 HTML（邮件专用）
     * 添加内联样式以适配邮件客户端
     *
     * @param markdown Markdown 文本
     * @return 带内联样式的 HTML 字符串
     */
    public static String convertToHtmlForEmail(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "";
        }

        try {
            String html = convertToHtml(markdown);
            return inlineCssForEmail(html);
        } catch (Exception e) {
            return "<pre style=\"font-family: monospace; white-space: pre-wrap; word-wrap: break-word; color: #374151;\">"
                    + escapeHtml(markdown) + "</pre>";
        }
    }

    /**
     * 为 HTML 添加内联 CSS 样式（适配邮件客户端）
     * 邮件客户端对 <style> 标签支持有限，需要使用内联样式
     */
    private static String inlineCssForEmail(String html) {
        // 替换表格样式
        html = html.replaceAll("<table>",
                "<table style=\"border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px;\">");

        html = html.replaceAll("<thead>",
                "<thead style=\"background-color: #f3f4f6;\">");

        html = html.replaceAll("<th>",
                "<th style=\"border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; background-color: #f9fafb;\">");

        html = html.replaceAll("<td>",
                "<td style=\"border: 1px solid #e5e7eb; padding: 10px 12px; color: #1f2937;\">");

        html = html.replaceAll("</tr>",
                "</tr>");

        // 替换段落样式
        html = html.replaceAll("<p>",
                "<p style=\"margin: 12px 0; line-height: 1.8; color: #374151;\">");

        // 替换标题样式
        html = html.replaceAll("<h1>",
                "<h1 style=\"font-size: 20px; font-weight: 700; margin: 24px 0 16px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;\">");

        html = html.replaceAll("<h2>",
                "<h2 style=\"font-size: 18px; font-weight: 600; margin: 20px 0 12px; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;\">");

        html = html.replaceAll("<h3>",
                "<h3 style=\"font-size: 16px; font-weight: 600; margin: 16px 0 10px; color: #1f2937;\">");

        html = html.replaceAll("<h4>",
                "<h4 style=\"font-size: 14px; font-weight: 600; margin: 14px 0 8px; color: #1f2937;\">");

        // 替换列表样式
        html = html.replaceAll("<ul>",
                "<ul style=\"list-style-type: disc; padding-left: 24px; margin: 12px 0;\">");

        html = html.replaceAll("<ol>",
                "<ol style=\"list-style-type: decimal; padding-left: 24px; margin: 12px 0;\">");

        html = html.replaceAll("<li>",
                "<li style=\"margin: 6px 0; line-height: 1.6; color: #374151;\">");

        // 替换引用块样式
        html = html.replaceAll("<blockquote>",
                "<blockquote style=\"border-left: 4px solid #e5e7eb; margin: 16px 0; padding: 12px 16px; background-color: #f9fafb; color: #4b5563;\">");

        // 替换代码块样式
        html = html.replaceAll("<pre>",
                "<pre style=\"background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; line-height: 1.5; color: #1f2937;\">");

        html = html.replaceAll("<code>",
                "<code style=\"background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #dc2626;\">");

        // 替换加粗和斜体
        html = html.replaceAll("<strong>",
                "<strong style=\"font-weight: 600; color: #1f2937;\">");

        html = html.replaceAll("<em>",
                "<em style=\"font-style: italic;\">");

        // 替换删除线
        html = html.replaceAll("<del>",
                "<del style=\"text-decoration: line-through; color: #9ca3af;\">");

        // 替换水平线
        html = html.replaceAll("<hr />",
                "<hr style=\"border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;\">");

        return html;
    }

    /**
     * HTML 转义
     */
    private static String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }

    /**
     * 将 HTML 转换回 Markdown（用于测试）
     */
    public static String convertToMarkdown(String html) {
        if (html == null || html.trim().isEmpty()) {
            return "";
        }

        FlexmarkHtmlConverter converter = FlexmarkHtmlConverter.builder().build();
        return converter.convert(html);
    }




    /**
     * 移除 Markdown 代码块标记（如 ```markdown 和 ```）
     *
     * @param content 原始内容
     * @return 处理后的内容
     */
    public static String removeMarkdownCodeBlock(String content) {
        if (content == null || content.isEmpty()) {
            return content;
        }
        // 移除开头的 ```markdown 或 ```
        String result = content.trim();
        if (result.startsWith("```markdown")) {
            result = result.substring(11);
        } else if (result.startsWith("```")) {
            result = result.substring(3);
        }
        // 移除结尾的 ```
        if (result.endsWith("```")) {
            result = result.substring(0, result.length() - 3);
        }
        return result.trim();
    }
}
