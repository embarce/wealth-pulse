# Stock Services Selection Guide

本文档帮助您选择正确的股票数据服务。

## 服务类型

Python API 提供了两种类型的服务：

### 1. 单股票服务 (Single Stock Services)
- `YFinanceService`
- `AkShareService`

### 2. 批量服务 (Batch Providers)
- `YFinanceBatchService`
- `AkShareBatchService`
- 通过工厂函数 `get_default_provider()` 获取

---

## 使用场景

### 使用单股票服务

**适用于：** 获取单个股票的数据

**优势：**
- 代码简单直接
- 无需批量处理逻辑
- 适合 API 端点、实时查询

**示例：**

```python
from app.services import yfinance_service, akshare_service

# 使用 yfinance
info = yfinance_service.get_stock_info('0700.HK')
market_data = yfinance_service.get_market_data('0700.HK')
hist = yfinance_service.get_historical_data('0700.HK', period='1y')

# 使用 akshare
info = akshare_service.get_stock_info('000001.SZ')
market_data = akshare_service.get_market_data('000001.SZ')
hist = akshare_service.get_historical_data('000001.SZ', period='1y')
```

### 使用批量服务

**适用于：** 获取多个股票的数据

**优势：**
- 性能优化（yfinance 支持真正的批量请求）
- 统一的错误处理
- 自动重试机制
- 支持环境变量切换数据源

**示例：**

```python
from app.services import get_default_provider

# 自动使用环境变量配置的提供者
provider = get_default_provider()

# 批量获取股票信息
symbols = ['0700.HK', '9988.HK', 'AAPL']
stock_info = provider.get_batch_stock_info(symbols)

# 批量获取市场数据
market_data = provider.get_batch_market_data(symbols)

# 批量获取组合数据（推荐，最高效）
combined_data = provider.get_batch_combined_data(symbols)

for symbol, data in combined_data.items():
    info = data['info']
    market = data['market_data']
    print(f"{symbol}: {info['company_name']} - {market['last_price']}")
```

---

## 性能对比

### 场景：获取 10 只股票的市场数据

| 服务类型 | API 调用次数 | 耗时估算 |
|---------|-------------|---------|
| 单股票服务 (循环) | 10次 | ~5-10秒 |
| 批量服务 (yfinance) | 1-2次 | ~1-2秒 |
| 批量服务 (akshare) | 10次 (模拟批量) | ~5-10秒 |

**结论：**
- **yfinance**: 批量服务显著更快
- **akshare**: 性能相近，但批量服务提供统一的接口

---

## 代码示例

### API 端点 - 获取单只股票

```python
from fastapi import HTTPException
from app.services import get_default_provider

@router.get("/stocks/{symbol}/market")
async def get_stock_market(symbol: str):
    """获取单只股票的市场数据 - 使用单股票服务"""
    provider = get_default_provider()

    # 方法1: 直接使用批量服务的单个符号（推荐）
    result = provider.get_batch_market_data([symbol])
    market_data = result.get(symbol)

    if market_data is None:
        raise HTTPException(status_code=404, detail="Stock not found")

    return market_data
```

### 定时任务 - 更新所有股票

```python
from app.services import get_default_provider
from app.models.stock_info import StockInfo
from sqlalchemy.orm import Session

def update_all_stocks_task(db: Session):
    """定时更新所有股票的市场数据"""
    # 获取所有股票代码
    stocks = db.query(StockInfo).filter(
        StockInfo.stock_status == 1
    ).all()

    symbols = [stock.stock_code for stock in stocks]

    # 使用批量服务（推荐）
    provider = get_default_provider()
    combined_data = provider.get_batch_combined_data(symbols)

    # 批量保存到数据库
    for symbol, data in combined_data.items():
        if data['market_data']:
            # 更新数据库...
            pass
```

### 用户操作 - 添加股票

```python
from app.services import get_default_provider

def add_new_stock(symbol: str, db: Session):
    """用户添加新股票到投资组合"""
    provider = get_default_provider()

    # 获取股票信息
    result = provider.get_batch_stock_info([symbol])
    stock_info = result.get(symbol)

    if stock_info is None:
        raise ValueError(f"Cannot fetch info for {symbol}")

    # 保存到数据库
    # ...

    # 获取当前市场数据
    market_result = provider.get_batch_market_data([symbol])
    market_data = market_result.get(symbol)

    # ...
```

