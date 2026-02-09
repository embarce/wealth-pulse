-- 添加购买力字段到用户资产表
-- 支持港股T+0交易：购买力可用于交易，可用现金可提现
-- Date: 2026-02-07

ALTER TABLE `tb_user_asset_summary`
ADD COLUMN `purchasing_power` DECIMAL(20,2) DEFAULT NULL COMMENT '购买力（可用于交易）' AFTER `available_cash`;

-- 为现有数据初始化购买力（将购买力设置为可用现金）
UPDATE `tb_user_asset_summary`
SET `purchasing_power` = `available_cash`
WHERE `purchasing_power` IS NULL;
