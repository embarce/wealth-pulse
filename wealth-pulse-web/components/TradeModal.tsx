import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { StockPrice, TransactionType } from '../types';
import { stockApi, StockInfo, FeeCalculationResponse } from '../services/stockApi';
import { tradeApi } from '../services/tradeApi';
import { ToastContextType } from '../contexts/ToastContext';

// 港股默认每手股数（当后端未返回交易单位时使用）
const DEFAULT_LOT_SIZE = 100;

type TradeMode = 'BUY' | 'SELL';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockPrice | null;
  mode: TradeMode;
  maxQuantity?: number; // 仅卖出模式使用
  assets?: { cash: number }; // 仅买入模式使用
  onSuccess: (transaction: any) => Promise<void>;
  toast: ToastContextType;
  translations?: {
    buyStock?: string;
    sellStock?: string;
    execute?: string;
    insufficient_cash?: string;
  };
}

const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  stock,
  mode,
  maxQuantity = 0,
  assets = { cash: 0 },
  onSuccess,
  toast,
  translations = {},
}) => {
  const [quantity, setQuantity] = useState<number>(mode === 'BUY' ? DEFAULT_LOT_SIZE : maxQuantity);
  const [price, setPrice] = useState<number>(0);
  const [marketPrice, setMarketPrice] = useState<number>(0); // 保存市场价作为参考
  const [fee, setFee] = useState<FeeCalculationResponse | null>(null);
  const [customPlatformFee, setCustomPlatformFee] = useState<number | null>(null); // 用户自定义的平台费
  const [time, setTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [lotSize, setLotSize] = useState<number>(DEFAULT_LOT_SIZE); // 交易单位

  const isBuy = mode === 'BUY';
  const title = isBuy
    ? `${translations.buyStock || '买入'} ${stock?.symbol || ''}`
    : `${translations.sellStock || '卖出'} ${stock?.symbol || ''}`;

  // 计算实际使用的平台费（优先使用用户自定义的）
  const actualPlatformFee = customPlatformFee !== null ? customPlatformFee : (fee?.platformFee || 0);

  // 计算总手续费 = 自定义平台费 + 固定税费
  const calculatedTotalFee = fee ? actualPlatformFee + fee.sfcLevy + fee.exchangeTradingFee + fee.settlementFee + fee.stampDuty + (fee.frcLevy || 0) : 0;

  // 计算当前是否为整手
  const isWholeLot = quantity > 0 && quantity % lotSize === 0;

  // 验证数量是否为整手
  const validateQuantity = (value: number) => {
    if (value <= 0) return true; // 允许清空
    if (value % lotSize !== 0) {
      toast.showError(`交易数量必须是 ${lotSize} 股的整数倍（${lotSize} 股/手）`);
      return false;
    }
    return true;
  };

  // 重置表单
  useEffect(() => {
    if (!isOpen || !stock) {
      setPrice(0);
      setMarketPrice(0);
      setFee(null);
      setCustomPlatformFee(null);
      setStockInfo(null);
      return;
    }

    const fetchStockData = async () => {
      setIsLoadingPrice(true);
      try {
        const [marketData, info] = await Promise.all([
          stockApi.getMarketData(stock.symbol),
          stockApi.getStockInfo(stock.symbol).catch(() => null)
        ]);

        const fetchedPrice = Number(marketData.lastPrice);
        setPrice(fetchedPrice);
        setMarketPrice(fetchedPrice);
        if (info) {
          setStockInfo(info);
        }
      } catch (e) {
        console.error('获取股票数据失败', e);
        const fallbackPrice = stock.price;
        setPrice(fallbackPrice);
        setMarketPrice(fallbackPrice);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchStockData();
  }, [isOpen, stock]);

  // 当股票信息获取后，设置交易单位
  useEffect(() => {
    if (stockInfo && stockInfo.lotSize) {
      setLotSize(stockInfo.lotSize);
    } else {
      // 使用默认交易单位
      setLotSize(DEFAULT_LOT_SIZE);
    }
  }, [stockInfo]);

  // 当 lotSize 更新时，如果是买入模式且数量还未手动修改，则同步更新数量
  useEffect(() => {
    if (isBuy && mode === 'BUY') {
      setQuantity(lotSize);
    }
  }, [lotSize, isBuy]);

  // 当最大数量变化时更新数量（仅卖出模式）
  useEffect(() => {
    if (!isBuy && maxQuantity > 0) {
      setQuantity(maxQuantity);
    }
  }, [maxQuantity, isBuy]);

  // 计算手续费
  useEffect(() => {
    if (!price || !quantity || !isOpen) {
      setFee(null);
      setCustomPlatformFee(null);
      return;
    }

    const calculateFee = async () => {
      setIsLoadingFee(true);
      try {
        const amount = price * quantity;
        const feeResult = await stockApi.calculateFee({
          instruction: mode,
          amount: amount,
          currency: 'HKD'
        });
        setFee(feeResult);
        // 重置自定义平台费，使用后端计算值
        setCustomPlatformFee(null);
      } catch (e) {
        console.error('计算手续费失败', e);
        setFee(null);
        setCustomPlatformFee(null);
      } finally {
        setIsLoadingFee(false);
      }
    };

    calculateFee();
  }, [price, quantity, isOpen, mode]);

  const handleExecute = async () => {
    if (!stock || !price) return;

    // 验证数量是否为整手
    if (!validateQuantity(quantity)) {
      return;
    }

    // 买入模式检查现金是否充足
    if (isBuy) {
      const total = price * quantity;
      const feeAmount = calculatedTotalFee;
      const totalWithFee = total + feeAmount;

      if (totalWithFee > assets.cash) {
        toast.showError(translations.insufficient_cash || '现金不足');
        return;
      }
    }

    setIsExecuting(true);
    try {
      // 调用后端接口
      if (isBuy) {
        await tradeApi.buyStock({
          stockCode: stock.symbol,
          quantity,
          price,
          currency: 'HKD',
        });
      } else {
        await tradeApi.sellStock({
          stockCode: stock.symbol,
          quantity,
          price,
          currency: 'HKD',
        });
      }

      // 创建交易记录
      const total = price * quantity;
      const newTx = {
        id: Date.now().toString(),
        date: isBuy ? new Date(time).toISOString() : new Date().toISOString(),
        symbol: stock.symbol,
        type: isBuy ? TransactionType.BUY : TransactionType.SELL,
        price,
        quantity,
        total,
        fee: calculatedTotalFee,
        ...(isBuy && { tradeTime: time })
      };

      await onSuccess(newTx);

      // 重置表单
      if (isBuy) {
        setQuantity(lotSize); // 重置为1手
        setTime(new Date().toISOString().slice(0, 16));
      } else {
        setQuantity(0);
      }
      setFee(null);
      onClose();

      toast.showSuccess(isBuy ? '买入成功' : '卖出成功');
    } catch (e: any) {
      toast.showError(e?.message || (isBuy ? '买入失败' : '卖出失败'));
    } finally {
      setIsExecuting(false);
    }
  };

  if (!stock) return null;

  const colors = isBuy
    ? {
        bgGradient: 'from-indigo-50 to-purple-50',
        bgSolid: 'bg-indigo-50',
        bgBadge: 'bg-indigo-100',
        textBadge: 'text-indigo-600',
        textMain: 'text-indigo-600',
        buttonBg: 'bg-slate-950 hover:bg-slate-800',
      }
    : {
        bgGradient: 'from-rose-50 to-pink-50',
        bgSolid: 'bg-rose-50',
        bgBadge: 'bg-rose-100',
        textBadge: 'text-rose-600',
        textMain: 'text-rose-600',
        buttonBg: 'bg-rose-600 hover:bg-rose-700',
      };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5">
        {/* 股票信息 */}
        {stockInfo && (
          <div className={`bg-gradient-to-r ${colors.bgGradient} rounded-2xl p-4 space-y-2`}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800">{stockInfo.companyNameCn || stockInfo.companyName}</h4>
              <span className={`text-[10px] font-black ${colors.bgBadge} ${colors.textBadge} px-2 py-1 rounded-lg`}>
                {stockInfo.stockType}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="text-slate-600">行业: <span className="font-black text-slate-800">{stockInfo.industry || '-'}</span></div>
              <div className="text-slate-600">市值: <span className="font-black text-slate-800">{stockInfo.marketCap || '-'}</span></div>
            </div>
          </div>
        )}

        {/* 实时价格 - 可编辑 */}
        <div className={`${colors.bgSolid} rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-black ${colors.textMain} uppercase tracking-wider`}>
              {isBuy ? '交易价格' : '成交价格'}
            </span>
            {isLoadingPrice ? (
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-[10px] text-slate-400">市场价: ¥{marketPrice.toFixed(2)}</span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">¥</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              step="0.01"
              min="0"
              className="w-full bg-white border-2 border-slate-200 rounded-xl p-4 pl-10 text-right text-2xl font-black outline-none focus:border-indigo-500 transition-all"
              placeholder="0.00"
            />
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">
            {isBuy ? '数据延迟15分钟，可根据实际行情调整价格' : '可根据实际成交价格调整'}
          </p>
        </div>

        {/* 数量输入 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
              {isBuy ? '买入数量' : '卖出数量'}
            </label>
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-black">
              {lotSize} 股/手
            </span>
          </div>

          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const newValue = Number(e.target.value);
              setQuantity(newValue);
            }}
            onBlur={() => {
              // 失去焦点时验证并自动调整为整手
              if (quantity > 0 && quantity % lotSize !== 0) {
                const adjustedQuantity = Math.round(quantity / lotSize) * lotSize;
                setQuantity(Math.max(lotSize, adjustedQuantity));
                toast.showWarning(`数量已调整为 ${adjustedQuantity} 股`);
              }
            }}
            min="0"
            step={lotSize}
            max={!isBuy ? maxQuantity : undefined}
            className="w-full bg-slate-50 border-2 rounded-2xl p-5 text-center text-xl font-black outline-none transition-all"
            style={{
              borderColor: isWholeLot ? '#e2e8f0' : '#fbbf24',
              color: isWholeLot ? '#1e293b' : '#f59e0b'
            }}
          />

          {!isWholeLot && quantity > 0 && (
            <p className="text-[10px] text-amber-500 font-bold mt-2 text-center">
              非整手，将自动调整为 {Math.round(quantity / lotSize) * lotSize} 股
            </p>
          )}

          {!isBuy && (
            <p className="text-[10px] text-slate-400 font-bold mt-2 text-center">
              当前持仓: {maxQuantity} 股
            </p>
          )}

          {/* 交易规则提示 */}
          <div className="mt-3 bg-slate-50 rounded-lg p-2">
            <div className="flex items-start space-x-2">
              <i className="fas fa-info-circle text-indigo-400 text-[10px] mt-0.5"></i>
              <div className="text-[9px] text-slate-500 leading-relaxed">
                港股交易必须以"手"为单位，当前每手 <span className="font-black text-slate-700">{lotSize}</span> 股。
                {!stockInfo?.lotSize && (
                  <span className="text-amber-500">（系统使用默认值，请以券商实际为准）</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 交易金额 */}
        <div className="bg-slate-50 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">交易金额</span>
            <span className="text-lg font-black text-slate-900">¥{(price * quantity).toFixed(2)}</span>
          </div>
        </div>

        {/* 手续费明细 */}
        {fee && (
          <div className="bg-amber-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-600 uppercase tracking-wider">手续费明细</span>
              <span className="text-sm font-black text-amber-600">¥{calculatedTotalFee.toFixed(2)}</span>
            </div>
            <div className="space-y-2 text-[10px] text-amber-500/70">
              {/* 平台费 - 可编辑 */}
              <div className="flex justify-between items-center bg-white/50 rounded-lg p-2">
                <div className="flex items-center space-x-2">
                  <span>平台费</span>
                  <span className="text-[8px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded">可调整</span>
                </div>
                <div className="flex items-center space-x-2">
                  {customPlatformFee === null ? (
                    <button
                      onClick={() => setCustomPlatformFee(fee.platformFee)}
                      className="text-[8px] bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 transition-colors"
                    >
                      修改
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500">¥</span>
                      <input
                        type="number"
                        value={customPlatformFee}
                        onChange={(e) => setCustomPlatformFee(Number(e.target.value))}
                        step="0.01"
                        min="0"
                        className="w-16 bg-white border border-amber-300 rounded px-1 py-0.5 text-right text-xs font-black outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => setCustomPlatformFee(null)}
                        className="text-[8px] bg-slate-400 text-white px-2 py-1 rounded hover:bg-slate-500 transition-colors"
                        title="恢复默认值"
                      >
                        重置
                      </button>
                    </div>
                  )}
                  <span className="font-black">¥{actualPlatformFee.toFixed(2)}</span>
                </div>
              </div>

              {/* 固定税费 - 只读 */}
              <div className="flex justify-between">
                <span>印花税</span>
                <span>¥{fee.stampDuty.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>证监会征费</span>
                <span>¥{fee.sfcLevy.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>交易所交易费</span>
                <span>¥{fee.exchangeTradingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>结算费</span>
                <span>¥{fee.settlementFee.toFixed(2)}</span>
              </div>
              {fee.frcLevy > 0 && (
                <div className="flex justify-between">
                  <span>会财局征费</span>
                  <span>¥{fee.frcLevy.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="text-[9px] text-slate-500 border-t border-amber-200 pt-2">
              💡 提示：印花税、证监会征费等为法定税费，仅平台费可根据券商费率调整
            </div>
          </div>
        )}

        {/* 金额汇总 */}
        {isBuy ? (
          <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white/70 uppercase tracking-wider">交易金额</span>
              <span className="text-lg font-black text-white/90">¥{(price * quantity).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">手续费</span>
              <span className="text-lg font-black text-amber-400">¥{calculatedTotalFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/20 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white uppercase tracking-wider">总金额</span>
                <span className="text-2xl font-black text-white">
                  ¥{((price * quantity) + calculatedTotalFee).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">预计到账</span>
              <span className="text-2xl font-black text-emerald-600">
                ¥{((price * quantity) - calculatedTotalFee).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* 买入时间 - 仅买入模式 */}
        {isBuy && (
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
              买入时间
            </label>
            <input
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        )}

        {/* 执行按钮 */}
        <button
          onClick={handleExecute}
          disabled={!price || isLoadingFee || isExecuting}
          className={`w-full text-white py-6 rounded-3xl font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all ${colors.buttonBg}`}
        >
          {isExecuting ? '执行中...' : (isLoadingFee ? '计算中...' : (translations.execute || '确认执行'))}
        </button>
      </div>
    </Modal>
  );
};

export default TradeModal;
