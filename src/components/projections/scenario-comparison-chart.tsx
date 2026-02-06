'use client'

import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/projections'

interface ScenarioData {
  name: string
  capitalTotal: number
  capitalObl: number
  capitalUeob: number
  pensionTotal: number
}

interface ScenarioComparisonChartProps {
  scenarios: ScenarioData[]
}

export function ScenarioComparisonChart({ scenarios }: ScenarioComparisonChartProps) {
  const t = useTranslations('projections')

  if (scenarios.length === 0) return null

  // Find max values for scaling
  const maxCapital = Math.max(...scenarios.map(s => s.capitalTotal))
  const maxPension = Math.max(...scenarios.map(s => s.pensionTotal))

  // Colors for scenarios
  const colors = [
    { obl: 'bg-blue-500', ueob: 'bg-blue-300', pension: 'bg-emerald-500' },
    { obl: 'bg-purple-500', ueob: 'bg-purple-300', pension: 'bg-emerald-400' },
    { obl: 'bg-orange-500', ueob: 'bg-orange-300', pension: 'bg-emerald-300' },
    { obl: 'bg-pink-500', ueob: 'bg-pink-300', pension: 'bg-teal-500' },
    { obl: 'bg-cyan-500', ueob: 'bg-cyan-300', pension: 'bg-teal-400' },
  ]

  return (
    <div className="space-y-8">
      {/* Capital Comparison */}
      <div>
        <h4 className="text-sm font-medium mb-4">{t('results.projectedCapital')}</h4>
        <div className="space-y-4">
          {scenarios.map((scenario, index) => {
            const capitalWidth = maxCapital > 0 ? (scenario.capitalTotal / maxCapital) * 100 : 0
            const oblWidth = scenario.capitalTotal > 0 ? (scenario.capitalObl / scenario.capitalTotal) * 100 : 0

            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]">{scenario.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(scenario.capitalTotal)}</span>
                </div>
                <div className="h-8 bg-muted rounded-md overflow-hidden">
                  <div
                    className="h-full flex transition-all duration-300"
                    style={{ width: `${capitalWidth}%` }}
                  >
                    <div
                      className={`h-full ${colors[index % colors.length].obl} transition-all duration-300`}
                      style={{ width: `${oblWidth}%` }}
                      title={`${t('results.obl')}: ${formatCurrency(scenario.capitalObl)}`}
                    />
                    <div
                      className={`h-full ${colors[index % colors.length].ueob} transition-all duration-300`}
                      style={{ width: `${100 - oblWidth}%` }}
                      title={`${t('results.ueob')}: ${formatCurrency(scenario.capitalUeob)}`}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>{t('results.obl')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-300 rounded" />
            <span>{t('results.ueob')}</span>
          </div>
        </div>
      </div>

      {/* Pension Comparison */}
      <div>
        <h4 className="text-sm font-medium mb-4">{t('results.monthlyPension')}</h4>
        <div className="space-y-4">
          {scenarios.map((scenario, index) => {
            const pensionWidth = maxPension > 0 ? (scenario.pensionTotal / maxPension) * 100 : 0

            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]">{scenario.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(scenario.pensionTotal)}/Mt.</span>
                </div>
                <div className="h-8 bg-muted rounded-md overflow-hidden">
                  <div
                    className={`h-full ${colors[index % colors.length].pension} transition-all duration-300`}
                    style={{ width: `${pensionWidth}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">{t('scenarios.title')}</th>
              <th className="text-right py-2 font-medium">{t('results.totalCapital')}</th>
              <th className="text-right py-2 font-medium">{t('results.totalPension')}</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((scenario, index) => (
              <tr key={index} className="border-b last:border-0">
                <td className="py-2">{scenario.name}</td>
                <td className="text-right py-2">{formatCurrency(scenario.capitalTotal)}</td>
                <td className="text-right py-2">{formatCurrency(scenario.pensionTotal)}/Mt.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
