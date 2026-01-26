'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { InsuredPerson, Employment, Employer } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, User, Briefcase, FileText, History, Phone, Mail, MapPin, AlertCircle, Plus, Pencil, Settings } from 'lucide-react'
import { EmploymentDialog } from './employment-dialog'
import { EditInsuredPersonDialog } from './edit-insured-person-dialog'

type EmploymentWithEmployer = Employment & {
  employer: Employer | null;
};

interface InsuredPersonDetailProps {
  insuredPerson: InsuredPerson;
  employments: EmploymentWithEmployer[];
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  exited: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  retired: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  deceased: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

export function InsuredPersonDetail({ insuredPerson, employments }: InsuredPersonDetailProps) {
  const t = useTranslations('insured')
  const tActions = useTranslations('actions')
  const [employmentDialogOpen, setEmploymentDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedEmployment, setSelectedEmployment] = useState<EmploymentWithEmployer | undefined>()
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')

  const handleAddEmployment = () => {
    setSelectedEmployment(undefined)
    setDialogMode('add')
    setEmploymentDialogOpen(true)
  }

  const handleEditEmployment = (employment: EmploymentWithEmployer) => {
    setSelectedEmployment(employment)
    setDialogMode('edit')
    setEmploymentDialogOpen(true)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('de-CH')
  }

  const formatAhvNumber = (ahv: string) => {
    if (ahv.length === 13 && !ahv.includes('.')) {
      return `${ahv.slice(0, 3)}.${ahv.slice(3, 7)}.${ahv.slice(7, 11)}.${ahv.slice(11)}`
    }
    return ahv
  }

  const totalEmploymentRate = employments
    .filter(e => !e.exit_date)
    .reduce((sum, e) => sum + e.employment_rate, 0)

  return (
    <div className="space-y-6">
      {/* Back Link and Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/insured">
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('detail.backToList')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Person Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {insuredPerson.last_name}, {insuredPerson.first_name}
          </h1>
          <p className="text-muted-foreground mt-1 font-mono">
            {formatAhvNumber(insuredPerson.ahv_number)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {insuredPerson.status && (
            <Badge className={statusColors[insuredPerson.status]} variant="secondary">
              {t(`status.${insuredPerson.status}`)}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            {tActions('edit')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="masterData" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="masterData" className="flex items-center gap-2">
            <User className="h-4 w-4 hidden sm:inline" />
            {t('detail.tabs.masterData')}
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 hidden sm:inline" />
            {t('detail.tabs.insurance')}
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4 hidden sm:inline" />
            {t('detail.tabs.documents')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4 hidden sm:inline" />
            {t('detail.tabs.history')}
          </TabsTrigger>
        </TabsList>

        {/* Master Data Tab */}
        <TabsContent value="masterData" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('detail.sections.personalData')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DataRow label={t('detail.fields.lastName')} value={insuredPerson.last_name} />
                <DataRow label={t('detail.fields.firstName')} value={insuredPerson.first_name} />
                <DataRow label={t('detail.fields.dateOfBirth')} value={formatDate(insuredPerson.date_of_birth)} />
                <DataRow
                  label={t('detail.fields.gender')}
                  value={insuredPerson.gender ? t(`detail.gender.${insuredPerson.gender}`) : '-'}
                />
                <DataRow label={t('detail.fields.nationality')} value={insuredPerson.nationality || '-'} />
                <DataRow
                  label={t('detail.fields.maritalStatus')}
                  value={insuredPerson.marital_status ? t(`detail.maritalStatus.${insuredPerson.marital_status}`) : '-'}
                />
                <DataRow label={t('detail.fields.ahvNumber')} value={formatAhvNumber(insuredPerson.ahv_number)} mono />
              </CardContent>
            </Card>

            {/* Contact Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  {t('detail.sections.contactData')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DataRow
                  label={t('detail.fields.email')}
                  value={insuredPerson.email || '-'}
                  icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                />
                <DataRow
                  label={t('detail.fields.phone')}
                  value={insuredPerson.phone || '-'}
                  icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                />
                <DataRow
                  label={t('detail.fields.mobile')}
                  value={insuredPerson.mobile || '-'}
                />
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('detail.sections.address')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DataRow label={t('detail.fields.street')} value={insuredPerson.street || '-'} />
                <DataRow label={t('detail.fields.postalCode')} value={insuredPerson.postal_code || '-'} />
                <DataRow label={t('detail.fields.city')} value={insuredPerson.city || '-'} />
                <DataRow label={t('detail.fields.country')} value={insuredPerson.country || '-'} />
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {t('detail.sections.emergencyContact')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DataRow label={t('detail.fields.emergencyName')} value={insuredPerson.emergency_contact_name || '-'} />
                <DataRow label={t('detail.fields.emergencyPhone')} value={insuredPerson.emergency_contact_phone || '-'} />
              </CardContent>
            </Card>
          </div>

          {/* Employments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {t('detail.employments.title')}
              </CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {t('detail.employments.totalRate')}: <span className="font-semibold">{totalEmploymentRate}%</span>
                </span>
                <Button size="sm" onClick={handleAddEmployment}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('detail.employments.addEmployment')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {employments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {t('detail.employments.noEmployments')}
                </p>
              ) : (
                <div className="space-y-4">
                  {employments.map((employment) => (
                    <div
                      key={employment.id}
                      className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{employment.employer?.name || '-'}</span>
                          <Badge variant={employment.exit_date ? 'secondary' : 'default'}>
                            {employment.exit_date
                              ? t('detail.employments.ended')
                              : t('detail.employments.active')
                            }
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">{t('detail.employments.entryDate')}: </span>
                            {formatDate(employment.entry_date)}
                          </div>
                          {employment.exit_date && (
                            <div>
                              <span className="text-muted-foreground">{t('detail.employments.exitDate')}: </span>
                              {formatDate(employment.exit_date)}
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">{t('detail.employments.employmentRate')}: </span>
                            {employment.employment_rate}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditEmployment(employment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {insuredPerson.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t('detail.sections.notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{insuredPerson.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('detail.comingSoon')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('detail.comingSoon')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('detail.comingSoon')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employment Dialog */}
      <EmploymentDialog
        open={employmentDialogOpen}
        onOpenChange={setEmploymentDialogOpen}
        insuredPersonId={insuredPerson.id}
        employment={selectedEmployment}
        mode={dialogMode}
      />

      {/* Edit Person Dialog */}
      <EditInsuredPersonDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        insuredPerson={insuredPerson}
      />
    </div>
  )
}

interface DataRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}

function DataRow({ label, value, icon, mono }: DataRowProps) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground text-sm flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={`text-sm text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
