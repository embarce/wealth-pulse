import React, { useContext, useState, useEffect } from 'react';
import { I18nContext } from '../App';

interface MarkdownViewerProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  isOpen,
  onClose,
  content,
  title = 'Report'
}) => {
  const { t } = useContext(I18nContext);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (content && isOpen) {
      // Simple markdown to HTML conversion
      const converted = convertMarkdownToHtml(content);
      setHtmlContent(converted);
    }
  }, [content, isOpen]);

  const convertMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';

    let html = markdown;

    // Escape HTML special characters first (but preserve existing HTML)
    html = html.replace(/&(?!(?:amp|lt|gt|quot|#39|nbsp);)/g, '&amp;')
               .replace(/<(?!\/?(h[1-6]|p|br|ul|ol|li|strong|em|code|pre|blockquote|hr|a|img|div|span|table|thead|tbody|tr|th|td)\b)/g, '&lt;');

    // Headers (must process before other inline elements)
    html = html.replace(/^###### (.*$)/gim, '<h6 class="text-sm font-bold mt-4 mb-2 text-slate-700">$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5 class="text-base font-bold mt-4 mb-2 text-slate-700">$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4 class="text-lg font-bold mt-5 mb-3 text-slate-800">$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-slate-800">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-slate-200 text-slate-900">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black mt-8 mb-4 pb-3 border-b-2 border-slate-300 text-slate-900">$1</h1>');

    // Bold (before italic to avoid conflicts)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-black">$1</strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    html = html.replace(/_(.*?)_/g, '<em class="italic">$1</em>');

    // Strikethrough
    html = html.replace(/~~(.*?)~~/g, '<del class="line-through text-slate-400">$1</del>');

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-50 rounded-r-lg text-slate-600 italic">$1</blockquote>');

    // Code blocks (``` fenced code)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="bg-slate-900 text-slate-100 p-4 rounded-xl my-4 overflow-x-auto border border-slate-700"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    // Inline code (before links to avoid conflicts)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-rose-600 px-2 py-1 rounded-md text-sm font-mono border border-slate-200">$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline font-medium">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-xl my-4 shadow-lg border border-slate-200" />');

    // Horizontal rule
    html = html.replace(/^---$/gim, '<hr class="my-6 border-t-2 border-slate-200" />');

    // Markdown Tables (must process before lists and line breaks)
    // Table regex: matches tables with | separators and --- delimiter row
    html = html.replace(/^(\|.*\|)\n(\|[ \t]*[-:|]+[-:| \t]*\|)\n((?:\|.*\|(\n|$))+)/gm, (match, headerRow, delimiterRow, bodyRows) => {
      // Parse header cells
      const headers = headerRow.split('|').filter(cell => cell.trim() !== '');
      // Parse delimiter row to get alignment
      const delimiters = delimiterRow.split('|').filter(cell => cell.trim() !== '');
      // Parse body rows
      const rows = bodyRows.trim().split('\n').filter(row => row.trim().startsWith('|'));

      let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-slate-300 text-sm">';

      // Table header
      tableHtml += '<thead class="bg-slate-50">';
      tableHtml += '<tr>';
      headers.forEach((header, idx) => {
        const align = getAlignment(delimiters[idx]);
        tableHtml += `<th class="border border-slate-300 px-4 py-2 font-bold text-slate-700 text-${align}">${parseInline(header.trim())}</th>`;
      });
      tableHtml += '</tr>';
      tableHtml += '</thead>';

      // Table body
      tableHtml += '<tbody>';
      rows.forEach(row => {
        const cells = row.split('|').filter(cell => cell.trim() !== '');
        tableHtml += '<tr>';
        cells.forEach((cell, idx) => {
          const align = getAlignment(delimiters[idx]);
          tableHtml += `<td class="border border-slate-300 px-4 py-2 text-slate-600 text-${align}">${parseInline(cell.trim())}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody>';
      tableHtml += '</table></div>';

      return tableHtml;
    });

    // Unordered lists
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-700 py-1">$1</li>');
    // Wrap consecutive li elements in ul
    html = html.replace(/(<li class="ml-4 list-disc.*<\/li>\n?)+/g, (match) => {
      return `<ul class="my-4 space-y-1">${match}</ul>`;
    });

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-slate-700 py-1">$1</li>');
    // Wrap consecutive li elements in ol
    html = html.replace(/(<li class="ml-4 list-decimal.*<\/li>\n?)+/g, (match) => {
      return `<ol class="my-4 space-y-1">${match}</ol>`;
    });

    // Line breaks (single newline to <br>, double newline to paragraph)
    html = html.replace(/\n\n/g, '</p><p class="my-3 text-slate-700 leading-relaxed">');
    html = html.replace(/\n(?![\/])/g, '<br/>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = '<p class="my-3 text-slate-700 leading-relaxed">' + html + '</p>';
    }

    // Clean up empty paragraphs
    html = html.replace(/<p class="my-3 text-slate-700 leading-relaxed"><\/p>/g, '');
    html = html.replace(/<p class="my-3 text-slate-700 leading-relaxed">\s*<br\/>\s*<\/p>/g, '');

    return html;
  };

  /**
   * Get text alignment based on markdown table delimiter
   */
  const getAlignment = (delimiter: string): string => {
    if (!delimiter) return 'left';
    const trimmed = delimiter.trim();
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
    if (trimmed.endsWith(':')) return 'right';
    return 'left';
  };

  /**
   * Parse inline markdown elements (bold, italic, code, links)
   */
  const parseInline = (text: string): string => {
    if (!text) return text;

    let result = text;

    // Escape HTML
    result = result.replace(/&(?!(?:amp|lt|gt|quot|#39|nbsp);)/g, '&amp;')
                   .replace(/</g, '&lt;');

    // Bold
    result = result.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-black">$1</strong>');
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');

    // Italic
    result = result.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // Inline code
    result = result.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-rose-600 px-2 py-1 rounded-md text-sm font-mono border border-slate-200">$1</code>');

    // Links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline font-medium">$1</a>');

    return result;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto flex flex-col">
          {/* Header */}
          <div className="px-6 lg:px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-lg lg:text-xl font-black text-slate-800">{title}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(content);
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                title="Copy content"
              >
                <i className="fas fa-copy"></i>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div
              className="prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>

          {/* Footer */}
          <div className="px-6 lg:px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MarkdownViewer;
