'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import ExcelJS from 'exceljs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContributionRateWithTotal } from '@/app/[locale]/(protected)/settings/contribution-rates/actions'

// ===========================================
// Types
// ===========================================

export interface ParsedRate {
  age: number
  gender: 'M' | 'W' | null
  employee_rate: number
  employer_rate: number
  total_rate: number
  rowIndex: number
  status: 'valid' | 'warning' | 'error'
  message?: string
}

export interface ImportResult {
  rates: ParsedRate[]
  errors: string[]
  warnings: string[]
}

// Column name mappings (German and English)
const COLUMN_MAPPINGS = {
  age: ['alter', 'age', 'altersgruppe', 'age group'],
  gender: ['geschlecht', 'gender', 'sex', 'geschl', 'geschl.'],
  employeeRate: ['an-satz', 'an satz', 'ansatz', 'arbeitnehmer', 'employee rate', 'employee', 'an', 'an %', 'an-satz %'],
  employerRate: ['ag-satz', 'ag satz', 'agsatz', 'arbeitgeber', 'employer rate', 'employer', 'ag', 'ag %', 'ag-satz %'],
}

// Gender mappings
const GENDER_MAPPINGS: Record<string, 'M' | 'W' | null> = {
  'm': 'M',
  'w': 'W',
  'f': 'W',
  'male': 'M',
  'female': 'W',
  'weiblich': 'W',
  'maennlich': 'M',
  'männlich': 'M',
  '': null,
  '-': null,
  'alle': null,
  'all': null,
}

// ===========================================
// Parsing Functions
// ===========================================

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[%\s]+/g, ' ').trim()
}

function findColumnIndex(headers: string[], mappings: string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader)
  for (const mapping of mappings) {
    const index = normalizedHeaders.findIndex(h => h.includes(mapping) || mapping.includes(h))
    if (index !== -1) return index
  }
  return -1
}

function parseGender(value: string | number | null | undefined): 'M' | 'W' | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).toLowerCase().trim()
  return GENDER_MAPPINGS[normalized] ?? null
}

function parseRate(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0

  // Handle string values
  if (typeof value === 'string') {
    // Remove % sign and spaces
    const cleaned = value.replace(/[%\s]/g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  // Handle number values
  if (typeof value === 'number') {
    // If value > 1, assume it's already a percentage
    // If value <= 1, assume it's a decimal (0.05 = 5%)
    return value > 1 ? value : value * 100
  }

  return 0
}

function parseAge(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return -1
  const parsed = parseInt(String(value), 10)
  return isNaN(parsed) ? -1 : parsed
}

function validateRate(rate: ParsedRate): ParsedRate {
  const result = { ...rate }

  // Age validation
  if (rate.age < 18 || rate.age > 70) {
    result.status = 'error'
    result.message = `Alter ${rate.age} ausserhalb des gueltigen Bereichs (18-70)`
    return result
  }

  // Rate validation
  if (rate.employee_rate < 0 || rate.employee_rate > 100) {
    result.status = 'error'
    result.message = `AN-Satz ${rate.employee_rate}% ausserhalb des gueltigen Bereichs (0-100%)`
    return result
  }

  if (rate.employer_rate < 0 || rate.employer_rate > 100) {
    result.status = 'error'
    result.message = `AG-Satz ${rate.employer_rate}% ausserhalb des gueltigen Bereichs (0-100%)`
    return result
  }

  // Warning for unusually high rates
  if (rate.employee_rate > 25 || rate.employer_rate > 25) {
    result.status = 'warning'
    result.message = 'Ungewoehnlich hoher Wert'
  }

  return result
}

export function parseExcelOrCsvData(data: unknown[][], hasHeader: boolean = true): ImportResult {
  const errors: string[] = []
  const warnings: string[] = []
  const rates: ParsedRate[] = []

  if (!data || data.length === 0) {
    errors.push('Keine Daten in der Datei gefunden')
    return { rates, errors, warnings }
  }

  // Get headers
  const headers = hasHeader ? (data[0] as string[]).map(String) : ['age', 'gender', 'employee_rate', 'employer_rate']
  const dataRows = hasHeader ? data.slice(1) : data

  // Find column indices
  const ageIndex = findColumnIndex(headers, COLUMN_MAPPINGS.age)
  const genderIndex = findColumnIndex(headers, COLUMN_MAPPINGS.gender)
  const employeeRateIndex = findColumnIndex(headers, COLUMN_MAPPINGS.employeeRate)
  const employerRateIndex = findColumnIndex(headers, COLUMN_MAPPINGS.employerRate)

  // Validate required columns
  if (ageIndex === -1) {
    errors.push('Spalte "Alter" nicht gefunden. Erwartet: Alter, Age, Altersgruppe')
    return { rates, errors, warnings }
  }

  if (employeeRateIndex === -1) {
    errors.push('Spalte "AN-Satz" nicht gefunden. Erwartet: AN-Satz, AN, Arbeitnehmer, Employee Rate')
    return { rates, errors, warnings }
  }

  if (employerRateIndex === -1) {
    errors.push('Spalte "AG-Satz" nicht gefunden. Erwartet: AG-Satz, AG, Arbeitgeber, Employer Rate')
    return { rates, errors, warnings }
  }

  // Parse rows
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as (string | number | null | undefined)[]
    if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
      continue // Skip empty rows
    }

    const age = parseAge(row[ageIndex])
    const gender = genderIndex !== -1 ? parseGender(row[genderIndex]) : null
    const employeeRate = parseRate(row[employeeRateIndex])
    const employerRate = parseRate(row[employerRateIndex])

    if (age === -1) {
      warnings.push(`Zeile ${i + 2}: Ungueltiges Alter, uebersprungen`)
      continue
    }

    const rate: ParsedRate = {
      age,
      gender,
      employee_rate: Math.round(employeeRate * 100) / 100,
      employer_rate: Math.round(employerRate * 100) / 100,
      total_rate: Math.round((employeeRate + employerRate) * 100) / 100,
      rowIndex: i + (hasHeader ? 2 : 1),
      status: 'valid',
    }

    rates.push(validateRate(rate))
  }

  // Check for missing ages
  const existingAges = new Set(rates.map(r => `${r.age}-${r.gender}`))
  const missingAges: number[] = []

  for (let age = 18; age <= 70; age++) {
    // Check if age exists (with null gender for same_for_all_genders)
    const hasAge = existingAges.has(`${age}-null`) || existingAges.has(`${age}-M`) || existingAges.has(`${age}-W`)
    if (!hasAge) {
      missingAges.push(age)
    }
  }

  if (missingAges.length > 0) {
    if (missingAges.length <= 5) {
      warnings.push(`Fehlende Altersgruppen: ${missingAges.join(', ')}`)
    } else {
      warnings.push(`${missingAges.length} Altersgruppen fehlen (${missingAges[0]}-${missingAges[missingAges.length - 1]})`)
    }
  }

  return { rates, errors, warnings }
}

