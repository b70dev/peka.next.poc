'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import ExcelJS from 'exceljs'
import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatAhvNumber, calculateAge, type PensionerRow } from '@/lib/pensioners'

interface RentnerExcelExportButtonProps {
  pensioners: PensionerRow[]
  disabled?: boolean
}

/**
 * PROJ-24: Exports the pensioner list (visible / filtered) to .xlsx.
 * Follows the pattern established in PROJ-8.
 */
export function RentnerExcelExportButton({
  pensioners,
  disabled = false,
}: RentnerExcelExportButtonProps) {
  const t = useTranslations('pensioners')
  const tA11y = useTranslations('accessibility')
  const [isExporting, setIsExporting] = useState(false)

  const isDisabled = disabled || pensioners.length === 0 || isExporting

  const tooltipText = useMemo(() => {
    if (pensioners.length === 0) {
      return t('export.tooltipEmpty')
    }
    return t('export.tooltip')
  }, [pensioners.length, t])

  const formatDate = (value: string | null): string => {
    if (!value) return ''
    return new Date(value).toLocaleDateString('de-CH')
  }

  const handleExport = async () => {
    if (pensioners.length === 0) return

    setIsExporting(true)

    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(t('export.sheetName'))

      worksheet.columns = [
        { header: t('columns.lastName'), width: 20 },
        { header: t('columns.firstName'), width: 20 },
        { header: t('columns.ahvNumber'), width: 18 },
        { header: t('columns.dateOfBirth'), width: 15 },
        { header: t('columns.age'), width: 8 },
        { header: t('columns.retirementDate'), width: 15 },
        { header: t('columns.monthlyAmount'), width: 22 },
        { header: t('columns.email'), width: 30 },
      ]

      pensioners.forEach((p) => {
        const row = worksheet.addRow([
          p.last_name,
          p.first_name,
          formatAhvNumber(p.ahv_number),
          formatDate(p.date_of_birth),
          calculateAge(p.date_of_birth),
          formatDate(p.retirement_date),
          p.monthly_pension_amount ?? '',
          p.email ?? '',
        ])
        // Preserve leading zeros in AHV column by forcing text format
        row.getCell(3).numFmt = '@'
        // Format pension amount as CHF currency
        if (p.monthly_pension_amount !== null) {
          row.getCell(7).numFmt = '#,##0.00 "CHF"'
        }
      })

      // Style header row
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true }

      const today = new Date().toISOString().split('T')[0]
      const filename = `${t('export.filename')}_${today}.xlsx`

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Pensioner export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isDisabled}
            className="gap-2"
            onClick={handleExport}
            aria-label={tA11y('exportExcel')}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('export.button')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
