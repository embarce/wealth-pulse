# 股票数据提供者系统使用指南

## 系统架构

本系统实现了一个灵活的股票数据提供者架构，支持通过配置切换不同的数据源（akshare 或 yfinance）。

### 核心组件

```
app/services/
├── stock_data_provider_base.py      # 抽象基类
├── yfinance_provider.py             # Yahoo Finance 实现
├── akshare_provider.py              # AkShare 实现
├── stock_data_provider_factory.py   # 工厂类
└── stock_service.py                 # 统一服务层
```

### 架构设计

1. **BaseStockDataProvider（抽象基类）**
   - 定义所有数据提供者必须实现的接口
   - 提供重试机制和错误处理
   - 提供数据转换辅助方法

2. **具体实现类**
   - `YFinanceProvider`: 使用 Yahoo Finance API 获取数据
   - `AkShareProvider`: 使用 AkShare 库获取数据

3. **StockDataProviderFactory（工厂类）**
   - 根据配置创建对应的数据提供者实例
   - 使用单例模式缓存提供者实例
   - 支持动态切换数据源

4. **StockService（服务层）**
   - 整合数据提供者和数据库操作
   - 提供统一的业务逻辑接口
   - 支持单个和批量操作

## 配置说明

### 环境变量配置

在 `.env` 文件中配置数据源：

```bash
# 选择数据提供者（默认：akshare）
STOCK_DATA_PROVIDER=akshare

# 可选值：
# - akshare: 港股专用数据API，使用新浪财经接口（速度快，推荐用于港股）
# - yfinance: Yahoo Finance API（支持全球股票：港股+美股+A股）
```

### 配置文件位置

- 配置文件：`app/core/config.py`
- 环境变量：`.env`

## 使用方法

### 1. 基本使用

```python
from app.services.stock_service import StockService
from app.db.session import get_db

# 获取数据库会话
db = next(get_db())

# 创建服务实例（自动使用配置的数据提供者）
service = StockService(db)

# 刷新单个股票的市场数据
market_data = service.refresh_stock_market_data("00700")

# 批量刷新市场数据
stock_codes = ["00700", "00005", "NVDA.US"]
results = service.refresh_batch_market_data(stock_codes)

# 刷新所有活跃股票的市场数据
all_results = service.refresh_all_market_data()
```

### 2. 查询数据

```python
# 获取股票信息
stock = service.get_stock_by_code("00700")

# 获取最新市场数据
market_data = service.get_latest_market_data("00700")

# 获取历史数据
history = service.get_historical_data(
    stock_code="00700",
    start_date=date(2024, 1, 1),
    end_date=date(2024, 12, 31),
    limit=100
)
```

### 3. 更新数据

```python
# 更新市场数据
data = {
    'stock_code': '00700',
    'last_price': 350.0,
    'change_rate': 1.5,
    'market_date': date.today(),
    'quote_time': datetime.now()
}
market_data = service.update_market_data('00700', data)

# 更新历史数据
history_list = [
    {
        'trade_date': date(2024, 1, 1),
        'open_price': 340.0,
        'close_price': 345.0,
        # ...
    }
]
count = service.update_history_data('00700', history_list)
```

### 4. 动态切换数据源

```python
from app.services.stock_data_provider_factory import StockDataProviderFactory

# 重置缓存
StockDataProviderFactory.reset_cache()

# 创建特定提供者实例
yfinance_provider = StockDataProviderFactory.create_provider('yfinance')
akshare_provider = StockDataProviderFactory.create_provider('akshare')

# 切换提供者
new_provider = StockDataProviderFactory.switch_provider('yfinance')
```

## API 接口

系统提供以下 REST API 接口（详见 `app/api/stocks.py`）：

- `GET /api/stocks/` - 获取所有股票列表
- `GET /api/stocks/{stock_code}` - 获取单个股票信息
- `GET /api/stocks/{stock_code}/market-data` - 获取市场数据
- `GET /api/stocks/{stock_code}/history` - 获取历史数据
- `POST /api/stocks/refresh` - 手动刷新市场数据

## 数据源对比

### AkShare（港股专用）

**数据来源：**
- 实时行情：新浪财经接口（15分钟延时）
- 历史数据：新浪财经接口

**优点：**
- ⚡ 速度快：一次API调用获取所有港股数据
- 🎯 专注港股：专为香港市场优化
- 🇨🇳 国内访问：网络访问稳定
- 📊 数据完整：包含买一卖一、成交额等详细信息
- 🔒 无限流：新浪财经接口相对稳定

**缺点：**
- ❌ 不支持美股和A股
- ⏰ 15分钟延时（非实时）
- 📈 缺少52周高低、市盈率等指标

**适用场景：**
- ✅ 只关注港股市场
- ✅ 需要快速批量更新
- ✅ 对15分钟延时可以接受
- ✅ 需要买一卖一档位数据

**性能特点：**
- 批量获取100只股票 < 1秒
- 单次API调用返回所有港股数据

### YFinance

