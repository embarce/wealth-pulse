# 港股T+0交易购买力实现说明

## 📌 概述

实现了支持港股T+0交易的购买力管理机制，区分**可提现现金**和**可交易购买力**。

## ⚠️ 重要机制说明

**港股T+2结算规则：**
- 买入股票：立即扣除可用现金（钱要支付给券商）
- 卖出股票：**可用现金不立即增加**（需要T+2结算才能提现）
- 但卖出后的资金**立即可用于继续买入**（T+0交易）
- 结算后：资金转为可用现金，可以提现

## 🎯 核心设计

### 双轨制资金管理

```
┌─────────────────────────────────────────┐
│           用户资产账户                    │
├─────────────────────────────────────────┤
│ availableCash   - 可提现现金（已结算）    │
│ purchasingPower - 购买力（支持T+0交易）   │
└─────────────────────────────────────────┘
```

- **availableCash**: 可以提现的现金（本金 + 已结算的卖出资金）
- **purchasingPower**: 可用于交易的购买力（包含未结算的卖出资金）

## 🔄 资金流转逻辑

### 1. 本金操作
```java
// 存入本金
availableCash   += 本金金额
purchasingPower += 本金金额
totalPrincipal  += 本金金额

// 提取本金
availableCash   -= 本金金额
purchasingPower -= 本金金额
totalPrincipal  -= 本金金额
```

### 2. 买入股票
```java
// 1. 检查购买力是否足够
if (purchasingPower < requiredAmount) {
    throw "购买力不足";
}

// 2. 更新资金（关键！）
deductFromCash = min(availableCash, requiredAmount)  // 优先从可用现金扣除
availableCash   -= deductFromCash                    // 但不超过可用现金
purchasingPower -= requiredAmount                    // 扣除全部购买力
positionValue   += 交易金额                           // 增加持仓市值

// 示例：
// 如果 availableCash=2,000, purchasingPower=12,000, 买入 5,000
// 则：deductFromCash=2,000, availableCash=0, purchasingPower=7,000
```

### 3. 卖出股票（关键！）
```java
// 1. 检查持仓是否足够
if (position.quantity < sellQuantity) {
    throw "持仓不足";
}

// 2. 更新资金
availableCash   不变  // ⚠️ 不立即增加，等T+2结算
purchasingPower += (交易金额 - 手续费)  // ✅ 立即增加，可继续买入
positionValue   -= 成本                 // 减少持仓市值

// 资金暂时在"未结算"状态
```

### 4. 结算交易
```java
// 计算所有卖出的净收入
settlementAmount = Σ(卖出金额 - 手续费)

// 更新资金
availableCash   += settlementAmount     // 结算完成，资金可提现
purchasingPower = availableCash         // 重置购买力
isSettled = true                        // 标记所有交易为已结算
```

## 📊 使用场景示例

### 场景1：T+0连续交易
```
初始状态：
  availableCash = 10,000 HKD
  purchasingPower = 10,000 HKD

① 买入腾讯 00700，花费 10,000 HKD
  → availableCash = 0
  → purchasingPower = 0

② 立即卖出腾讯，获得 10,500 HKD（净收入）
  → availableCash = 0  ⚠️ 不变（等结算）
  → purchasingPower = 10,500  ✅ 立即可用

③ 买入美团 03690，花费 10,500 HKD
  → availableCash = 0
  → purchasingPower = 0
  ✅ 成功（因为卖出资金立即可用于购买）

④ 结算后
  → availableCash = 10,500  ✅ 资金到账，可提现
  → purchasingPower = 10,500
```

### 场景2：本金操作联动
```
初始状态：
  availableCash = 10,000
  purchasingPower = 10,000

① 存入本金 5,000
  → availableCash = 15,000
  → purchasingPower = 15,000

② 买入股票花费 15,000
  → availableCash = 0
  → purchasingPower = 0

③ 尝试提取本金 3,000
  ❌ 失败（availableCash = 0）

④ 卖出股票获得 16,000
  → availableCash = 0
  → purchasingPower = 16,000

⑤ 再次尝试提取本金 3,000
  ❌ 仍然失败（availableCash = 0，未结算）

⑥ 结算后
  → availableCash = 16,000
  → purchasingPower = 16,000
  ✅ 可以提取本金了
```

## 🗄️ 数据库改动

### 字段说明
```sql
ALTER TABLE tb_user_asset_summary
ADD COLUMN purchasing_power DECIMAL(20,2) DEFAULT NULL
COMMENT '购买力（可用于交易）' AFTER available_cash;
```

### 兼容性处理
代码中自动兼容旧数据：
```java
if (assetSummary.getPurchasingPower() == null) {
    assetSummary.setPurchasingPower(assetSummary.getAvailableCash());
    userAssetSummaryService.updateById(assetSummary);
}
```

## 🔧 技术实现

### 1. 实体类改动
**文件**: `UserAssetSummary.java:51-53`
```java
@Schema(name = "purchasingPower", description = "购买力（可用于交易）")
@TableField("purchasing_power")
private BigDecimal purchasingPower;
```

