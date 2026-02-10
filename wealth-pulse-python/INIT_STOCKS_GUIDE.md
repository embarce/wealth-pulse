# 股票信息初始化指南

## 概述

本指南介绍如何使用 `init_stocks.py` 脚本从 Excel 文件批量初始化数据库中的股票信息。

---

## 文件说明

### 1. init_stocks.py（初始化脚本）

**功能**：
- 从 `hk-code.xlsx` 读取股票数据
- 批量插入到 `tb_stock_info` 表
- 自动跳过已存在的股票代码
- 支持试运行模式

**Excel 格式要求**：
```
Code       Name
0700.HK    腾讯控股
9988.HK    阿里巴巴
0941.HK    中国移动
...
```

**字段映射**：
| Excel 列 | 数据库字段 | 说明 |
|----------|-----------|------|
| Code | stock_code | 股票代码（主键） |
| Name | company_name | 公司全名 |
| Name | short_name | 公司简称 |
| - | stock_type | 固定为 "STOCK" |
| - | currency | 固定为 "HKD" |
| - | stock_status | 固定为 1（活跃） |

### 2. create_sample_excel.py（示例生成器）

**功能**：
- 生成示例 `hk-code.xlsx` 文件
- 包含 20 只香港主要股票
- 用于测试和学习

---

## 使用步骤

### 步骤 1：准备 Excel 文件

#### 选项 A：使用示例文件（推荐新手）

```bash
# 生成示例 Excel 文件
python create_sample_excel.py
```

输出：
```
创建示例 Excel 文件
====================

✓ 文件已创建: hk-code.xlsx
  共 20 条记录

数据预览:
Code            Name
----------------------------------------
0700.HK         腾讯控股
9988.HK         阿里巴巴
...

下一步:
  1. 检查并编辑 hk-code.xlsx，添加您的股票数据
  2. 运行初始化脚本: python init_stocks.py
```

#### 选项 B：手动创建 Excel 文件

1. 创建新文件 `hk-code.xlsx`（在项目根目录）
2. 添加表头：第一行 `Code` 和 `Name`
3. 添加数据：
   - **Code 列**：股票代码（如 `0700.HK`, `NVDA.US`）
   - **Name 列**：公司名称（中文）

**示例 Excel 内容**：

| Code     | Name       |
|----------|-----------|
| 0700.HK  | 腾讯控股   |
| 9988.HK  | 阿里巴巴   |
| 0941.HK  | 中国移动   |
| NVDA.US  | 英伟达     |
| AAPL.US  | 苹果公司   |

**注意事项**：
- ✅ Code 必须唯一，重复会被跳过
- ✅ Code 格式：港股用 `.HK`，美股用 `.US`
- ✅ 去除空行和无效数据
- ❌ 不要改变列名（必须是 Code 和 Name）

---

### 步骤 2：检查 Excel 数据

```bash
# 可选：预览 Excel 内容
python -c "import pandas as pd; df = pd.read_excel('hk-code.xlsx'); print(df); print(f'\n共 {len(df)} 条记录')"
```

---

### 步骤 3：试运行（推荐先试运行）

```bash
# 试运行模式：不写入数据库，只显示将要执行的操作
python init_stocks.py --dry-run
```

输出示例：
```
============================================================
股票信息初始化脚本
============================================================

⚠️  试运行模式: 不会实际写入数据库

✓ 成功读取 Excel 文件: hk-code.xlsx
  共 3 条记录

数据预览 (前 5 条):
Code            Name
----------------------------------------
0700.HK         腾讯控股
9988.HK         阿里巴巴
0941.HK         中国移动

当前数据库状态:
  总股票数: 0
  活跃股票: 0

============================================================
开始初始化股票信息
模式: 试运行 (不写入数据库)
============================================================

✓ 添加: 0700.HK - 腾讯控股
✓ 添加: 9988.HK - 阿里巴巴
✓ 添加: 0941.HK - 中国移动

============================================================
初始化完成
============================================================
成功添加: 3 条
跳过 (已存在): 0 条
错误: 0 条
总计: 3 条
============================================================
```

---

### 步骤 4：正式执行

```bash
# 正式写入数据库
python init_stocks.py
```

交互提示：
```
是否继续初始化 3 条记录? (yes/no): yes
```

输入 `yes` 或 `y` 确认后开始写入。

**跳过确认（自动化场景）**：
```bash
# 使用 --force 参数跳过确认提示
python init_stocks.py --force
```

---

### 步骤 5：验证结果

#### 方法 1：查看脚本输出

```
当前数据库状态:
  总股票数: 3
  活跃股票: 3
```

#### 方法 2：查询数据库

```sql
-- 查询所有股票
SELECT stock_code, company_name, stock_status
FROM tb_stock_info
ORDER BY stock_code;

-- 统计数量
SELECT COUNT(*) as total FROM tb_stock_info;
SELECT COUNT(*) as active FROM tb_stock_info WHERE stock_status = 1;
```

#### 方法 3：使用 API

```bash
# 获取股票列表（需要认证）
curl -X GET "http://localhost:9000/api/stocks/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 命令行参数

### --dry-run

试运行模式，不实际写入数据库。

```bash
python init_stocks.py --dry-run
```

**用途**：
- 预览将要执行的操作
- 验证 Excel 数据格式
- 测试脚本逻辑

### --force

强制执行，跳过确认提示。

```bash
python init_stocks.py --force
```

**用途**：
- 自动化脚本
- CI/CD 流程

### 组合使用

```bash
# 试运行 + 强制（无确认提示）
python init_stocks.py --dry-run --force
```

---

## 错误处理

### 错误 1：文件不存在

```
❌ 文件不存在: hk-code.xlsx
   请确保文件在项目根目录下