**优点：**
- 支持全球股票市场
- 美股数据全面且准确
- 提供52周高低、市盈率等指标
- 国际化程度高

**缺点：**
- 国内访问可能较慢
- 港股数据相对简单
- 需要处理API限流

**适用场景：**
- 主要关注美股
- 需要全球市场数据
- 对基本面指标要求高

## 定时任务

系统使用 APScheduler 进行定时数据更新（详见 `app/tasks/scheduler.py`）：

```python
# 每5分钟更新市场数据
@scheduler.scheduled_job(
    'interval',
    seconds=300,
    id='update_market_data',
    max_instances=1
)
def update_market_data():
    service = StockService(db)
    service.refresh_all_market_data()

# 每日6点更新历史数据
@scheduler.scheduled_job(
    'cron',
    hour=6,
    minute=0,
    id='update_history_data'
)
def update_history_data():
    # 更新历史数据
    pass
```

## 扩展新的数据源

要添加新的数据提供者，只需：

1. **创建新的提供者类**

```python
from app.services.stock_data_provider_base import BaseStockDataProvider

class NewProvider(BaseStockDataProvider):
    def __init__(self, max_retries: int = 3, retry_delay: float = 1.0):
        super().__init__(max_retries, retry_delay)
        self.provider_name = "new_provider"

    def get_stock_market_data(self, stock_code: str):
        # 实现获取实时行情的逻辑
        pass

    def get_batch_market_data(self, stock_codes: List[str]):
        # 实现批量获取的逻辑
        pass

    def get_stock_history_data(self, stock_code: str, start_date, end_date):
        # 实现获取历史数据的逻辑
        pass

    def get_batch_history_data(self, stock_codes: List[str], start_date, end_date):
        # 实现批量获取历史数据的逻辑
        pass
```

2. **在工厂类中注册**

```python
# 在 StockDataProviderFactory.create_provider() 中添加
if provider_name == "new_provider":
    return NewProvider()
```

3. **更新配置文件**

在 `.env` 中添加配置选项：

```bash
STOCK_DATA_PROVIDER=new_provider
```

## 错误处理

系统提供完善的错误处理机制：

1. **重试机制**
   - 默认重试 3 次
   - 每次重试间隔 1 秒
   - 可通过构造函数配置

2. **日志记录**
   - 详细的错误日志
   - 操作成功/失败统计
   - 便于问题排查

3. **异常处理**
   - 数据获取异常
   - 数据库操作异常
   - 网络请求异常

## 性能优化

1. **批量操作**
   - 使用批量接口减少API调用
   - AkShare 一次性获取所有股票数据
   - 数据库批量提交

2. **缓存策略**
   - 提供者实例缓存
   - Redis 分布式锁
   - 避免重复数据获取

3. **并发控制**
   - 分布式锁防止并发更新
   - 任务队列管理
   - 资源限制保护

## 常见问题

### Q1: 如何切换数据源？

A: 修改 `.env` 文件中的 `STOCK_DATA_PROVIDER` 配置，然后重启服务。

### Q2: 数据更新失败怎么办？

A: 检查日志文件，常见原因：
- 网络连接问题
- API 限流
- 股票代码格式错误

### Q3: 如何添加新股票？

A: 使用数据库直接插入，或通过 API 接口创建：

```python
service.create_stock({
    'stock_code': '新股票代码',
    'company_name': '公司名称',
    'company_name_cn': '公司中文名称',
    'stock_type': 'STOCK',
    'exchange': 'HK',
    'currency': 'HKD'
})
```

### Q4: 如何提高数据更新速度？

A:
- ⚡ **使用 AkShare**：港股数据批量获取速度最快（< 1秒获取所有港股）
- 📦 调整批量大小：AkShare 一次调用获取所有数据
- 🗄️ 优化数据库索引：确保 stock_code 和 market_date 有索引
- 🔄 使用 Redis 缓存：减少重复查询

### Q5: AkShare 和 YFinance 性能对比如何？

A: **AkShare（港股）**
- 批量获取100只股票：< 1秒
- 数据源：新浪财经（一次API调用）
- 延时：15分钟

**YFinance（港股）**
- 批量获取100只股票：~10-30秒
- 数据源：Yahoo Finance（需要多次API调用）
- 延时：接近实时（有少量延时）

**推荐**：如果只关注港股，使用 AkShare 速度提升 10-30 倍！

## 总结

本股票数据提供者系统具有以下特点：

✅ **灵活配置** - 通过环境变量轻松切换数据源
✅ **专注优化** - AkShare 专为港股市场优化，速度极快
✅ **统一接口** - 提供一致的数据访问方式
✅ **高可用性** - 重试机制和错误处理
✅ **易于扩展** - 插件化架构，易于添加新数据源
✅ **生产就绪** - 完善的日志、监控和性能优化

**数据源选择建议：**
- 🇭🇰 只做港股 → **AkShare**（速度快10-30倍）
- 🌍 全球市场 → **YFinance**（支持港股+美股+A股）

希望这份指南能帮助你更好地使用本系统！