### 2. 本金操作联动
**文件**: `UserCapitalFlowServiceImpl.java:151-157` (存入)
```java
// 增加购买力（存入的本金立即可用于交易）
if (assetSummary.getPurchasingPower() == null) {
    assetSummary.setPurchasingPower(newAvailableCash);
} else {
    BigDecimal newPurchasingPower = assetSummary.getPurchasingPower().add(amount);
    assetSummary.setPurchasingPower(newPurchasingPower);
}
```

**文件**: `UserCapitalFlowServiceImpl.java:186-191` (提取)
```java
// 减少购买力（提取的本金不能再用于交易）
if (assetSummary.getPurchasingPower() != null) {
    BigDecimal newPurchasingPower = assetSummary.getPurchasingPower().subtract(amount);
    assetSummary.setPurchasingPower(newPurchasingPower.compareTo(BigDecimal.ZERO) >= 0
        ? newPurchasingPower : BigDecimal.ZERO);
}
```

### 3. 买入逻辑
**文件**: `StockTransactionLogServiceImpl.java:296-305`
```java
// 计算从 availableCash 扣除的金额（不超过现有可用现金）
BigDecimal deductFromCash = assetSummary.getAvailableCash().min(totalDeduct);
BigDecimal newAvailableCash = assetSummary.getAvailableCash().subtract(deductFromCash);
assetSummary.setAvailableCash(newAvailableCash);

// 从 purchasingPower 扣除全部金额
BigDecimal newPurchasingPower = assetSummary.getPurchasingPower().subtract(totalDeduct);
assetSummary.setPurchasingPower(newPurchasingPower);
```

### 4. 卖出逻辑（关键）
**文件**: `StockTransactionLogServiceImpl.java:323-328`
```java
// ⚠️ 卖出时 availableCash 不变（需要T+2结算才能提现）
// 资金暂时在"结算中"状态，待结算时转入 availableCash

// 增加购买力（卖出后资金立即可用于T+0交易）
BigDecimal newPurchasingPower = assetSummary.getPurchasingPower().add(netAmount);
assetSummary.setPurchasingPower(newPurchasingPower);
```

### 5. 结算逻辑
**文件**: `StockTransactionLogServiceImpl.java:426-447`
```java
// 计算卖出交易的净收入（卖出金额 - 手续费）
BigDecimal settlementAmount = unsettledTransactions.stream()
    .filter(tx -> "SELL".equals(tx.getInstruction()))
    .map(tx -> tx.getTotalAmount().subtract(tx.getFeeTotal()))
    .reduce(BigDecimal.ZERO, BigDecimal::add);

// 将卖出净收入转入可用现金（T+2结算完成）
BigDecimal newAvailableCash = assetSummary.getAvailableCash().add(settlementAmount);
assetSummary.setAvailableCash(newAvailableCash);

// 重置购买力为可用现金（结算后，所有资金都变为可提现）
assetSummary.setPurchasingPower(newAvailableCash);
```

## 🌐 API接口

### 获取购买力
```http
GET /api/trade/purchasing-power
Authorization: Bearer YOUR_TOKEN

Response:
{
  "code": 200,
  "data": 10500.00  // 当前购买力（可能包含未结算资金）
}
```

### 手动结算
```http
POST /api/trade/settle
Authorization: Bearer YOUR_TOKEN

Response:
{
  "code": 200,
  "message": "已结算 5 笔交易，结算金额: 10500.00"
}
```

## ⏰ 自动结算

**定时任务**: `TransactionSettleJob.java`
- 每日凌晨1点自动执行
- 将所有未结算交易标记为已结算
- 将卖出净收入转入可用现金
- 重置购买力为可用现金

```java
@Scheduled(cron = "0 0 1 * * ?")
public void dailySettle() {
    // 自动结算所有用户的交易
}
```

## ✅ 核心优势

1. **性能提升**: 使用数据库字段，无需每次计算
2. **真实模拟**: 准确模拟港股T+0、T+2结算机制
3. **资金安全**: 清晰区分可提现资金和可交易资金
4. **联动完整**: 本金操作与购买力自动联动
5. **易于扩展**: 支持多市场（港股T+0、A股T+1等）

## 📝 迁移步骤

1. **执行SQL脚本**
   ```bash
   mysql -u root -p wealth_pulse < V2__add_purchasing_power.sql
   ```

2. **重启应用**
   ```bash
   mvn spring-boot:run
   ```

3. **验证功能**
   - 查看购买力接口是否正常
   - 测试T+0交易流程
   - 验证结算功能
   - 验证本金操作联动

## 🔍 监控指标

建议监控以下指标：
- `purchasingPower` vs `availableCash` 的差异（未结算资金）
- 未结算交易数量和金额
- 每日结算执行成功率
- T+0资金占比（购买力 - 可用现金）

## 📚 相关文档

- 港股T+0交易规则
- 港股T+2结算规则
- 数据库表结构设计
- API接口文档