```

**解决方案**：
1. 检查文件是否在项目根目录（`wealth-pulse-python/`）
2. 运行 `python create_sample_excel.py` 创建示例文件

### 错误 2：Excel 格式错误

```
❌ Excel 文件缺少必需的列: ['Code']
   当前列: ['股票代码', '名称']
```

**解决方案**：
1. 确保 Excel 表头是 `Code` 和 `Name`（英文，区分大小写）
2. 修改 Excel 文件，使用正确的列名

### 错误 3：数据库连接失败

```
❌ 无法连接到数据库
```

**解决方案**：
1. 检查 MySQL 是否运行
2. 检查 `app/core/config.py` 中的数据库配置
3. 确保数据库已创建：`wealth_pulse`

### 错误 4：重复的股票代码

```
⊘ 跳过: 0700.HK - 腾讯控股 (已存在)
```

**这不是错误**，脚本会自动跳过已存在的股票。

**如果想更新**：
1. 先删除旧记录：`DELETE FROM tb_stock_info WHERE stock_code = '0700.HK';`
2. 重新运行初始化脚本

---

## 高级用法

### 批量导入多个 Excel 文件

```bash
# 创建批处理脚本
cat > import_all.sh << 'EOF'
#!/bin/bash

for file in *.xlsx; do
    echo "处理文件: $file"
    cp "$file" hk-code.xlsx
    python init_stocks.py --force
done

echo "所有文件处理完成"
EOF

chmod +x import_all.sh
./import_all.sh
```

### 更新现有股票信息

```python
# 创建自定义脚本 update_stocks.py
from app.db.session import SessionLocal
from app.models.stock_info import StockInfo
import pandas as pd

db = SessionLocal()
df = pd.read_excel('hk-code.xlsx')

for _, row in df.iterrows():
    code = str(row['Code']).strip()
    name = str(row['Name']).strip()

    stock = db.query(StockInfo).filter(
        StockInfo.stock_code == code
    ).first()

    if stock:
        # 更新现有记录
        stock.company_name = name
        stock.short_name = name
        print(f"✓ 更新: {code} - {name}")

db.commit()
db.close()
```

### 删除所有股票并重新初始化

```sql
-- ⚠️  危险操作！会删除所有数据

-- 1. 备份数据库
mysqldump -u root -p wealth_pulse tb_stock_info > backup_stock_info.sql

-- 2. 删除所有数据
DELETE FROM tb_stock_info;

-- 3. 运行初始化脚本
python init_stocks.py --force
```

---

## 数据库表结构

```sql
CREATE TABLE tb_stock_info (
    stock_code VARCHAR(20) PRIMARY KEY COMMENT '股票代码',
    company_name VARCHAR(100) NOT NULL COMMENT '公司全名',
    short_name VARCHAR(50) COMMENT '公司简称',
    stock_type VARCHAR(20) NOT NULL DEFAULT 'STOCK' COMMENT '股票类型',
    exchange VARCHAR(20) COMMENT '交易所',
    currency VARCHAR(10) DEFAULT 'HKD' COMMENT '货币',
    industry VARCHAR(50) COMMENT '行业',
    market_cap VARCHAR(255) COMMENT '市值',
    display_order INT DEFAULT 0 COMMENT '显示顺序',
    stock_status INT DEFAULT 1 COMMENT '状态：1-正常，0-停用',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

---

## 定时任务自动更新

初始化完成后，定时任务会自动更新股票数据：

| 任务 | 时间 | 说明 |
|------|------|------|
| Market Data Update | 每 5 分钟 | 更新价格、涨跌等 |
| Stock Info Update | 每天早上 8:00 | 更新公司名、行业等 |

**无需手动操作**，所有数据自动保持最新！

---

## 常见问题

### Q1：如何添加美股？

**A**：在 Excel 中使用 `.US` 后缀：

```
Code       Name
NVDA.US    英伟达
AAPL.US    苹果公司
TSLA.US    特斯拉
```

### Q2：如何添加 A 股？

**A**：使用 `.SS`（上海）或 `.SZ`（深圳）后缀：

```
Code       Name
600519.SS  贵州茅台
000858.SZ  五粮液
```

### Q3：初始化后数据不准确？

**A**：等待定时任务更新，或手动触发：

```bash
# 手动刷新所有股票的市场数据
curl -X POST "http://localhost:9000/api/stocks/refresh" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Q4：如何批量停用股票？

**A**：
```sql
-- 停用所有股票
UPDATE tb_stock_info SET stock_status = 0;

-- 停用特定股票
UPDATE tb_stock_info SET stock_status = 0 WHERE stock_code IN ('0700.HK', '9988.HK');
```

### Q5：能否直接导入 CSV 文件？

**A**：可以，先将 CSV 转换为 Excel：

```python
import pandas as pd

# 读取 CSV
df = pd.read_csv('stocks.csv')

# 保存为 Excel
df.to_excel('hk-code.xlsx', index=False)
```

---

## 总结

### 快速开始（3 步）

```bash
# 1. 创建示例文件
python create_sample_excel.py

# 2. 编辑 hk-code.xlsx，添加您的股票数据

# 3. 运行初始化
python init_stocks.py
```

### 最佳实践

1. ✅ 先用 `--dry-run` 测试
2. ✅ 定期备份数据库
3. ✅ 分批次导入（每批 < 1000 条）
4. ✅ 验证 Excel 数据格式
5. ✅ 使用版本控制管理 Excel 文件

### 注意事项

- ⚠️  股票代码必须唯一
- ⚠️  Excel 表头必须是 `Code` 和 `Name`
- ⚠️  生产环境建议先备份数据库
- ⚠️  大批量导入建议在业务低峰期执行

---

**如有问题，请查看日志或联系技术支持！** 📞
