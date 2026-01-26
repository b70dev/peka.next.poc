'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import * as XLSX from 'xlsx'
import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InsuredPerson, Employer, InsuredPersonStatus } from '@/lib/database.types'

type InsuredPersonWithEmployer = InsuredPerson & {
  employer: Employer | null
}

type ColumnId = 'last_name' | 'first_name' | 'date_of_birth' | 'ahv_number' | 'employer' | 'status' | 'entry_date'

interface ExportColumn {
  id: ColumnId
  labelKey: string
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { id: 'last_name', labelKey: 'columns.lastName' },
  { id: 'first_name', labelKey: 'columns.firstName' },
  { id: 'date_of_birth', labelKey: 'columns.dateOfBirth' },
  { id: 'ahv_number', labelKey: 'columns.ahvNumber' },
  { id: 'employer', labelKey: 'columns.employer' },
  { id: 'status', labelKey: 'columns.status' },
  { id: 'entry_date', labelKey: 'columns.entryDate' },
]

interface ExcelExportButtonProps {
  data: InsuredPersonWithEmployer[]
  disabled?: boolean
}

export function ExcelExportButton({ data, disabled = false }: ExcelExportButtonProps) {
  const t = useTranslations('insured')
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnId>>(
    new Set(EXPORT_COLUMNS.map(c => c.id))
  )
  const [isExporting, setIsExporting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const isDisabled = disabled || data.length === 0
  const hasSelectedColumns = selectedColumns.size > 0

  const tooltipText = useMemo(() => {
    if (data.length === 0) {
      return t('export.tooltipEmpty')
    }
    return t('export.tooltip')
  }, [data.length, t])

  const toggleColumn = (columnId: ColumnId) => {
    setSelectedColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedColumns(new Set(EXPORT_COLUMNS.map(c => c.id)))
  }

  const selectNone = () => {
    setSelectedColumns(new Set())
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('de-CH')
  }

  const formatAhvNumber = (ahv: string): string => {
    if (ahv.length === 13 && !ahv.includes('.')) {
      return `${ahv.slice(0, 3)}.${ahv.slice(3, 7)}.${ahv.slice(7, 11)}.${ahv.slice(11)}`
    }
    return ahv
  }

  const getStatusLabel = (status: InsuredPersonStatus | null): string => {
    if (!status) return ''
    return t(`status.${status}`)
  }

  const getCellValue = (person: InsuredPersonWithEmployer, columnId: ColumnId): string => {
    switch (columnId) {
      case 'last_name':
        return person.last_name
      case 'first_name':
        return person.first_name
      case 'date_of_birth':
        return formatDate(person.date_of_birth)
      case 'ahv_number':
        return formatAhvNumber(person.ahv_number)
      case 'employer':
        return person.employer?.name || ''
      case 'status':
        return getStatusLabel(person.status)
      case 'entry_date':
        return formatDate(person.entry_date)
      default:
        return ''
    }
  }

  const handleExport = () => {
    if (!hasSelectedColumns || data.length === 0) return

    setIsExporting(true)

    try {
      const selectedColumnsList = EXPORT_COLUMNS.filter(c => selectedColumns.has(c.id))

      // Create header row with translated labels
      const headers = selectedColumnsList.map(c => t(c.labelKey))

      // Create data rows
      const rows = data.map(person =>
        selectedColumnsList.map(c => getCellValue(person, c.id))
      )

      // Create worksheet
      const worksheetData = [headers, ...rows]
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

      // Set column widths
      const columnWidths = selectedColumnsList.map(col => {
        // AHV number needs more width
        if (col.id === 'ahv_number') return { wch: 18 }
        if (col.id === 'employer') return { wch: 25 }
        return { wch: 15 }
      })
      worksheet['!cols'] = columnWidths

      // Format AHV column as text to preserve leading zeros
      const ahvColIndex = selectedColumnsList.findIndex(c => c.id === 'ahv_number')
      if (ahvColIndex !== -1) {
        const colLetter = XLSX.utils.encode_col(ahvColIndex)
        for (let i = 1; i <= data.length; i++) {
          const cellRef = `${colLetter}${i + 1}`
          if (worksheet[cellRef]) {
            worksheet[cellRef].t = 's' // Set type to string
          }
        }
      }

      // Create workbook
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Versicherte')

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0]
      const filename = `versicherte_${today}.xlsx`

      // Trigger download
      XLSX.writeFile(workbook, filename)

      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <TooltipProvider>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDisabled}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-56">
          <div className="p-2">
            <p className="text-sm font-medium mb-3">{t('export.selectColumns')}</p>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {EXPORT_COLUMNS.map(column => (
                <label
                  key={column.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                >
                  <Checkbox
                    checked={selectedColumns.has(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                  />
                  <span className="text-sm">{t(column.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>

          <DropdownMenuSeparator />

          <div className="p-2 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={selectAll}
            >
              {t('export.selectAll')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={selectNone}
            >
              {t('export.selectNone')}
            </Button>
          </div>

          <DropdownMenuSeparator />

          <div className="p-2">
            {!hasSelectedColumns && (
              <p className="text-xs text-muted-foreground mb-2">
                {t('export.minOneColumn')}
              </p>
            )}
            <Button
              className="w-full"
              size="sm"
              disabled={!hasSelectedColumns || isExporting}
              onClick={handleExport}
            >
              {isExporting ? t('common.loading') : t('export.export')}
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
