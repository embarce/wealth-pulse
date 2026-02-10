# yfinance API 优化指南

## 问题分析

### 原始实现的问题

1. **频繁请求导致限制风险**
   - 14 只股票 × 2 次调用（info + market_data）= **28 次请求/次**
   - 每 5 分钟执行 = **336 次请求/小时**
   - 连续无延迟请求 → **容易触发 Yahoo Finance 限制**

2. **重复获取不常变化的数据**
   - `stock_info`（公司名、行业等）很少变化
   - 每 5 分钟都更新 → 浪费 API 调用

3. **单次请求效率低**
   - 对每个股票单独请求 → 网络开销大
   - 未利用 yfinance 的批量功能

## 优化方案

### 1. 批量请求 (Batch Mode)

**核心改进**：使用 `yfinance.Tickers()` 和 `download()` 一次性获取所有股票数据

```python
# 旧方式 (Individual Mode)
for symbol in symbols:
    ticker = yf.Ticker(symbol)
    info = ticker.info  # 1 次请求
    hist = ticker.history()  # 1 次请求

# 新方式 (Batch Mode)
tickers = yf.Tickers(symbols)  # 1 次请求获取所有 info
data = yf.download(symbols, period="5d", group_by='ticker')  # 1 次请求获取所有历史数据
```

**效果**：
- 旧方式：28 次请求/次
- 新方式：**1-2 次请求/次**（所有股票）
- 减少 **96%** 的 API 调用

### 2. 智能更新策略

**策略**：`stock_info` 仅在必要时更新

| 数据类型 | 更新频率 | 原因 |
|---------|---------|------|
| `stock_info` | 每天一次或首次创建 | 公司名、行业等很少变化 |
| `market_data` | 每 5 分钟 | 价格、涨跌幅等实时变化 |

**实现逻辑**：
```python
def _should_update_stock_info(now: datetime, db: Session) -> bool:
    # 检查最后更新时间
    latest_stock = db.query(StockInfo).order_by(StockInfo.update_time.desc()).first()

    # 如果超过 24 小时未更新，则更新
    return (now - latest_stock.update_time) > timedelta(hours=24)
```

**效果**：
- 减少不必要的 `stock_info` API 调用
- 仅在数据实际过期时才更新

### 3. 请求延迟和重试

**配置参数**（`app/core/config.py`）：
```python
YFINANCE_REQUEST_DELAY: float = 0.5  # 请求间延迟（秒）
YFINANCE_MAX_RETRIES: int = 3        # 最大重试次数
YFINANCE_USE_BATCH: bool = True      # 是否使用批量模式
```

**重试策略**：
- 失败后使用指数退避重试
- 延迟时间：0.5s → 1s → 2s

## 性能对比

### API 调用次数对比

| 模式 | 每次刷新请求数 | 每小时请求数 | 改进幅度 |
|------|---------------|-------------|---------|
| **旧版（单独请求）** | 28 次 | 336 次 | 基准 |
| **新版（批量请求）** | 1-2 次 | 12-24 次 | **减少 93-96%** |

### 执行时间对比

| 模式 | 预估执行时间（14 只股票） | 说明 |
|------|------------------------|------|
| **旧版** | 15-30 秒 | 串行请求，每次 0.5-1 秒延迟 |
| **新版** | 3-5 秒 | 批量请求，并行获取数据 |

### 触发限制风险

| 场景 | 旧版风险 | 新版风险 |
|------|---------|---------|
| **每小时请求次数** | 336 次（高） | 12-24 次（低） |
| **连续请求间隔** | < 0.1 秒 | N/A（批量一次完成） |
| **触发限制可能性** | **高** | **极低** |

## 数据库迁移

### 添加时间戳字段

`StockInfo` 模型新增了 `create_time` 和 `update_time` 字段用于跟踪更新。

**迁移 SQL**（MySQL）：

```sql
-- 添加 create_time 字段
ALTER TABLE tb_stock_info
ADD COLUMN create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';

-- 添加 update_time 字段
ALTER TABLE tb_stock_info
ADD COLUMN update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

-- 为已有记录设置默认值
UPDATE tb_stock_info SET create_time = NOW(), update_time = NOW() WHERE create_time IS NULL;
```

**或使用 Alembic 迁移**：

```bash
# 生成迁移脚本
alembic revision --autogenerate -m "add timestamps to stock_info"

# 执行迁移
alembic upgrade head
```

