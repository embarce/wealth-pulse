import { useEffect, useRef, useState } from 'react'
import { init, dispose } from 'klinecharts'
import type { KLineData } from 'klinecharts'
import { stockApi, MinuteDataPoint } from '../services/stockApi'

interface StockChartProps {
  stockCode: string
  symbol?: string
  height?: number
  onDataLoad?: (data: KLineData[], period: 'minute') => void // 数据加载完成回调
}

export default function StockChart({ stockCode, symbol, height = 500, onDataLoad }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<ReturnType<typeof init> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // 重置状态
    setLoading(true)
    setError(null)

    // 如果已有图表实例，先清理（dispose 接收图表实例）
    if (chartInstanceRef.current) {
      dispose(chartInstanceRef.current)
      chartInstanceRef.current = null
    }

    // 清空容器内容，防止残留
    chartContainerRef.current.innerHTML = ''

    // 初始化图表
    const chart = init(chartContainerRef.current, {
      layout: [
        {
          type: 'candle',
          content: ['MA', { name: 'EMA', calcParams: [10, 30] }],
          options: { order: Number.MIN_SAFE_INTEGER }
        },
        { type: 'indicator', content: ['VOL'], options: { order: 10 } },
        { type: 'xAxis', options: { order: 9 } }
      ]
    })
    chartInstanceRef.current = chart

    // 设置股票代码和周期
    chart.setSymbol({
      ticker: symbol || stockCode,
    })
    chart.setPeriod({ span: 1, type: 'minute' })

    // 设置数据加载器
    chart.setDataLoader({
      getBars: async ({ callback }) => {
        try {
          const data = await stockApi.getMinuteHistory(stockCode)
          const klineData = transformToKLineData(data)
          console.log('加载K线数据成功:', stockCode, klineData)
          setLoading(false)
          // 通知父组件数据已加载
          onDataLoad?.(klineData, 'minute')
          callback(klineData)
        } catch (err) {
          console.error('加载K线数据失败:', err)
          setLoading(false)
          setError('加载K线数据失败')
          callback([])
        }
      },
    })

    // 清理函数
    return () => {
      if (chartInstanceRef.current) {
        dispose(chartInstanceRef.current)
        chartInstanceRef.current = null
      }
    }
  }, [stockCode, symbol])

  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      {/* Loading 状态 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">加载K线数据中...</p>
          </div>
        </div>
      )}

      {/* Error 状态 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* 图表容器 */}
      <div
        ref={chartContainerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}

/**
 * 将后端 MinuteDataPoint 格式转换为 klinecharts K线数据格式
 */
function transformToKLineData(data: MinuteDataPoint[]): KLineData[] {
  return data.map((item) => ({
    timestamp: new Date(item.tradeTime).getTime(),
    open: item.openPrice,
    high: item.highPrice,
    low: item.lowPrice,
    close: item.closePrice,
    volume: item.volume,
  }))
}
