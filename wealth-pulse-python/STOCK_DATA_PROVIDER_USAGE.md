# Stock Data Provider Usage Guide

本文档介绍如何使用支持多数据供应商的股票数据服务架构。

## 概述

系统现在支持两种股票数据供应商：
- **yfinance** (默认): Yahoo Finance API，支持全球股票，但对于国内股票较慢
- **akshare**: 国内财经数据接口，对于A股和港股更快，仅支持国内市场

## 快速开始

### 1. 配置环境变量

在 `.env` 文件中设置 `STOCK_DATA_PROVIDER`:

```bash
# 使用 Yahoo Finance (默认)
STOCK_DATA_PROVIDER=yfinance

# 使用 AkShare (推荐用于国内股票)
STOCK_DATA_PROVIDER=akshare
```

### 2. 基本使用

#### 方式 A: 批量服务（推荐）

适用于获取多个股票的数据，性能更好。

```python
from app.services import get_default_provider

# 获取配置的数据提供者
provider = get_default_provider()

# 批量获取股票信息
symbols = ['0700.HK', '9988.HK', 'AAPL']
stock_info = provider.get_batch_stock_info(symbols)

# 批量获取市场数据
market_data = provider.get_batch_market_data(symbols)

# 获取组合数据（信息 + 市场数据，最高效）
combined_data = provider.get_batch_combined_data(symbols)

# 获取历史数据
hist_df = provider.get_historical_data('0700.HK', period='1y', interval='1d')

# 即使只有一只股票也可以使用批量服务
result = provider.get_batch_market_data(['AAPL'])
data = result.get('AAPL')  # 从字典中取出数据
```

#### 方式 B: 单股票服务

适用于获取单个股票的数据，代码更简单。

```python
from app.services import yfinance_service, akshare_service

# 直接使用单股票服务（无需工厂函数）
info = yfinance_service.get_stock_info('AAPL')
market_data = yfinance_service.get_market_data('AAPL')
hist = yfinance_service.get_historical_data('AAPL', period='1y')

# 使用 akshare 服务
info = akshare_service.get_stock_info('0700.HK')
market_data = akshare_service.get_market_data('0700.HK')
```

**选择建议：**
- 优先使用批量服务（统一接口，支持环境变量切换）
- 如果只需要简单获取单只股票，可使用单股票服务

详细对比请参考：[SERVICE_SELECTION_GUIDE.md](./SERVICE_SELECTION_GUIDE.md)

### 3. 手动指定提供者

```python
from app.services import get_stock_data_provider

# 强制使用 yfinance
yfinance_provider = get_stock_data_provider(provider_type='yfinance')

# 强制使用 akshare
akshare_provider = get_stock_data_provider(provider_type='akshare')
```

## API 参考

### 工厂函数

#### `get_default_provider() -> BaseStockDataProvider`
获取环境变量配置的默认数据提供者（推荐使用）

#### `get_stock_data_provider(provider_type: Optional[str] = None, request_delay: float = 0.5, force_refresh: bool = False) -> BaseStockDataProvider`
获取指定类型的数据提供者

参数:
- `provider_type`: 提供者类型 ('yfinance' 或 'akshare')
- `request_delay`: 请求间隔（秒）
- `force_refresh`: 是否强制创建新实例

返回:
- `BaseStockDataProvider` 实例

#### `reset_provider()`
重置缓存的提供者实例

#### `get_current_provider_type() -> str`
获取当前配置的提供者类型

### 数据提供者接口

所有提供者都实现 `BaseStockDataProvider` 接口：

#### `get_batch_stock_info(symbols: List[str]) -> Dict[str, Optional[Dict]]`
批量获取股票基本信息

#### `get_batch_market_data(symbols: List[str]) -> Dict[str, Optional[Dict]]`
批量获取市场行情数据

#### `get_batch_combined_data(symbols: List[str]) -> Dict[str, Dict]`
批量获取组合数据（推荐，最高效）

#### `get_historical_data(symbol: str, period: str = "1y", interval: str = "1d") -> Optional[pd.DataFrame]`
获取历史价格数据

## 数据供应商对比

| 特性 | yfinance | akshare |
|------|----------|---------|
| 全球市场支持 | ✅ | ❌ |
| A股支持 | ✅ | ✅ (更快) |
| 港股支持 | ✅ | ✅ (更快) |
| 美股支持 | ✅ | ❌ |
| 批量请求 | ✅ | ❌ (模拟批量) |
| 基本信息 | 详细 | 有限 |
| 52周数据 | ✅ | ❌ |
| PE/PB比率 | ✅ | ❌ |
| 国内访问速度 | 较慢 | 快 |

