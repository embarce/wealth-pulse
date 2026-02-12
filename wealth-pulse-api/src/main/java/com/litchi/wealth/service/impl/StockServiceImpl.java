package com.litchi.wealth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.litchi.wealth.dto.trade.FeeCalculationRequest;
import com.litchi.wealth.entity.StockInfo;
import com.litchi.wealth.entity.StockMarketData;
import com.litchi.wealth.entity.StockMarketHistory;
import com.litchi.wealth.service.StockInfoService;
import com.litchi.wealth.service.StockMarketDataService;
import com.litchi.wealth.service.StockMarketHistoryService;
import com.litchi.wealth.service.StockService;
import com.litchi.wealth.utils.HkStockFeeCalculator;
import com.litchi.wealth.vo.FeeCalculationVo;
import com.litchi.wealth.vo.StockHistoryVo;
import com.litchi.wealth.vo.StockInfoVo;
import com.litchi.wealth.vo.StockMarketDataVo;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 股票服务实现类
 *
 * @author Embrace
 * @version 1.0
 * @description: 股票信息查询业务逻辑实现
 * @date 2026/2/12
 */
@Slf4j
@Service
public class StockServiceImpl implements StockService {

    @Resource
    private StockInfoService stockInfoService;

    @Resource
    private StockMarketDataService stockMarketDataService;

    @Resource
    private StockMarketHistoryService stockMarketHistoryService;

    @Override
    public List<StockMarketDataVo> getHotStocks(Integer limit) {
        // 查询当日行情数据，按成交额降序排列
        LambdaQueryWrapper<StockMarketData> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.orderByDesc(StockMarketData::getTurnover)
                .last("LIMIT " + limit);

        List<StockMarketData> marketDataList = stockMarketDataService.list(queryWrapper);

        // 转换为VO
        return marketDataList.stream().map(this::convertToMarketDataVo).collect(Collectors.toList());
    }

    @Override
    public StockMarketDataVo getMarketData(String stockCode) {
        // 查询实时行情数据（最新的一条）
        LambdaQueryWrapper<StockMarketData> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(StockMarketData::getStockCode, stockCode)
                .orderByDesc(StockMarketData::getQuoteTime)
                .last("LIMIT 1");

        StockMarketData marketData = stockMarketDataService.getOne(queryWrapper);

        if (marketData == null) {
            return null;
        }

        return convertToMarketDataVo(marketData);
    }

    @Override
    public StockInfoVo getStockInfo(String stockCode) {
        // 查询股票基本信息
        LambdaQueryWrapper<StockInfo> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(StockInfo::getStockCode, stockCode);
        StockInfo stockInfo = stockInfoService.getOne(queryWrapper);

        if (stockInfo == null) {
            return null;
        }

        // 转换为VO
        return StockInfoVo.builder()
                .stockCode(stockInfo.getStockCode())
                .companyName(stockInfo.getCompanyName())
                .companyNameCn(stockInfo.getCompanyNameCn())
                .shortName(stockInfo.getShortName())
                .stockType(stockInfo.getStockType())
                .exchange(stockInfo.getExchange())
                .currency(stockInfo.getCurrency())
                .industry(stockInfo.getIndustry())
                .marketCap(stockInfo.getMarketCap())
                .stockStatus(stockInfo.getStockStatus())
                .build();
    }

    @Override
    public List<StockHistoryVo> getStockHistory(String stockCode, Date startDate, Date endDate, Integer limit) {
        // 查询历史行情数据
        LambdaQueryWrapper<StockMarketHistory> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(StockMarketHistory::getStockCode, stockCode)
                .orderByDesc(StockMarketHistory::getTradeDate);

        // 日期范围过滤
        if (startDate != null) {
            queryWrapper.ge(StockMarketHistory::getTradeDate, startDate);
        }
        if (endDate != null) {
            queryWrapper.le(StockMarketHistory::getTradeDate, endDate);
        }

        queryWrapper.last("LIMIT " + limit);

        List<StockMarketHistory> historyList = stockMarketHistoryService.list(queryWrapper);

        // 转换为VO
        return historyList.stream().map(history ->
                StockHistoryVo.builder()
                        .stockCode(history.getStockCode())
                        .tradeDate(formatDate(history.getTradeDate(), "yyyy-MM-dd"))
                        .openPrice(history.getOpenPrice())
                        .highPrice(history.getHighPrice())
                        .lowPrice(history.getLowPrice())
                        .closePrice(history.getClosePrice())
                        .adjClose(history.getAdjClose())
                        .volume(history.getVolume())
                        .build()
        ).collect(Collectors.toList());
    }

