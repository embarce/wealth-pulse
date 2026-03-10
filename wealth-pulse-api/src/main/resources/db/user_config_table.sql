-- 用户配置表
-- 用于存储每个用户的个性化配置信息，包括通知设置、AI 模型配置等
-- Date: 2026-03-10

CREATE TABLE IF NOT EXISTS `tb_user_config` (
  `user_id` varchar(64) NOT NULL COMMENT '用户 ID（主键，与 tb_user 关联）',
  `email` varchar(255) DEFAULT NULL COMMENT '邮箱地址',
  `email_enabled` tinyint(1) DEFAULT 0 COMMENT '是否启用邮件通知',
  `feishu_webhook` varchar(512) DEFAULT NULL COMMENT '飞书 webhook 地址',
  `feishu_enabled` tinyint(1) DEFAULT 0 COMMENT '是否启用飞书通知',
  `notify_review_complete` tinyint(1) DEFAULT 1 COMMENT '是否通知复盘审计完成',
  `notify_vision_ready` tinyint(1) DEFAULT 1 COMMENT '是否通知视觉识图就绪',
  `notify_market_alert` tinyint(1) DEFAULT 0 COMMENT '是否通知异动行情',
  `notify_portfolio_risk` tinyint(1) DEFAULT 1 COMMENT '是否通知仓位风险',
  `llm_provider` varchar(50) DEFAULT NULL COMMENT 'LLM 供应商',
  `llm_model` varchar(100) DEFAULT NULL COMMENT 'LLM 模型',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_config_user` FOREIGN KEY (`user_id`) REFERENCES `tb_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户配置表';