## 使用建议

### 场景 1: 仅投资国内股票（A股/港股）
```bash
STOCK_DATA_PROVIDER=akshare
```
- 使用 AkShare
- 访问速度更快
- 数据更及时

### 场景 2: 全球投资组合
```bash
STOCK_DATA_PROVIDER=yfinance
```
- 使用 yfinance
- 支持全球市场
- 数据更全面

### 场景 3: 根据地区动态选择
```python
from app.services import get_stock_data_provider

# A股和港股使用 akshare
cn_symbols = ['0700.HK', '000001.SZ']
cn_provider = get_stock_data_provider('akshare')
cn_data = cn_provider.get_batch_combined_data(cn_symbols)

# 美股使用 yfinance
us_symbols = ['AAPL', 'NVDA']
us_provider = get_stock_data_provider('yfinance')
us_data = us_provider.get_batch_combined_data(us_symbols)
```

## 迁移现有代码

### 旧代码（直接使用服务）

```python
from app.services.yfinance_batch_service import yfinance_batch_service

data = yfinance_batch_service.get_batch_combined_data(symbols)
```

### 新代码（推荐 - 使用工厂函数）

```python
from app.services import get_default_provider

provider = get_default_provider()
data = provider.get_batch_combined_data(symbols)
```

优势：通过环境变量控制使用哪个数据源，无需修改代码即可切换。

### 旧代码（单股票操作）

```python
from app.services.yfinance_service import yfinance_service

info = yfinance_service.get_stock_info('AAPL')
market = yfinance_service.get_market_data('AAPL')
```

### 新代码选项

**选项 1: 继续使用单股票服务（适合简单场景）**
```python
from app.services import yfinance_service, akshare_service

# 根据需要直接使用
info = yfinance_service.get_stock_info('AAPL')
# 或
info = akshare_service.get_stock_info('0700.HK')
```

**选项 2: 使用批量服务（推荐，统一接口）**
```python
from app.services import get_default_provider

provider = get_default_provider()
result = provider.get_batch_stock_info(['AAPL'])
info = result.get('AAPL')
```

## 注意事项

1. **首次使用 AkShare**: 需要安装依赖
   ```bash
   pip install akshare
   ```

2. **请求频率限制**: 两个提供者都有请求延迟，避免被封禁
   - 默认延迟: 0.5秒
   - 可通过 `request_delay` 参数调整

3. **数据格式差异**:
   - AkShare 某些字段（如 PE、PB、52周高/低）可能为 None
   - 股票代码格式保持一致（如 '0700.HK', '000001.SZ'）

4. **错误处理**: 所有方法都有错误处理和重试机制
   - 默认重试 3 次
   - 失败的股票返回 None

## 完整示例

```python
from app.services import get_default_provider
from app.models.stock_market_data import StockMarketData
from sqlalchemy.orm import Session

def update_stock_market_data(db: Session, symbols: list):
    """更新股票市场数据"""
    provider = get_default_provider()

    # 获取组合数据
    combined_data = provider.get_batch_combined_data(symbols)

    for symbol, data in combined_data.items():
        if data['market_data'] is None:
            print(f"Failed to fetch data for {symbol}")
            continue

        # 保存到数据库
        stock = db.query(StockInfo).filter(
            StockInfo.stock_code == symbol
        ).first()

        if stock:
            market_data = data['market_data']
            db.merge(StockMarketData(**market_data))
            db.commit()
            print(f"Updated {symbol}: {market_data['last_price']}")

if __name__ == '__main__':
    from app.db.session import SessionLocal

    db = SessionLocal()
    symbols = ['0700.HK', '9988.HK', 'AAPL']

    try:
        update_stock_market_data(db, symbols)
    finally:
        db.close()
```

## 常见问题

**Q: 如何在生产环境中使用？**
A: 在 `.env` 文件中设置 `STOCK_DATA_PROVIDER=akshare`（国内）或 `yfinance`（国际）。

**Q: 可以同时使用两个提供者吗？**
A: 可以，但需要分别创建实例：
```python
from app.services import get_stock_data_provider

akshare = get_stock_data_provider('akshare')
yfinance = get_stock_data_provider('yfinance', force_refresh=True)
```

**Q: AkShare 支持哪些市场？**
A: 主要支持 A股（上海/深圳）和港股。不支持美股等国际市场。

**Q: 如何获取特定提供商的实例？**
A: 使用 `get_stock_data_provider(provider_type='akshare')` 明确指定。
