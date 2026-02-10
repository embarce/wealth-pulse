# Swagger API 调试指南

本文档介绍如何使用 Swagger UI 在网页上直接调试 Wealth Pulse API。

## 访问 Swagger UI

启动应用后，在浏览器中访问：

```
http://localhost:9000/docs
```

## 完整调试流程

### 第一步：获取访问令牌 (Token)

1. 在 Swagger UI 页面找到 `authentication` 分组
2. 展开 `POST /api/auth/token` 端点
3. 点击 "Try it out" 按钮
4. 在请求体中输入凭据：
   ```json
   {
     "client_id": "wealth-pulse-java",
     "client_secret": "wealth-pulse-client-secret"
   }
   ```
5. 点击 "Execute" 执行请求
6. 在响应体中复制 `access_token` 的值（很长的字符串）

### 第二步：配置认证 (Authorize)

1. 点击页面右上角的 **🔓 Authorize** 按钮（锁图标）
2. 在弹出的对话框中输入：
   ```
   Bearer YOUR_ACCESS_TOKEN
   ```
   **注意：** 将 `YOUR_ACCESS_TOKEN` 替换为第一步复制的实际 token
3. 点击 "Authorize" 按钮
4. 点击 "Close" 关闭对话框

**重要提示：** 现在你已经授权，可以访问所有需要认证的端点了！

### 第三步：调试 API 端点

#### 示例 1：获取所有股票列表

1. 找到 `stocks` 分组中的 `GET /api/stocks/` 端点
2. 点击 "Try it out"
3. 可选：调整 `skip` 和 `limit` 参数
4. 点击 "Execute"
5. 查看响应结果

#### 示例 2：获取特定股票信息

1. 找到 `GET /api/stocks/{stock_code}` 端点
2. 点击 "Try it out"
3. 在 `stock_code` 字段输入股票代码，例如：
   - `0700.HK` (腾讯)
   - `NVDA.US` (英伟达)
   - `AAPL.US` (苹果)
4. 点击 "Execute"
5. 查看响应结果

#### 示例 3：获取市场行情数据

1. 找到 `GET /api/stocks/{stock_code}/market-data` 端点
2. 点击 "Try it out"
3. 输入 `stock_code`，例如 `0700.HK`
4. 可选：指定 `market_date` (格式：YYYY-MM-DD)
5. 点击 "Execute"
6. 查看响应结果

#### 示例 4：获取历史数据

1. 找到 `GET /api/stocks/{stock_code}/history` 端点
2. 点击 "Try it out"
3. 输入 `stock_code`，例如 `0700.HK`
4. 可选：设置 `start_date` 和 `end_date`
5. 可选：调整 `limit` 参数
6. 点击 "Execute"

#### 示例 5：刷新市场数据

1. 找到 `POST /api/stocks/refresh` 端点
2. 点击 "Try it out"
3. 在请求体中输入要刷新的股票代码数组：
   ```json
   ["0700.HK", "NVDA.US", "AAPL.US"]
   ```
4. 点击 "Execute"
5. 查看刷新结果

## 公共端点（无需认证）

以下端点**不需要**认证即可使用：

- `GET /health/` - 健康检查
- `GET /api/stocks/public/list` - 获取股票列表（公共端点）
- `POST /api/auth/token` - 获取访问令牌
- `GET /` 和 `GET /ping` - 根端点和 ping

## 常见问题

### Q: 如何知道我已成功授权？

**A:** 授权成功后，右上角的锁图标会变成关闭状态 🔒。同时，当你执行需要认证的请求时，不会再收到 401 Unauthorized 错误。

### Q: Token 过期了怎么办？

**A:** Token 有效期为 24 小时。过期后需要重新获取：
1. 再次调用 `POST /api/auth/token` 获取新的 token
2. 点击 "Authorize" 按钮更新 token
3. 或者使用 `POST /api/auth/refresh` 端点刷新 token

### Q: 收到 401 Unauthorized 错误？

**A:** 检查以下几点：
1. 是否已正确点击 "Authorize" 并输入 token
2. Token 格式是否正确：`Bearer YOUR_TOKEN`（注意 Bearer 前缀和空格）
3. Token 是否已过期（24小时有效期）
4. Token 是否完整复制（没有遗漏字符）

### Q: 收到 404 Not Found 错误？

**A:** 可能原因：
1. 股票代码不存在或格式错误
2. 股票代码需要在数据库中存在，如果不存在会自动从 yfinance 获取
3. 检查股票代码格式：港股用 `.HK` 后缀，美股用 `.US` 后缀

### Q: 响应数据为空？

**A:** 可能原因：
1. 数据库中还没有数据（定时任务还未运行）
2. 可以调用 `POST /api/stocks/refresh` 手动刷新数据
3. 检查定时任务是否正常运行（查看日志）

## 股票代码格式

### 港股
- 格式：`{代码}.HK`
- 示例：
  - `0700.HK` - 腾讯控股
  - `9988.HK` - 阿里巴巴
  - `0941.HK` - 中国移动

### 美股
- 格式：`{代码}.US`
- 示例：
  - `NVDA.US` - 英伟达
  - `AAPL.US` - 苹果
  - `TSLA.US` - 特斯拉
  - `MSFT.US` - 微软

### yfinance 格式（用于内部处理）
- 港股：`0700.HK`
- 美股：`NVDA`（不需要 .US 后缀）

## 响应状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 401 | 未授权 - Token 无效或缺失 |
| 404 | 资源未找到 |
| 422 | 请求参数验证失败 |
| 500 | 服务器内部错误 |

## 快速测试命令

### 使用 curl 测试

```bash
# 1. 获取 token
TOKEN=$(curl -X POST http://localhost:9000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"wealth-pulse-java","client_secret":"wealth-pulse-client-secret"}' \
  | jq -r '.access_token')

# 2. 获取所有股票
curl http://localhost:9000/api/stocks/ \
  -H "Authorization: Bearer $TOKEN"

# 3. 获取腾讯股票信息
curl http://localhost:9000/api/stocks/0700.HK \
  -H "Authorization: Bearer $TOKEN"

# 4. 获取市场数据
curl http://localhost:9000/api/stocks/0700.HK/market-data \
  -H "Authorization: Bearer $TOKEN"

# 5. 刷新数据
curl -X POST http://localhost:9000/api/stocks/refresh \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '["0700.HK", "NVDA.US"]'
```

### 使用 Python 测试

```python
import requests

BASE_URL = "http://localhost:9000"

# 1. 获取 token
response = requests.post(f"{BASE_URL}/api/auth/token", json={
    "client_id": "wealth-pulse-java",
    "client_secret": "wealth-pulse-client-secret"
})
token = response.json()["access_token"]

headers = {"Authorization": f"Bearer {token}"}

# 2. 获取所有股票
response = requests.get(f"{BASE_URL}/api/stocks/", headers=headers)
print(response.json())

# 3. 获取市场数据
response = requests.get(f"{BASE_URL}/api/stocks/0700.HK/market-data", headers=headers)
print(response.json())
```

## 下一步

- 查看 [JAVA_INTEGRATION.md](JAVA_INTEGRATION.md) 了解如何在 Java 项目中集成
- 查看 [README.md](README.md) 了解完整的 API 文档
- 定时任务每 5 分钟自动刷新数据，也可以手动调用刷新端点