---

## 推荐用法

### ✅ 推荐

```python
from app.services import get_default_provider

def get_multiple_stocks(symbols: list):
    """多股票查询 - 使用批量服务"""
    provider = get_default_provider()
    return provider.get_batch_combined_data(symbols)

def get_single_stock(symbol: str):
    """单股票查询 - 也可以使用批量服务"""
    provider = get_default_provider()
    result = provider.get_batch_combined_data([symbol])
    return result.get(symbol)
```

### ❌ 不推荐

```python
from app.services import yfinance_service

def get_multiple_stocks(symbols: list):
    """多股票查询 - 不推荐循环调用单股票服务"""
    results = []
    for symbol in symbols:
        data = yfinance_service.get_market_data(symbol)  # 慢！
        results.append(data)
    return results
```

---

## 决策流程图

```
需要获取股票数据
    │
    ├─ 需要获取多少只股票？
    │   │
    │   ├─ 1只 → 使用单股票服务或批量服务都可以
    │   │       provider.get_batch_market_data([symbol])
    │   │
    │   └─ 多只 → 必须使用批量服务
    │             provider.get_batch_combined_data(symbols)
    │
    ├─ 需要切换数据源吗？
    │   │
    │   ├─ 是 → 使用工厂函数
    │   │         provider = get_stock_data_provider('akshare')
    │   │
    │   └─ 否 → 使用环境变量配置
    │             provider = get_default_provider()
    │
    └─ 需要哪种数据？
        │
        ├─ 基本信息 → get_batch_stock_info()
        ├─ 市场数据 → get_batch_market_data()
        ├─ 两者都要 → get_batch_combined_data() (推荐)
        └─ 历史数据 → get_historical_data()
```

---

## API 参考

### 单股票服务

#### YFinanceService / AkShareService

```python
# 获取股票信息
get_stock_info(symbol: str) -> Optional[Dict]

# 获取市场数据
get_market_data(symbol: str) -> Optional[Dict]

# 获取历史数据
get_historical_data(symbol: str, period: str, interval: str) -> Optional[DataFrame]
```

### 批量服务

#### BaseStockDataProvider

```python
# 批量获取股票信息
get_batch_stock_info(symbols: List[str]) -> Dict[str, Optional[Dict]]

# 批量获取市场数据
get_batch_market_data(symbols: List[str]) -> Dict[str, Optional[Dict]]

# 批量获取组合数据（推荐）
get_batch_combined_data(symbols: List[str]) -> Dict[str, Dict]

# 获取历史数据
get_historical_data(symbol: str, period: str, interval: str) -> Optional[DataFrame]
```

### 工厂函数

```python
# 获取默认提供者（根据环境变量）
get_default_provider() -> BaseStockDataProvider

# 获取指定提供者
get_stock_data_provider(provider_type: str) -> BaseStockDataProvider

# 重置缓存
reset_provider()

# 获取当前配置
get_current_provider_type() -> str
```

---

## 常见问题

**Q: 单股票服务和批量服务的返回格式一样吗？**

A: 不完全一样。
- 单股票服务: 直接返回数据字典或 None
- 批量服务: 返回 `{symbol: data}` 的字典，需要额外取值

**Q: 为什么批量服务需要传入列表？**

A: 批量服务设计用于处理多个股票，即使只有一个股票也需要传入列表以保持接口一致性。

**Q: 如何在代码中强制使用 yfinance 而不是环境变量配置？**

A:
```python
from app.services import get_stock_data_provider

provider = get_stock_data_provider(provider_type='yfinance')
```

**Q: akshare 支持美股吗？**

A: 不支持。如果需要美股数据，请使用 yfinance。

---

## 总结

| 场景 | 推荐服务 | 示例 |
|------|---------|------|
| 获取1只股票 | 批量服务或单股票服务 | `provider.get_batch_market_data(['AAPL'])` |
| 获取多只股票 | 批量服务 | `provider.get_batch_combined_data(symbols)` |
| 定时任务 | 批量服务 | 循环批量获取所有股票 |
| API端点 | 批量服务 | 统一接口，便于切换 |
| 根据环境切换 | 批量服务 + 工厂 | `get_default_provider()` |

**通用建议：**
- 优先使用批量服务 + 工厂函数
- 即使是单股票查询也使用批量服务（传入单个元素的列表）
- 通过环境变量控制数据源，便于切换和测试
