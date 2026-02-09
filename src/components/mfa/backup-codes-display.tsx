'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Download, Check } from 'lucide-react'

interface BackupCodesDisplayProps {
  codes: string[]
  usedCodes?: string[]
}

export function BackupCodesDisplay({ codes, usedCodes = [] }: BackupCodesDisplayProps) {
  const t = useTranslations('auth.mfa.backup')
  const [copied, setCopied] = useState(false)

  const handleCopyAll = async () => {
    const text = codes.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = [
      'peka.next - Backup Codes',
      '========================',
      '',
      'These codes can only be used once each.',
      'Store them in a safe place.',
      '',
      ...codes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'peka-next-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const availableCount = codes.filter(code => !usedCodes.includes(code)).length

  return (
    <div className="space-y-4">
      {/* Codes remaining info */}
      <p className="text-sm text-muted-foreground">
        {t('codesRemaining', { count: availableCount, total: codes.length })}
      </p>

      {/* Codes grid */}
      <div className="grid grid-cols-2 gap-2">
        {codes.map((code, index) => {
          const isUsed = usedCodes.includes(code)
          return (
            <div
              key={index}
              className={`flex items-center justify-between p-2 rounded-md border font-mono text-sm ${
                isUsed
                  ? 'bg-muted/50 text-muted-foreground line-through'
                  : 'bg-background'
              }`}
            >
              <span>{code}</span>
              {isUsed && (
                <Badge variant="secondary" className="text-xs ml-2">
                  {t('used')}
                </Badge>
              )}
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleCopyAll}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              {t('copied')}
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              {t('copyAll')}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          {t('download')}
        </Button>
      </div>
    </div>
  )
}
