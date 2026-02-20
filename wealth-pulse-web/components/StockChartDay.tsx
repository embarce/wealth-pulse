import { useEffect, useRef, useState } from 'react'
import { init, dispose } from 'klinecharts'
import type { KLineData } from 'klinecharts'
import { stockApi, EnhancedDataPoint } from '../services/stockApi'

export type PeriodType = 'daily' | 'weekly' | 'monthly'
export type AdjustType = '' | 'hfq'
export type DateRangeType = '1m' | '3m' | '6m' | '1y' | 'all'

interface StockChartDayProps {
  stockCode: string
  symbol?: string
  height?: number
}

interface ChartOptions {
  period: PeriodType
  adjust: AdjustType
  startDate: string
  endDate: string
}

const DEFAULT_PERIOD: PeriodType = 'daily'
const DEFAULT_ADJUST: AdjustType = ''
const DEFAULT_START_DATE = ''
const DEFAULT_END_DATE = ''
const DEFAULT_DATE_RANGE: DateRangeType = '1y'

export default function StockChartDay({ stockCode, symbol, height = 500 }: StockChartDayProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<ReturnType<typeof init> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 图表选项
  const [options, setOptions] = useState<ChartOptions>({
    period: DEFAULT_PERIOD,
    adjust: DEFAULT_ADJUST,
    startDate: DEFAULT_START_DATE,
    endDate: DEFAULT_END_DATE,
  })

  // 当前选择的日期范围
  const [selectedRange, setSelectedRange] = useState<DateRangeType>(DEFAULT_DATE_RANGE)

  // 使用 ref 来追踪 options，避免在 setDataLoader 中闭包问题
  const optionsRef = useRef(options)

  // 格式化日期为 yyyy-MM-dd
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 获取默认结束日期（今天）
  const getDefaultEndDate = (): string => {
    return formatDate(new Date())
  }

  // 根据日期范围计算开始日期
  const getStartDateByRange = (range: DateRangeType): string => {
    const now = new Date()
    switch (range) {
      case '1m':
        now.setMonth(now.getMonth() - 1)
        return formatDate(now)
      case '3m':
        now.setMonth(now.getMonth() - 3)
        return formatDate(now)
      case '6m':
        now.setMonth(now.getMonth() - 6)
        return formatDate(now)
      case '1y':
        now.setFullYear(now.getFullYear() - 1)
        return formatDate(now)
      case 'all':
        return '2000-01-01'
      default:
        return formatDate(now)
    }
  }

  // 初始化日期范围
  useEffect(() => {
    // 根据默认范围设置初始日期
    const startDate = getStartDateByRange(DEFAULT_DATE_RANGE)
    const endDate = getDefaultEndDate()
    setOptions(prev => ({ ...prev, startDate, endDate }))
  }, [])

  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return

    // 重置状态
    setLoading(true)
    setError(null)

    // 如果已有图表实例，先清理
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

    // 设置股票代码
    chart.setSymbol({
      ticker: symbol || stockCode,
    })
    chart.setPeriod({ span: 1, type: 'day' })

    // 设置数据加载器
    chart.setDataLoader({
      getBars: async ({ callback }) => {
        try {
          const startDate = optionsRef.current.startDate
          const endDate = optionsRef.current.endDate

          const data = await stockApi.getEnhancedHistory(stockCode, {
            period: optionsRef.current.period,
            adjust: optionsRef.current.adjust,
            startDate,
            endDate,
          })

          const klineData = transformToKLineData(data)
          console.log('加载日线K线数据成功:', stockCode, klineData)
          setLoading(false)
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

  // 当选项变化时，重新加载数据
  useEffect(() => {
    optionsRef.current = options
    if (chartInstanceRef.current) {
      setLoading(true)
      setError(null)
      // 通过重新设置数据加载器来触发数据重新加载
      chartInstanceRef.current.setDataLoader({
        getBars: async ({ callback }) => {
          try {
            const startDate = options.startDate
            const endDate = options.endDate

            const data = await stockApi.getEnhancedHistory(stockCode, {
              period: options.period,
              adjust: options.adjust,
              startDate,
              endDate,
            })

            const klineData = transformToKLineData(data)
            console.log('加载日线K线数据成功:', stockCode, klineData)
            setLoading(false)
            callback(klineData)
          } catch (err) {
            console.error('加载K线数据失败:', err)
            setLoading(false)
            setError('加载K线数据失败')
            callback([])
          }
        },
      })
    }
  }, [stockCode, options])

  // 切换周期
  const handlePeriodChange = (period: PeriodType) => {
    setOptions(prev => ({ ...prev, period }))
  }

  // 切换复权类型
  const handleAdjustChange = (adjust: AdjustType) => {
    setOptions(prev => ({ ...prev, adjust }))
  }

  // 切换日期范围
  const handleDateRangeChange = (range: DateRangeType) => {
    setSelectedRange(range)

    const now = new Date()
    const endDate = formatDate(now)
    let startDate = ''

    switch (range) {
      case '1m':
        now.setMonth(now.getMonth() - 1)
        startDate = formatDate(now)
        break
      case '3m':
        now.setMonth(now.getMonth() - 3)
        startDate = formatDate(now)
        break
      case '6m':
        now.setMonth(now.getMonth() - 6)
        startDate = formatDate(now)
        break
      case '1y':
        now.setFullYear(now.getFullYear() - 1)
        startDate = formatDate(now)
        break
      case 'all':
        startDate = '2000-01-01'
        break
    }

    setOptions(prev => ({ ...prev, startDate, endDate }))
  }

  return (
    <div className="w-full">
      {/* 工具栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
        {/* 周期选择 */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">周期</span>
          <div className="flex space-x-1">
            {(['daily', 'weekly', 'monthly'] as PeriodType[]).map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                  options.period === period
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {period === 'daily' ? '日K' : period === 'weekly' ? '周K' : '月K'}
              </button>
            ))}
          </div>
        </div>

        {/* 复权类型选择 */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">复权</span>
          <div className="flex space-x-1">
            {([
              { value: '' as AdjustType, label: '不复权' },
              { value: 'hfq' as AdjustType, label: '后复权' },
            ] as const).map((adjust) => (
              <button
                key={adjust.value}
                onClick={() => handleAdjustChange(adjust.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  options.adjust === adjust.value
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {adjust.label}
              </button>
            ))}
          </div>
        </div>

        {/* 日期范围选择 */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">范围</span>
          <div className="flex space-x-1">
            {(['1m', '3m', '6m', '1y', 'all'] as DateRangeType[]).map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  selectedRange === range
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {range === 'all' ? '全部' : range === '1y' ? '1年' : range.replace('m', '个月')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 图表容器 */}
      <div className="relative" style={{ height: `${height}px` }}>
        {/* Loading 状态 */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">加载K线数据中...</p>
            </div>
          </div>
        )}

        {/* Error 状态 */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg z-10">
            <div className="text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* 图表 */}
        <div
          ref={chartContainerRef}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </div>
  )
}

/**
 * 将后端 EnhancedDataPoint (HkStockEnhancedHistoryVo) 格式转换为 klinecharts K线数据格式
 * 后端字段: tradeDate, openPrice, closePrice, highPrice, lowPrice, volume
 * KLineData字段: timestamp, open, high, low, close, volume
 */
function transformToKLineData(data: EnhancedDataPoint[]): KLineData[] {
  return data.map((item) => ({
    timestamp: new Date(item.tradeDate).getTime(),
    open: item.openPrice,
    high: item.highPrice,
    low: item.lowPrice,
    close: item.closePrice,
    volume: item.volume,
  }))
}