    @Override
    public FeeCalculationVo calculateFee(FeeCalculationRequest request) {
        String currency = request.getCurrency() != null ? request.getCurrency() : "HKD";
        HkStockFeeCalculator.FeeResult feeResult;

        // 根据买卖指令计算费用
        if ("BUY".equals(request.getInstruction())) {
            if ("HKD".equals(currency)) {
                feeResult = HkStockFeeCalculator.calculateBuyFee(request.getAmount());
            } else {
                feeResult = new HkStockFeeCalculator.FeeResult();
                feeResult.setNetAmount(request.getAmount());
            }
        } else if ("SELL".equals(request.getInstruction())) {
            if ("HKD".equals(currency)) {
                feeResult = HkStockFeeCalculator.calculateSellFee(request.getAmount());
            } else {
                feeResult = new HkStockFeeCalculator.FeeResult();
                feeResult.setNetAmount(request.getAmount());
            }
        } else {
            throw new IllegalArgumentException("无效的交易指令，必须是 BUY 或 SELL");
        }

        // 构建返回结果
        FeeCalculationVo result = FeeCalculationVo.builder()
                .instruction(request.getInstruction())
                .amount(request.getAmount())
                .platformFee(feeResult.getPlatformFee())
                .sfcLevy(feeResult.getSfcLevy())
                .exchangeTradingFee(feeResult.getExchangeTradingFee())
                .settlementFee(feeResult.getSettlementFee())
                .frcLevy(feeResult.getFrcLevy())
                .stampDuty(feeResult.getStampDuty())
                .totalFee(feeResult.getTotalFee())
                .netAmount(feeResult.getNetAmount())
                .feeBreakdown(HkStockFeeCalculator.formatFeeInfo(feeResult))
                .build();

        log.info("计算手续费: instruction={}, amount={}, totalFee={}, netAmount={}",
                request.getInstruction(), request.getAmount(), feeResult.getTotalFee(), feeResult.getNetAmount());

        return result;
    }

    /**
     * 将 StockMarketData 实体转换为 StockMarketDataVo
     */
    private StockMarketDataVo convertToMarketDataVo(StockMarketData marketData) {
        // 查询股票基本信息
        LambdaQueryWrapper<StockInfo> infoQuery = new LambdaQueryWrapper<>();
        infoQuery.eq(StockInfo::getStockCode, marketData.getStockCode());
        StockInfo stockInfo = stockInfoService.getOne(infoQuery);

        return StockMarketDataVo.builder()
                .stockCode(marketData.getStockCode())
                .companyName(stockInfo != null ? stockInfo.getCompanyName() : null)
                .companyNameCn(stockInfo != null ? stockInfo.getCompanyNameCn() : null)
                .lastPrice(marketData.getLastPrice())
                .changeNumber(marketData.getChangeNumber())
                .changeRate(marketData.getChangeRate())
                .openPrice(marketData.getOpenPrice())
                .preClose(marketData.getPreClose())
                .highPrice(marketData.getHighPrice())
                .lowPrice(marketData.getLowPrice())
                .volume(marketData.getVolume())
                .turnover(marketData.getTurnover())
                .week52High(marketData.getWeek52High())
                .week52Low(marketData.getWeek52Low())
                .marketCap(marketData.getMarketCap())
                .peRatio(marketData.getPeRatio())
                .pbRatio(marketData.getPbRatio())
                .quoteTime(formatDate(marketData.getQuoteTime(), "HH:mm:ss"))
                .marketDate(formatDate(marketData.getMarketDate(), "yyyy-MM-dd"))
                .currency(stockInfo != null ? stockInfo.getCurrency() : null)
                .build();
    }

    /**
     * 格式化日期
     */
    private String formatDate(Date date, String pattern) {
        if (date == null) {
            return null;
        }
        SimpleDateFormat sdf = new SimpleDateFormat(pattern);
        return sdf.format(date);
    }
}
