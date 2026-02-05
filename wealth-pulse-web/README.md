# Wealth Pulse Web

> A personal Hong Kong stock investment tracking & AI-assisted analysis dashboard  
> 用于维护个人港股 / 股票投资记录的可视化与 AI 辅助分析平台前端

---

## 简介（中文）

**Wealth Pulse Web** 是一个基于浏览器的投资记录与分析面板，主要用于：

- **集中管理投资资金与交易记录**：支持资金入金/出金流水、买入/卖出交易明细管理。
- **跟踪持仓与资产表现**：按标的汇总持仓成本、浮动盈亏和整体收益率。
- **实时看盘与可视化看板**：仪表盘展示总资产、收益、现金、仓位等核心指标，并提供市场监控面板。
- **AI 交易复盘 & 市场解读实验室（AI Lab）**：基于 Google Gemini 的 AI 能力，对交易记录进行打分、生成文字诊断和市场展望。

当前项目为前端单页应用（SPA），可以与本地/远程后端（如 Java 服务）对接，也内置了使用 `localStorage` 的模拟后端，方便本地单机使用与 Demo。

---

## 技术栈（中文）

- **框架 & 语言**
  - **React 19**：现代前端 UI 框架，用于构建整个平台的组件与页面（函数组件 + Hooks）。
  - **TypeScript 5**：为数据结构（交易、资金流水、配置等）提供静态类型约束。
- **构建与开发工具**
  - **Vite 6**：极速本地开发服务器与打包工具，内置 `@vitejs/plugin-react`。
  - **ES Modules**：`"type": "module"`，与 Vite 配套使用。
- **数据可视化 & UI**
  - **Recharts 3**：用于绘制资产曲线、历史价格等图表（如 Dashboard 中的收益图）。
  - **Tailwind 风格的原子类 / 自定义 CSS 类名**：用于布局和组件样式（类名中大量 `bg-` / `text-` / `rounded-` 等）。
- **AI 能力**
  - **@google/genai**：接入 Google Gemini 模型，用于：
    - 交易行为打分与文字理由（交易复盘）。
    - 多标的组合的市场展望与诊断（Dashboard & AI Lab）。
  - 通过 `process.env.GEMINI_API_KEY` 注入 API Key（由 Vite 的 `define` 注入）。
- **工具库**
  - **html-to-image**：将看板或图表导出为图片（如分享报表、截图功能）。
  - **qrcode**：用于生成分享链接或配置的二维码。
- **HTTP & 后端接入**
  - 自封装 `HttpClient`（`services/http.ts`）：
    - 自动附带 JWT Token（`Authorization: Bearer ...`）到请求头。
    - 在 401/403 时自动清理本地状态并刷新回登录页。
  - **本地模拟后端**（`services/backend.ts`）：
    - 使用 `localStorage` 持久化交易记录、资金流水与系统配置。
    - 默认注入一批示例交易（含 AI 评分与建议），方便即开即用。
  - **真实后端代理**：
    - `vite.config.ts` 中配置了 `server.proxy`，将 `/api` 请求转发到 `http://localhost:9090`（可对接实际 Java 后端）。
- **多语言与国际化**
  - 自定义 `i18n` 模块与 `I18nContext`（`App.tsx`）：
    - 内置 **中英文** 文案字典。
    - 用户语言偏好（`pulse_lang`）存于 `localStorage`，登录状态存于 `pulse_auth`。

---

## 主要功能模块（中文）

- **登录页 `Login`**
  - 简单认证入口，登录成功后写入本地登录标记与 Token（由后端或模拟流程提供）。
- **仪表盘 `Dashboard`**
  - 展示总资产、累计收益、持仓市值、现金余额、投入本金等核心指标。
  - 使用 `Recharts` 绘制资产/价格曲线。
  - 集成 AI 市场诊断卡片，展示组合的简要展望与建议。
- **持仓页 `Holdings`**
  - 汇总每个标的的持仓数量、平均成本、浮动盈亏。
  - 支持一键全部卖出，生成对应卖出交易记录。
- **流水 & 记录 `Records`**
  - 资金流水（入金/出金）与交易流水（买入/卖出）的列表视图。
- **AI 实验室 `AILab`**
  - 支持批量导入历史交易。
  - 基于 Gemini 自动生成交易评分和中文/英文的复盘建议。
  - 支持更新单笔交易的 AI 诊断结果（如复盘备注、情绪标记等）。
- **市场搜索 / 看盘 `MarketSearch` + `LiveMarketWatch`**
  - 使用预置价格历史模拟实时行情，并提供快速下单入口。
- **设置页 `Settings`**
  - 管理通知渠道与偏好（邮件、飞书 Webhook、复盘完成提醒等）。
- **帮助页 `Help`**
  - 说明平台使用方式与常见问题（可按需补充）。

侧边栏 `Sidebar` 负责全局导航，`Modal` 组件提供资金调度、下单等弹窗交互。

---

## 运行与开发（中文）

### 环境要求

- Node.js 18+（建议）  
- PNPM / NPM / Yarn 其一

### 安装依赖

```bash
pnpm install
# 或者
npm install
```

### 本地开发

```bash
pnpm dev
# 默认在 http://localhost:9000 启动（见 vite.config.ts）
```

- 开发时，所有以 `/api` 开头的请求会被代理到 `http://localhost:9090`，请确保后端服务已在该端口启动，或根据需要修改 `vite.config.ts`。
- 如果没有后端，也可以仅使用内置的 `localStorage` 模拟数据（交易与资金流水会存储在浏览器本地）。

### 构建与预览

