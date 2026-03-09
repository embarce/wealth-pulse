# Wealth Pulse Web

> React 前端应用

[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple)](https://vitejs.dev/)

**语言:** [English](./README.md) | 中文

**父项目:** [Wealth Pulse](../README.md)

---

## 简介

Wealth Pulse Web 是一个现代化的 React 前端应用，用于 Wealth Pulse 投资跟踪平台。提供以下功能：

- 交互式仪表盘与实时投资组合可视化
- AI 驱动的交易分析和市场洞察
- 股票投资组合管理
- 交易历史和资金流向跟踪
- 多语言支持（中文/英文）
- 响应式设计，支持移动和桌面端

---

## 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | React 19 |
| 语言 | TypeScript 5.8 |
| 构建工具 | Vite 6 |
| 图表 | Recharts 3.7 |
| K 线图 | klinecharts 10.0.0-beta1 |
| AI | @google/genai 1.38 |
| 工具 | html-to-image, qrcode |

---

## 项目结构

```
wealth-pulse-web/
├── pages/              # 页面组件
│   ├── Dashboard.tsx   # 主仪表盘
│   ├── Holdings.tsx    # 持仓管理
│   ├── Records.tsx     # 交易历史
│   ├── AILab.tsx       # AI 分析功能
│   ├── MarketSearch.tsx # 股票搜索
│   └── Settings.tsx    # 用户设置
├── components/         # 可复用组件
├── services/           # API 客户端
│   ├── http.ts         # HTTP 客户端
│   ├── aiAnalysis.ts   # AI 分析服务
│   └── stockApi.ts     # 股票 API 封装
├── App.tsx             # 主应用组件
├── i18n.ts             # 国际化
├── types.ts            # TypeScript 类型
├── constants.ts        # 常量
├── index.html
├── vite.config.ts
└── package.json
```

---

## 快速开始

### 前置要求

- Node.js 18+
- pnpm 或 npm

### 1. 安装依赖

```bash
cd wealth-pulse-web

pnpm install
# 或 npm install
```

### 2. 配置环境

在项目根目录创建 `.env` 文件：

```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### 3. 运行开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:9000 可用

### 4. 生产构建

```bash
pnpm build
pnpm preview
```

---

## 功能

### 仪表盘

- 投资组合概览与关键指标
- 资产配置图表
- 盈亏可视化
- AI 市场展望

### 持仓管理

- 实时仓位跟踪
- 成本价计算
- 单只股票盈亏分析
- 快捷卖出操作

### 交易记录

- 买入/卖出历史
- 资金流向日志
- 过滤和搜索功能
- 数据导出

### AI 实验室

- AI 交易评分与理由
- 市场分析洞察
- 券商截图分析
- 批量导入交易

### 市场搜索

- 实时股票报价
- 快捷交易操作
- 股票详情查看
- K 线图表

---

## API 集成

### 后端 API 代理

开发服务器将 `/api` 请求代理到后端：

- **后端**: http://localhost:9090
- **前端**: http://localhost:9000

配置在 `vite.config.ts` 中。

### HTTP 客户端

`services/http.ts` 客户端处理：

- JWT 令牌注入
- 401/403 错误处理
- 认证失败时重定向到登录页

### LocalStorage 键

| 键 | 描述 |
|-----|-------------|
| `pulse_token` | JWT 认证令牌 |
| `pulse_auth` | 登录状态标志 |
| `pulse_lang` | 语言偏好 |
| `stock_transactions` | 交易记录 |
| `stock_capital` | 资金流向日志 |
| `app_config` | 应用配置 |

---

## 国际化

应用支持中文和英文，具有自动语言检测。

### 切换语言

使用 UI 中的语言选择器，或在 localStorage 中设置：

```javascript
localStorage.setItem('pulse_lang', 'zh'); // 或 'en'
```

### 添加新语言

编辑 `i18n.ts` 添加新翻译：

```typescript
translations: {
  en: { welcome: 'Welcome' },
  zh: { welcome: '欢迎' },
  // 在此添加你的语言
}
```

---

## AI 功能

### Google Gemini 集成

AI 功能由 Google Gemini 驱动：

- **交易评分**: 分析交易并提供理由
- **市场展望**: 生成投资组合级别的洞察
- **截图分析**: 从券商截图中提取交易

### 配置 AI

在 `.env` 中设置 Gemini API 密钥：

```bash
GEMINI_API_KEY=your_api_key_here
```

---

## 开发

### 可用脚本

```bash
# 开发服务器
pnpm dev

# 生产构建
pnpm build

# 预览生产构建
pnpm preview

# 类型检查
tsc --noEmit
```

### 项目约定

- **组件**: 使用 Hooks 的函数组件
- **状态**: Props 传递（无 Redux/Context）
- **样式**: Tailwind 风格工具类
- **类型**: TypeScript 接口在 `types.ts` 中定义

---

## 集成

### 后端 API

此前端通过 Java Spring Boot 后端进行所有数据操作。

详见 [Java API](../wealth-pulse-api/README.md)。

### Python 服务

后端与 Python 股票数据服务集成。

详见 [Python 服务](../wealth-pulse-python/README.md)。

---

## 故障排除

### 无法连接后端

- 确保后端在端口 9090 上运行
- 检查 `vite.config.ts` 中的代理配置
- 验证 `localStorage.pulse_token` 中存在 JWT 令牌

### AI 功能不工作

- 检查 `.env` 中是否设置了 `GEMINI_API_KEY`
- 验证 API 密钥有效
- 检查浏览器控制台错误

### 构建失败

- 删除 `node_modules` 并运行 `pnpm install`
- 清除 Vite 缓存：`rm -rf node_modules/.vite`
- 检查 TypeScript 错误：`tsc --noEmit`

---

## 文档

- [主项目 README](../README.md)
- [Java API](../wealth-pulse-api/README.md)
- [Python 服务](../wealth-pulse-python/README.md)
- [CLAUDE.md](../CLAUDE.md) - 开发指南

---

## 许可证

MIT License

---

## 支持

如有问题或建议，请在 GitHub 上提交 issue 或参考 [主 README](../README.md)。
