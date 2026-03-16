package com.litchi.wealth.utils;

import com.vladsch.flexmark.ext.gfm.strikethrough.StrikethroughExtension;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.html2md.converter.FlexmarkHtmlConverter;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.data.DataHolder;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.vladsch.flexmark.util.misc.Extension;
import com.litchi.wealth.vo.ai.HkStockMarketAnalysisVo;
import org.apache.commons.lang3.StringUtils;

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
     * 将 Markdown 转换为 HTML（微信公众号专用）
     * 添加内联样式以适配微信公众号编辑器
     *
     * @param markdown Markdown 文本
     * @return 带内联样式的 HTML 字符串
     */
    public static String convertToHtmlForWechat(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "";
        }

        try {
            String html = convertToHtml(markdown);
            return inlineCssForWechat(html);
        } catch (Exception e) {
            return "<p style=\"font-size: 15px; line-height: 1.8; color: #333;\">解析失败</p>";
        }
    }

    /**
     * 为 HTML 添加内联 CSS 样式（适配微信公众号）
     */
    private static String inlineCssForWechat(String html) {
        // 整体容器样式 - 微信公众号推荐的最大宽度
        html = "<section style='max-width: 100%; box-sizing: border-box;'>" + html + "</section>";

        // 替换表格样式 - 添加边框和底纹
        html = html.replaceAll("<table>",
                "<table style='border-collapse: collapse; width: 100%; margin: 15px 0; font-size: 14px;'>");

        html = html.replaceAll("<thead>",
                "<thead style='background-color: #f8f8f8;'>");

        html = html.replaceAll("<th>",
                "<th style='border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-weight: 600; color: #333; background-color: #f0f0f0;'>");

        html = html.replaceAll("<td>",
                "<td style='border: 1px solid #ddd; padding: 10px 12px; color: #555;'>");

        // 替换段落样式 - 微信公众号推荐行距和字号
        html = html.replaceAll("<p>",
                "<p style='margin: 12px 0; line-height: 1.75; font-size: 15px; color: #333; text-align: justify;'>");

        // 替换标题样式 - 添加主题色和底部装饰
        html = html.replaceAll("<h1>",
                "<h1 style='font-size: 18px; font-weight: 700; margin: 25px 0 15px; color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 8px; text-align: left;'>");

        html = html.replaceAll("<h2>",
                "<h2 style='font-size: 16px; font-weight: 600; margin: 22px 0 12px; color: #1a73e8; border-left: 4px solid #1a73e8; padding-left: 12px;'>");

        html = html.replaceAll("<h3>",
                "<h3 style='font-size: 15px; font-weight: 600; margin: 18px 0 10px; color: #333;'>");

        html = html.replaceAll("<h4>",
                "<h4 style='font-size: 14px; font-weight: 600; margin: 15px 0 8px; color: #555;'>");

        // 替换列表样式 - 移除多余的 margin，让列表项更紧凑
        html = html.replaceAll("<ul>",
                "<ul style='list-style-type: disc; padding-left: 20px; margin: 8px 0;'>");

        html = html.replaceAll("<ol>",
                "<ol style='list-style-type: decimal; padding-left: 20px; margin: 8px 0;'>");

        // 列表项样式 - 紧凑排列，无额外 margin
        html = html.replaceAll("<li>",
                "<li style='margin: 4px 0; line-height: 1.6; color: #555; font-size: 15px;'>");

        // 替换引用块样式 - 添加左侧边框和背景
        html = html.replaceAll("<blockquote>",
                "<section style='border-left: 4px solid #1a73e8; margin: 20px 0; padding: 15px 20px; background-color: #f8f9fa; color: #666; border-radius: 0 8px 8px 0;'>");

        html = html.replaceAll("</blockquote>",
                "</section>");

        // 替换代码块样式
        html = html.replaceAll("<pre>",
                "<pre style='background-color: #f6f8fa; border: 1px solid #eaecef; border-radius: 6px; padding: 16px; overflow-x: auto; font-family: Consolas, Monaco, monospace; font-size: 13px; line-height: 1.5; color: #24292e; margin: 15px 0;'>");

        html = html.replaceAll("<code>",
                "<code style='background-color: #f6f8fa; border: 1px solid #eaecef; border-radius: 4px; padding: 2px 6px; font-family: Consolas, Monaco, monospace; font-size: 13px; color: #e83e8c;'>");

        // 替换加粗和斜体
        html = html.replaceAll("<strong>",
                "<strong style='font-weight: 600; color: #222;'>");

        html = html.replaceAll("<em>",
                "<em style='font-style: italic; color: #555;'>");

        // 替换删除线
        html = html.replaceAll("<del>",
                "<del style='text-decoration: line-through; color: #999;'>");

        // 替换水平线 - 使用渐变色
        html = html.replaceAll("<hr />",
                "<hr style='border: none; height: 1px; background-image: linear-gradient(to right, rgba(0,0,0,0), rgba(26,115,232,0.5), rgba(0,0,0,0)); margin: 25px 0;'>");

        // 图片样式优化
        html = html.replaceAll("<img ",
                "<img style='max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 8px;' ");

        // 清理多余的换行和空白（针对微信公众号优化）
        html = cleanupHtml(html);

        return html;
    }

    /**
     * 清理 HTML 中的多余换行和空白
     */
    private static String cleanupHtml(String html) {
        // 移除标签之间的多个换行
        html = html.replaceAll(">\\s*\\n\\s*<", "><");
        // 移除连续的空格
        html = html.replaceAll(" {2,}", " ");
        // 移除段落内的多余换行
        html = html.replaceAll("</p>\\s*<p>", "</p><p>");
        // 移除列表项内的多余换行
        html = html.replaceAll("</li>\\s*<li>", "</li><li>");
        return html;
    }

    /**
     * 生成微信公众号完整的文章 HTML（复用邮件模板样式）
     * 此方法生成与邮件模板风格一致的微信公众号文章
     *
     * @param analysis 分析数据
     * @param today    日期
     * @return 完整的 HTML 文章
     */
    public static String generateWechatArticleHtml(HkStockMarketAnalysisVo analysis, String today) {
        StringBuilder html = new StringBuilder();

        // 头部 - 紫色渐变背景
        html.append("<section style='background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 24px 20px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;'>");
        html.append("<div style='position: absolute; top: -30%; right: -5%; width: 150px; height: 150px; background: rgba(255,255,255,0.1); border-radius: 50%;'></div>");
        html.append("<div style='position: absolute; bottom: -20%; left: -3%; width: 100px; height: 100px; background: rgba(255,255,255,0.08); border-radius: 50%;'></div>");
        html.append("<div style='position: relative; z-index: 1;'>");
        html.append("<div style='display: flex; align-items: center; margin-bottom: 12px;'>");
        html.append("<div style='width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-right: 10px;'>");
        html.append("<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'><path d='M13 2L3 14H12L11 22L21 10H12L13 2Z'/></svg>");
        html.append("</div>");
        html.append("<div style='font-size: 13px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;'>Wealth Pulse · 财富脉搏 - 智投</div>");
        html.append("</div>");
        html.append("<h1 style='font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; line-height: 1.3;'>港股市场分析报告</h1>");
        html.append("<p style='font-size: 13px; color: rgba(255,255,255,0.85); margin: 0; line-height: 1.4;'>基于人工智能的港股市场深度分析与投资策略</p>");
        html.append("</div>");
        html.append("</section>");

        // 日期条
        html.append("<div style='background: rgba(99,102,241,0.1); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(99,102,241,0.1);'>");
        html.append("<div style='display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6366f1;'>");
        html.append("<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></svg>");
        html.append("<span>报告日期：").append(today).append("</span>");
        html.append("</div>");
        html.append("<div style='display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6366f1;'>");
        html.append("<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></svg>");
        html.append("<span>AI 模型：Qwen3-Max</span>");
        html.append("</div>");
        html.append("</div>");

        // 新闻统计徽章（如果有数据）
        if (analysis.getNewsSummary() != null) {
            var newsSummary = analysis.getNewsSummary();
            html.append("<div style='background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 14px; margin: 16px; border: 1px solid #fcd34d;'>");
            html.append("<div style='display: flex; justify-content: space-around; align-items: center;'>");
            html.append("<div style='text-align: center;'>");
            html.append("<div style='font-size: 20px; font-weight: 700; color: #92400e;'>").append(newsSummary.getImportantNewsCount()).append("</div>");
            html.append("<div style='font-size: 10px; color: #78350f; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 4px;'>要闻</div>");
            html.append("</div>");
            html.append("<div style='text-align: center;'>");
            html.append("<div style='font-size: 20px; font-weight: 700; color: #92400e;'>").append(newsSummary.getRankNewsCount()).append("</div>");
            html.append("<div style='font-size: 10px; color: #78350f; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 4px;'>大行研报</div>");
            html.append("</div>");
            html.append("<div style='text-align: center;'>");
            html.append("<div style='font-size: 20px; font-weight: 700; color: #92400e;'>").append(newsSummary.getCompanyNewsCount()).append("</div>");
            html.append("<div style='font-size: 10px; color: #78350f; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 4px;'>公司新闻</div>");
            html.append("</div>");
            html.append("<div style='text-align: center;'>");
            html.append("<div style='font-size: 20px; font-weight: 700; color: #92400e;'>").append(newsSummary.getTotalCount()).append("</div>");
            html.append("<div style='font-size: 10px; color: #78350f; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 4px;'>总计</div>");
            html.append("</div>");
            html.append("</div>");
            html.append("</div>");
        }

        // 市场快照
        if (analysis.getMarketSnapshot() != null) {
            html.append("<div style='background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 14px; border: 1px solid #bae6fd; padding: 18px; margin: 16px;'>");
            html.append("<h2 style='font-size: 15px; font-weight: 700; color: #0c4a6e; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid #bae6fd;'>");
            html.append("<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#0284c7' stroke-width='2.5'><path d='M3 3v18h18'/><path d='M18 17V9'/><path d='M13 17V5'/><path d='M8 17v-3'/></svg>");
            html.append("市场快照");
            html.append("</h2>");
            html.append(generateMarketSnapshotHtml(analysis.getMarketSnapshot()));
            html.append("</div>");
        }

        // AI 分析报告
        if (StringUtils.isNotBlank(analysis.getInvestmentReport())) {
            html.append("<div style='background: linear-gradient(135deg, #fafafa, #f5f5f5); border-radius: 12px; border: 1px solid #e5e5e5; padding: 20px; margin: 16px;'>");
            html.append("<h2 style='font-size: 15px; font-weight: 700; color: #374151; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid #e5e5e5;'>");
            html.append("<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#6366f1' stroke-width='2.5'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></svg>");
            html.append("AI 深度分析");
            html.append("</h2>");
            String reportHtml = convertToHtmlForWechat(removeMarkdownCodeBlock(analysis.getInvestmentReport()));
            html.append("<div style='font-size: 14px; line-height: 1.8; color: #374151;'>").append(reportHtml).append("</div>");
            html.append("</div>");
        }

        // 新闻摘要
        if (StringUtils.isNotBlank(analysis.getCompressedNews())) {
            html.append("<div style='background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; border: 1px solid #fcd34d; padding: 18px; margin: 16px;'>");
            html.append("<h2 style='font-size: 13px; font-weight: 700; color: #92400e; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid #fcd34d;'>");
            html.append("<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#78350f' stroke-width='2'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/></svg>");
            html.append("新闻摘要");
            html.append("</h2>");
            String newsHtml = convertToHtmlForWechat(removeMarkdownCodeBlock(analysis.getCompressedNews()));
            html.append("<div style='font-size: 13px; line-height: 1.7; color: #78350f; background: #ffffff; border-radius: 8px; padding: 14px; border: 1px solid #fde68a;'>").append(newsHtml).append("</div>");
            html.append("</div>");
        }

        // 页脚
        html.append("<div style='background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; border-radius: 0 0 16px 16px; margin-top: 20px;'>");
        html.append("<p style='font-size: 12px; color: #9ca3af; line-height: 1.6; margin: 0 0 8px 0;'>此报告由 AI 自动生成，仅供参考，不构成投资建议。</p>");
        html.append("<p style='font-size: 12px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;'>市场有风险，投资需谨慎。</p>");
        html.append("<div style='font-size: 13px; color: #6b7280; font-weight: 600; margin-top: 12px;'>© 2026 Wealth Pulse · 荔影科技</div>");
        html.append("</div>");

        // 清理 HTML 中的多余换行和空白
        return cleanupHtml(html.toString());
    }

    /**
     * 生成市场快照 HTML（复用邮件模板样式，转换为内联样式）
     */
    public static String generateMarketSnapshotHtml(HkStockMarketAnalysisVo.MarketSnapshot snapshot) {
        if (snapshot == null) {
            return "<p style='color: #64748b;'>暂无市场快照数据</p>";
        }

        StringBuilder html = new StringBuilder();

        // 指数表现
        if (snapshot.getIndexPerformance() != null) {
            var index = snapshot.getIndexPerformance();
            html.append("<div style='margin-bottom: 18px;'>");
            html.append("<div style='font-size: 13px; font-weight: 700; color: #0c4a6e; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid #bae6fd;'>");
            html.append("<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#0284c7' stroke-width='2'><path d='M3 3v18h18'/><path d='M18 17V9'/><path d='M13 17V5'/><path d='M8 17v-3'/></svg>");
            html.append("指数表现");
            html.append("</div>");
            html.append("<table style='width: 100%; border-collapse: collapse; font-size: 13px; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e0f2fe;'>");
            html.append("<thead style='background: #e0f2fe;'>");
            html.append("<tr>");
            html.append("<th style='padding: 12px 14px; text-align: left; font-weight: 600; color: #0f172a; font-size: 12px;'>指数名称</th>");
            html.append("<th style='padding: 12px 14px; text-align: left; font-weight: 600; color: #0f172a; font-size: 12px;'>指数代码</th>");
            html.append("<th style='padding: 12px 14px; text-align: right; font-weight: 600; color: #0f172a; font-size: 12px;'>最新价</th>");
            html.append("<th style='padding: 12px 14px; text-align: right; font-weight: 600; color: #0f172a; font-size: 12px;'>涨跌幅</th>");
            html.append("</tr>");
            html.append("</thead>");
            html.append("<tbody>");
            html.append("<tr style='border-bottom: 1px solid #e0f2fe; background-color: #f8fafc;'>");
            html.append("<td style='padding: 12px 14px; color: #1e293b; font-weight: 500;'>").append(index.getIndexName()).append("</td>");
            html.append("<td style='padding: 12px 14px; color: #64748b; text-align: right; font-family: monospace;'>").append(index.getIndexCode() != null ? index.getIndexCode() : "N/A").append("</td>");
            html.append("<td style='padding: 12px 14px; color: #1e293b; text-align: right; font-weight: 700; font-size: 14px;'>");
            html.append(index.getLatestPrice() != null ? String.format("%.2f", index.getLatestPrice()) : "N/A").append("</td>");

            String changeColor = index.getChangeRate() != null && index.getChangeRate() >= 0 ? "#dc2626" : "#16a34a";
            html.append("<td style='padding: 12px 14px; text-align: right; font-weight: 700; color: ").append(changeColor).append("; font-size: 14px;'>");
            if (index.getChangeRate() != null) {
                html.append(index.getChangeRate() >= 0 ? "+" : "").append(String.format("%.2f%%", index.getChangeRate()));
            } else {
                html.append("N/A");
            }
            html.append("</td>");
            html.append("</tr>");
            html.append("</tbody>");
            html.append("</table>");
            html.append("</div>");
        }

        // 外部情绪
        if (snapshot.getExternalSentiment() != null) {
            var external = snapshot.getExternalSentiment();
            if (external.getIndexName() != null) {
                html.append("<div style='margin-bottom: 18px;'>");
                html.append("<div style='font-size: 13px; font-weight: 700; color: #0c4a6e; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid #bae6fd;'>");
                html.append("<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#0284c7' stroke-width='2'><path d='M13 2L3 14H12L11 22L21 10H12L13 2z'/></svg>");
                html.append("外部情绪");
                html.append("</div>");
                html.append("<div style='background: #ffffff; border-radius: 10px; padding: 14px; border: 1px solid #e0f2fe;'>");
                html.append("<div style='font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 6px;'>").append(external.getIndexName()).append("</div>");
                if (external.getLatestPrice() != null) {
                    String changeColor = external.getChangeRate() != null && external.getChangeRate() >= 0 ? "#dc2626" : "#16a34a";
                    html.append("<div style='font-size: 18px; font-weight: 700; color: #1e293b;'>");
                    html.append(String.format("%.2f", external.getLatestPrice()));
                    if (external.getChangeRate() != null) {
                        html.append("<span style='font-size: 12px; font-weight: 600; margin-left: 8px; color: ").append(changeColor).append(";'>");
                        html.append(external.getChangeRate() >= 0 ? "+" : "").append(String.format("%.2f%%", external.getChangeRate()));
                        html.append("</span>");
                    }
                    html.append("</div>");
                }
                if (StringUtils.isNotBlank(external.getNote())) {
                    html.append("<div style='font-size: 11px; color: #64748b; margin-top: 6px;'>").append(external.getNote()).append("</div>");
                }
                html.append("</div>");
                html.append("</div>");
            }
        }

        return cleanupHtml(html.toString());
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