export async function parseFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result

        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = data as string
          const lines = text.split(/\r?\n/)
          const rows = lines.map(line => {
            // Handle CSV with different delimiters
            const delimiter = line.includes(';') ? ';' : ','
            return line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
          })
          resolve(parseExcelOrCsvData(rows))
        } else {
          // Parse Excel
          const workbook = new ExcelJS.Workbook()
          await workbook.xlsx.load(data as ArrayBuffer)
          const worksheet = workbook.worksheets[0]
          const rows: unknown[][] = []
          worksheet.eachRow((row) => {
            rows.push((row.values as unknown[]).slice(1)) // ExcelJS is 1-indexed
          })
          resolve(parseExcelOrCsvData(rows))
        }
      } catch (error) {
        resolve({
          rates: [],
          errors: [`Fehler beim Lesen der Datei: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`],
          warnings: [],
        })
      }
    }

    reader.onerror = () => {
      resolve({
        rates: [],
        errors: ['Fehler beim Lesen der Datei'],
        warnings: [],
      })
    }

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

// ===========================================
// Template Generation
// ===========================================

export async function generateTemplate(sameForAllGenders: boolean = true): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Sparbeitragssätze')

  // Set column widths and headers
  if (sameForAllGenders) {
    worksheet.columns = [
      { header: 'Alter', width: 10 },
      { header: 'AN-Satz %', width: 15 },
      { header: 'AG-Satz %', width: 15 },
    ]
  } else {
    worksheet.columns = [
      { header: 'Alter', width: 10 },
      { header: 'Geschlecht', width: 15 },
      { header: 'AN-Satz %', width: 15 },
      { header: 'AG-Satz %', width: 15 },
    ]
  }

  // Data rows with BVG minimum as example
  const bvgRates = [
    { fromAge: 18, toAge: 24, rate: 0 },
    { fromAge: 25, toAge: 34, rate: 3.5 },
    { fromAge: 35, toAge: 44, rate: 5 },
    { fromAge: 45, toAge: 54, rate: 7.5 },
    { fromAge: 55, toAge: 70, rate: 9 },
  ]

  for (let age = 18; age <= 70; age++) {
    const bvgRate = bvgRates.find(r => age >= r.fromAge && age <= r.toAge)
    const rate = bvgRate?.rate ?? 0

    if (sameForAllGenders) {
      worksheet.addRow([age, rate, rate])
    } else {
      worksheet.addRow([age, 'M', rate, rate])
      worksheet.addRow([age, 'W', rate, rate])
    }
  }

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Sparbeitragssaetze_Vorlage.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ===========================================
// Component
// ===========================================

interface ContributionRatesImportDialogProps {
  sameForAllGenders: boolean
  onImport: (rates: ContributionRateWithTotal[]) => void
}