## 配置选项

### 环境变量配置

在 `.env` 文件中添加：

```bash
# API 优化配置
YFINANCE_USE_BATCH=true          # 使用批量模式（推荐）
YFINANCE_REQUEST_DELAY=0.5       # 请求延迟（秒）
YFINANCE_MAX_RETRIES=3           # 重试次数
```

### 模式切换

**批量模式**（推荐，默认）：
```python
# app/core/config.py
YFINANCE_USE_BATCH: bool = True
```

**单独模式**（调试或批量失败时回退）：
```python
YFINANCE_USE_BATCH: bool = False
```

## 使用示例

### 1. 批量获取数据（推荐）

```python
from app.services.yfinance_batch_service import yfinance_batch_service

symbols = ['NVDA', 'AAPL', 'MSFT', '0700.HK']

# 获取所有股票的 info 和 market_data（1 次调用）
results = yfinance_batch_service.get_batch_combined_data(symbols)

for symbol, data in results.items():
    stock_info = data['info']
    market_data = data['market_data']

    print(f"{symbol}: {market_data['last_price']}")
```

### 2. 仅获取 market_data（批量）

```python
# 仅获取市场数据（如果你确定 stock_info 已存在）
market_data = yfinance_batch_service.get_batch_market_data(symbols)
```

### 3. 调度器自动使用批量模式

```python
# app/tasks/scheduler.py - 自动使用配置的模式
async def update_market_data(self):
    if settings.YFINANCE_USE_BATCH:
        await self._update_batch_mode(db)  # 批量模式
    else:
        await self._update_individual_mode(db)  # 单独模式（带延迟）
```

## 监控和日志

### 日志输出示例

**批量模式**：
```
INFO: Using BATCH mode for 14 symbols
INFO: Fetching combined data for 14 symbols (batch mode)
INFO: Batch fetch completed: 14 symbols processed
INFO: Updating market_data only (stock_info up-to-date)
INFO: Updated market data: 0700.HK
INFO: Updated market data: NVDA.US
...
INFO: Batch update completed: 14/14 market_data updated, 0 stock info updated
```

**首次运行（需要更新 stock_info）**：
```
INFO: Updating both stock_info and market_data
INFO: Batch update completed: 14/14 market_data updated, 14 stock info updated
```

### 监控指标

建议监控以下指标：

1. **API 调用次数**：应显著减少
2. **执行时间**：应该更短
3. **成功率**：批量模式应 ≥ 95%
4. **限制触发次数**：应该接近 0

## 故障排除

### 问题 1：批量请求失败

**症状**：日志显示 `Error in batch combined data fetch`

**解决方案**：
1. 检查网络连接
2. 临时切换到单独模式：`YFINANCE_USE_BATCH=false`
3. 增加重试次数：`YFINANCE_MAX_RETRIES=5`

### 问题 2：部分股票数据缺失

**症状**：某些股票返回 `None`

**解决方案**：
1. 检查股票代码是否正确
2. 确认市场开盘时间
3. 查看详细日志确定具体错误

### 问题 3：Redis 锁导致任务跳过

**症状**：日志显示 `already running in another instance`

**解决方案**：
1. 正常情况：锁机制生效，等待下次执行即可
2. 异常情况：手动清理锁
   ```bash
   redis-cli -h 127.0.0.1 -p 6379
   AUTH redis_data_center
   DEL lock:market_data_refresh
   ```

## 最佳实践

1. **生产环境使用批量模式**：显著减少 API 调用
2. **监控 API 使用情况**：确保不会触发限制
3. **合理设置延迟**：单独模式下 ≥ 0.5 秒
4. **定期检查日志**：查看成功率和错误信息
5. **缓存市场数据**：利用 Redis 缓存减少重复请求

## 总结

通过以上优化：

✅ **API 调用减少 93-96%**（336 次/小时 → 12-24 次/小时）
✅ **执行时间减少 70-80%**（15-30 秒 → 3-5 秒）
✅ **限制风险大幅降低**（从高风险到极低）
✅ **更智能的数据更新**（stock_info 每天更新，market_data 实时更新）
✅ **保持功能完整性**（所有数据正常获取和更新）

这些优化确保了系统可以稳定运行，不会因为频繁请求而被 Yahoo Finance 限制。