```bash
pnpm build
pnpm preview
```

---

## 环境变量与 AI 配置（中文）

- 在项目根目录下创建 `.env` 文件（或按环境创建 `.env.development` / `.env.production` 等），并配置：

```bash
GEMINI_API_KEY=你的_Gemini_API_Key
```

- Vite 会在构建时将其注入到：
  - `process.env.API_KEY`
  - `process.env.GEMINI_API_KEY`

前端通过 `@google/genai` 调用 Gemini 接口，用于 AI 诊断与复盘功能。

---

## 数据存储策略（中文）

- **本地浏览器存储**
  - 交易记录：`localStorage['stock_transactions']`
  - 资金流水：`localStorage['stock_capital']`
  - 系统配置：`localStorage['app_config']`
- **登录状态 & Token**
  - JWT Token：`localStorage['pulse_token']`
  - 登录标记：`localStorage['pulse_auth']`
- **语言偏好**
  - 当前语言：`localStorage['pulse_lang']`

根据个人使用习惯，可以将这些数据与真实后端对接，替换/扩展当前的本地存储逻辑。

---

## English Overview

### Introduction

**Wealth Pulse Web** is a browser-based dashboard designed for **personal Hong Kong stock / equity investment tracking**. It focuses on:

- **Capital & trade management**: track deposits/withdrawals and detailed buy/sell records.
- **Portfolio & performance monitoring**: aggregate positions by symbol, calculate P&L and overall return.
- **Real-time styled dashboard**: visualize total assets, profit, cash, and holdings with charts and live market watch.
- **AI-powered trade review & market insights (AI Lab)**: leverage Google Gemini to score trades and generate qualitative analysis.

The project is a pure frontend SPA that can work with a real backend (e.g. a Java service behind `/api`) or run purely with a `localStorage`-based mock backend for local/demo usage.

---

### Tech Stack

- **Framework & Language**
  - **React 19** with functional components and Hooks.
  - **TypeScript 5** for strong typing over domain models (transactions, capital logs, config, etc.).
- **Build & Tooling**
  - **Vite 6** with `@vitejs/plugin-react` for fast dev server and bundling.
  - ES Modules (`"type": "module"`).
- **Visualization & UI**
  - **Recharts 3** for price/performance charts on the dashboard.
  - Utility-first CSS class naming (Tailwind-like style) for layouts and styling.
- **AI Integration**
  - **@google/genai** to access Google Gemini:
    - trade scoring and reasoning (trade review),
    - portfolio-level market outlook.
  - API key injected via `process.env.GEMINI_API_KEY` using Vite `define`.
- **Utilities**
  - **html-to-image** to export dashboards or charts as shareable images.
  - **qrcode** to generate QR codes for sharing links or configuration.
- **HTTP & Backend Integration**
  - Custom `HttpClient` wrapper with:
    - automatic JWT `Authorization` header,
    - auto-handling of 401/403 by clearing local state and redirecting to login.
  - **Mock backend** (`services/backend.ts`) using `localStorage` with seeded demo data.
  - Dev-time proxy from `/api` to `http://localhost:9090` configured in `vite.config.ts`.
- **Internationalization**
  - Custom `i18n` module and `I18nContext` with **Chinese & English** dictionaries.

---

### Main Features

- **Login page**
  - Simple authentication entry, stores auth flag and token (provided by backend or mock flow).
- **Dashboard**
  - KPIs: total assets, cumulative profit, market value, cash balance, principal.
  - Asset/performance charts using Recharts.
  - AI diagnosis card showing portfolio outlook and suggestions.
- **Holdings**
  - Aggregated positions with quantity, average cost, and unrealized P&L.
  - Quick sell actions that create corresponding sell trades.
- **Records**
  - Lists of capital logs (deposits/withdrawals) and trade logs (buy/sell).
- **AI Lab**
  - Batch import of historical trades.
  - Gemini-based scoring and textual review for each trade.
  - Update single trade with refined AI diagnosis and notes.
- **Market Search & Live Watch**
  - Simulated price history & quick trade entries.
- **Settings**
  - Notification channels and preferences (email, Feishu webhook, review completed alerts, etc.).
- **Help**
  - Usage guide and FAQs (to be customized as needed).

Global navigation and layout are handled by a `Sidebar` and reusable `Modal` components.

---

### Getting Started

#### Prerequisites

- Node.js 18+  
- PNPM / NPM / Yarn

#### Install

```bash
pnpm install
# or
npm install
```

#### Development

```bash
pnpm dev
```

- Dev server runs at `http://localhost:9000` by default.  
- `/api` requests are proxied to `http://localhost:9090`; adjust `vite.config.ts` if your backend runs elsewhere.  
- Without a backend, the app still works with local `localStorage` data only.

#### Build & Preview

```bash
pnpm build
pnpm preview
```

---

### Environment Variables & AI

Create an `.env` (or `.env.development`, `.env.production`, etc.) file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key
```

Vite injects this value to `process.env.API_KEY` and `process.env.GEMINI_API_KEY`, which are consumed by `@google/genai` for AI features.

---

### Data Storage (Client-Side)

- **Domain data**
  - `localStorage['stock_transactions']` – trade history
  - `localStorage['stock_capital']` – capital logs
  - `localStorage['app_config']` – app configuration & notification settings
- **Auth & preferences**
  - `localStorage['pulse_token']` – JWT token
  - `localStorage['pulse_auth']` – login flag
  - `localStorage['pulse_lang']` – current language

You can later migrate or sync these data structures to a real backend according to your infrastructure and risk preferences.