export function ContributionRatesImportDialog({
  sameForAllGenders,
  onImport,
}: ContributionRatesImportDialogProps) {
  const t = useTranslations('settings.contributionRates.import')
  const tActions = useTranslations('actions')

  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [overwriteExisting, setOverwriteExisting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedFormats = '.xlsx,.xls,.csv'
  const acceptedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
  ]

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      await processFile(droppedFile)
    }
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      await processFile(selectedFile)
    }
  }, [])

  const processFile = async (selectedFile: File) => {
    // Validate file type
    const isValidType = acceptedMimeTypes.includes(selectedFile.type) ||
      selectedFile.name.match(/\.(xlsx|xls|csv)$/i)

    if (!isValidType) {
      setImportResult({
        rates: [],
        errors: [t('invalidFormat')],
        warnings: [],
      })
      return
    }

    setFile(selectedFile)
    setIsLoading(true)

    const result = await parseFile(selectedFile)
    setImportResult(result)
    setIsLoading(false)
  }

  const handleDownloadTemplate = useCallback(async () => {
    await generateTemplate(sameForAllGenders)
  }, [sameForAllGenders])

  const handleImport = useCallback(() => {
    if (!importResult || importResult.errors.length > 0) return

    // Convert parsed rates to ContributionRateWithTotal
    const convertedRates: ContributionRateWithTotal[] = importResult.rates
      .filter(r => r.status !== 'error')
      .map((rate, index) => ({
        id: `import-${index}`,
        version_id: '',
        age: rate.age,
        gender: sameForAllGenders ? null : rate.gender,
        employee_rate: rate.employee_rate,
        employer_rate: rate.employer_rate,
        total_rate: rate.total_rate,
      }))

    onImport(convertedRates)
    handleClose()
  }, [importResult, sameForAllGenders, onImport])

  const handleClose = useCallback(() => {
    setOpen(false)
    setFile(null)
    setImportResult(null)
    setOverwriteExisting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const validCount = importResult?.rates.filter(r => r.status === 'valid').length ?? 0
  const warningCount = importResult?.rates.filter(r => r.status === 'warning').length ?? 0
  const errorCount = importResult?.rates.filter(r => r.status === 'error').length ?? 0

  const canImport = importResult &&
    importResult.errors.length === 0 &&
    importResult.rates.length > 0 &&
    errorCount === 0

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) handleClose()
      else setOpen(true)
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          {t('button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragging && "border-primary bg-primary/5",
              !isDragging && "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats}
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">{t('dropzone')}</p>
            <p className="text-xs text-muted-foreground">{t('formats')}</p>
            {file && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Badge variant="secondary">{file.name}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setImportResult(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Template Download */}
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('downloadTemplate')}
          </Button>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Results */}
          {importResult && !isLoading && (
            <>
              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                    <XCircle className="h-4 w-4" />
                    {t('errors')}
                  </div>
                  <ul className="text-sm text-destructive space-y-1">
                    {importResult.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {importResult.rates.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-medium">{t('preview')}</h4>
                  <ScrollArea className="h-[250px] rounded-md border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead className="w-16">{t('columns.age')}</TableHead>
                          {!sameForAllGenders && (
                            <TableHead className="w-20">{t('columns.gender')}</TableHead>
                          )}
                          <TableHead className="text-right">{t('columns.employeeRate')}</TableHead>
                          <TableHead className="text-right">{t('columns.employerRate')}</TableHead>
                          <TableHead className="text-right">{t('columns.total')}</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.rates.map((rate, i) => (
                          <TableRow
                            key={i}
                            className={cn(
                              rate.status === 'error' && 'bg-destructive/10',
                              rate.status === 'warning' && 'bg-amber-500/10'
                            )}
                          >
                            <TableCell>{rate.age}</TableCell>
                            {!sameForAllGenders && (
                              <TableCell>
                                {rate.gender === 'M' ? 'M' : rate.gender === 'W' ? 'W' : '-'}
                              </TableCell>
                            )}
                            <TableCell className="text-right font-mono">
                              {rate.employee_rate.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {rate.employer_rate.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {rate.total_rate.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {rate.status === 'valid' && (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                              {rate.status === 'warning' && (
                                <span title={rate.message}>
                                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                                </span>
                              )}
                              {rate.status === 'error' && (
                                <span title={rate.message}>
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {/* Summary */}
                  <div className="flex items-center gap-4 text-sm">
                    {warningCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        {t('warningCount', { count: warningCount })}
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-4 w-4" />
                        {t('errorCount', { count: errorCount })}
                      </span>
                    )}
                    {validCount > 0 && errorCount === 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        {t('validCount', { count: validCount })}
                      </span>
                    )}
                  </div>

                  {/* Warnings */}
                  {importResult.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                      <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        {t('warnings')}
                      </div>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {importResult.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Overwrite Checkbox */}
              {canImport && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overwrite"
                    checked={overwriteExisting}
                    onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                  />
                  <Label htmlFor="overwrite" className="text-sm">
                    {t('overwriteExisting')}
                  </Label>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {tActions('cancel')}
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            <Upload className="h-4 w-4 mr-2" />
            {t('importButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
