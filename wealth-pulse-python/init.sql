-- Initialize Wealth Pulse Database

CREATE DATABASE IF NOT EXISTS wealth_pulse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wealth_pulse;

-- Stock Info Table
CREATE TABLE IF NOT EXISTS tb_stock_info (
    stock_code VARCHAR(20) PRIMARY KEY COMMENT '股票代码(如: NVDA.US)',
    company_name VARCHAR(100) NOT NULL COMMENT '公司全名',
    short_name VARCHAR(50) COMMENT '公司简称',
    stock_type VARCHAR(20) NOT NULL DEFAULT 'STOCK' COMMENT '股票类型: STOCK/ETF/BOND/INDEX等',
    exchange VARCHAR(20) COMMENT '交易所: NASDAQ/NYSE/SH/SZ/HK等',
    currency VARCHAR(10) DEFAULT 'USD' COMMENT '交易货币: USD/HKD/CNY等',
    industry VARCHAR(50) COMMENT '行业分类',
    market_cap VARCHAR(255) COMMENT '市值',
    display_order INT DEFAULT 0 COMMENT '显示顺序',
    stock_status TINYINT DEFAULT 1 COMMENT '状态: 1-正常交易',
    INDEX idx_stock_type (stock_type),
    INDEX idx_exchange (exchange),
    INDEX idx_stock_status (stock_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stock Information';

-- Stock Market Data Table
CREATE TABLE IF NOT EXISTS tb_stock_market_data (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '行情ID',
    stock_code VARCHAR(10) NOT NULL COMMENT '股票代码(如: NVDA.US)',
    last_price DECIMAL(20,4) COMMENT '最新价',
    change_number DECIMAL(20,4) COMMENT '涨跌额',
    change_rate DECIMAL(10,4) COMMENT '涨跌幅(%)',
    open_price DECIMAL(20,4) COMMENT '开盘价',
    pre_close DECIMAL(20,4) COMMENT '前收盘价',
    high_price DECIMAL(20,4) COMMENT '当日最高价',
    low_price DECIMAL(20,4) COMMENT '当日最低价',
    volume BIGINT COMMENT '成交量(股)',
    turnover DECIMAL(20,4) COMMENT '成交额',
    day_low DECIMAL(20,4) COMMENT '日内最低(L)',
    day_high DECIMAL(20,4) COMMENT '日内最高(N)',
    price_range_percent DECIMAL(10,4) COMMENT '价格区间百分比',
    week52_high DECIMAL(20,4) COMMENT '52周最高',
    week52_low DECIMAL(20,4) COMMENT '52周最低',
    market_cap DECIMAL(30,4) COMMENT '总市值',
    pe_ratio DECIMAL(10,4) COMMENT '市盈率',
    pb_ratio DECIMAL(10,4) COMMENT '市净率',
    quote_time DATETIME NOT NULL COMMENT '行情时间',
    market_date DATE NOT NULL COMMENT '交易日',
    data_source VARCHAR(50) COMMENT '数据来源',
    bid_price DECIMAL(20,4) COMMENT '买一价',
    ask_price DECIMAL(20,4) COMMENT '卖一价',
    bid_size BIGINT COMMENT '买一量',
    ask_size BIGINT COMMENT '卖一量',
    index_str JSON COMMENT '扩展指标(JSON格式)',
    PRIMARY KEY (id),
    UNIQUE KEY uk_stock_date (stock_code, market_date, quote_time),
    INDEX idx_market_date (market_date),
    INDEX idx_stock_id (stock_code),
    INDEX idx_quote_time (quote_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stock Market Data';

-- Stock Market History Table
CREATE TABLE IF NOT EXISTS tb_stock_market_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    stock_code VARCHAR(20) NOT NULL COMMENT '股票代码',
    trade_date DATE NOT NULL COMMENT '交易日期',
    open_price DECIMAL(20,4) COMMENT '开盘价',
    high_price DECIMAL(20,4) COMMENT '最高价',
    low_price DECIMAL(20,4) COMMENT '最低价',
    close_price DECIMAL(20,4) COMMENT '收盘价',
    adj_close DECIMAL(20,4) COMMENT '复权收盘价',
    volume BIGINT COMMENT '成交量',
    PRIMARY KEY (id),
    UNIQUE KEY uk_stock_trade_date (stock_code, trade_date),
    INDEX idx_trade_date (trade_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stock Market History';
