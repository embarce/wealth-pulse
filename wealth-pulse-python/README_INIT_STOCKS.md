# 快速开始 - 股票信息初始化

## 🚀 3 步完成初始化

### 步骤 1：安装依赖

```bash
pip install openpyxl
```

### 步骤 2：准备 Excel 文件

**选项 A：生成示例文件**
```bash
python create_sample_excel.py
```

**选项 B：手动创建 `hk-code.xlsx`**

| Code     | Name       |
|----------|-----------|
| 0700.HK  | 腾讯控股   |
| 9988.HK  | 阿里巴巴   |
| 0941.HK  | 中国移动   |
| NVDA.US  | 英伟达     |
| AAPL.US  | 苹果公司   |

⚠️ **注意**：
- 表头必须是 `Code` 和 `Name`（英文）
- Code 格式：港股用 `.HK`，美股用 `.US`
- 文件放在项目根目录

### 步骤 3：运行初始化

```bash
# 先试运行（推荐）
python init_stocks.py --dry-run

# 正式执行
python init_stocks.py
```

## 📋 完整示例

```bash
# 1. 生成示例文件
python create_sample_excel.py

# 输出：
# ✓ 文件已创建: hk-code.xlsx
#   共 20 条记录

# 2. 试运行
python init_stocks.py --dry-run

# 输出：
# ✓ 添加: 0700.HK - 腾讯控股
# ✓ 添加: 9988.HK - 阿里巴巴
# ...

# 3. 正式执行
python init_stocks.py

# 提示：是否继续? 输入 yes
# 输出：
# 初始化完成
# 成功添加: 20 条
```

## ✅ 验证结果

```sql
-- 查询数据库
SELECT stock_code, company_name FROM tb_stock_info;

-- 或使用 API
curl -X GET "http://localhost:9000/api/stocks/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔄 自动更新

初始化后，定时任务会自动更新数据：

- ✅ **每 5 分钟**：更新价格、涨跌幅等
- ✅ **每天 8:00 AM**：更新公司信息
- ✅ **每天 6:00 AM**：更新历史数据

**无需手动操作！**

---

## 📖 详细文档

查看 `INIT_STOCKS_GUIDE.md` 了解更多：
- 完整使用说明
- 错误处理
- 高级用法
- 常见问题

---

## ⚙️ 命令行参数

| 参数 | 说明 |
|------|------|
| `--dry-run` | 试运行，不写入数据库 |
| `--force` | 跳过确认提示 |

**示例**：
```bash
python init_stocks.py --dry-run --force
```

---

## ❓ 常见问题

**Q: Excel 文件格式错误？**
```
A: 确保表头是 Code 和 Name（英文，区分大小写）
```

**Q: 如何添加美股？**
```
A: 使用 .US 后缀，如 NVDA.US
```

**Q: 重复运行会怎样？**
```
A: 自动跳过已存在的股票，不会重复添加
```

---

**需要帮助？** 查看 `INIT_STOCKS_GUIDE.md` 📚
