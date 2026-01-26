'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useState, useTransition, useCallback, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Search, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, GripVertical, RotateCcw, ChevronRight as ChevronRightIcon, Layers } from 'lucide-react'
import { ExcelExportButton } from '@/components/insured/excel-export-button'
import { InsuredPerson, Employer, InsuredPersonStatus } from '@/lib/database.types'
import { useDebouncedCallback } from 'use-debounce'
import { Link } from '@/i18n/routing'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type InsuredPersonWithEmployer = InsuredPerson & {
  employer: Employer | null;
};

interface InsuredPersonsTableProps {
  insuredPersons: InsuredPersonWithEmployer[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  searchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

type ColumnId = 'last_name' | 'first_name' | 'date_of_birth' | 'ahv_number' | 'employer' | 'status' | 'entry_date';
type GroupByOption = 'none' | 'status' | 'employer' | 'entry_year';

interface Column {
  id: ColumnId;
  labelKey: string;
  sortable: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'last_name', labelKey: 'columns.lastName', sortable: true },
  { id: 'first_name', labelKey: 'columns.firstName', sortable: true },
  { id: 'date_of_birth', labelKey: 'columns.dateOfBirth', sortable: true },
  { id: 'ahv_number', labelKey: 'columns.ahvNumber', sortable: false },
  { id: 'employer', labelKey: 'columns.employer', sortable: false },
  { id: 'status', labelKey: 'columns.status', sortable: true },
  { id: 'entry_date', labelKey: 'columns.entryDate', sortable: true },
];

const STORAGE_KEY = 'insured_persons_table_preferences';

interface TablePreferences {
  columnOrder: ColumnId[];
  groupBy: GroupByOption;
}

const statusColors: Record<InsuredPersonStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  exited: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  retired: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  deceased: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

// Sortable Header Cell Component
interface SortableHeaderCellProps {
  column: Column;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  t: ReturnType<typeof useTranslations>;
}

function SortableHeaderCell({ column, sortBy, sortDirection, onSort, t }: SortableHeaderCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  const SortIcon = () => {
    if (sortBy !== column.id) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1 inline" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 inline" />
    )
  }

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      scope="col"
      className={`${column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''} ${isDragging ? 'bg-muted' : ''}`}
      aria-sort={sortBy === column.id ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <div className="flex items-center gap-1">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-foreground text-muted-foreground"
          aria-label={`${t(column.labelKey)} - Drag to reorder`}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </span>
        <span
          className={column.sortable ? 'cursor-pointer flex-1' : 'flex-1'}
          onClick={() => column.sortable && onSort(column.id)}
          role={column.sortable ? 'button' : undefined}
          tabIndex={column.sortable ? 0 : undefined}
          onKeyDown={(e) => {
            if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              onSort(column.id)
            }
          }}
        >
          {t(column.labelKey)}
          {column.sortable && <SortIcon />}
        </span>
      </div>
    </TableHead>
  );
}

export function InsuredPersonsTable({
  insuredPersons,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  searchTerm,
  sortBy,
  sortDirection,
}: InsuredPersonsTableProps) {
  const t = useTranslations('insured')
  const tA11y = useTranslations('accessibility')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [localSearch, setLocalSearch] = useState(searchTerm)

  // Column order and grouping state
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMNS.map(c => c.id))
  const [groupBy, setGroupBy] = useState<GroupByOption>('none')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const prefs: TablePreferences = JSON.parse(stored)
        if (prefs.columnOrder && Array.isArray(prefs.columnOrder)) {
          // Validate that all columns exist
          const validColumns = prefs.columnOrder.filter(id =>
            DEFAULT_COLUMNS.some(c => c.id === id)
          )
          // Add any missing columns at the end
          const missingColumns = DEFAULT_COLUMNS
            .map(c => c.id)
            .filter(id => !validColumns.includes(id))
          setColumnOrder([...validColumns, ...missingColumns])
        }
        if (prefs.groupBy) {
          setGroupBy(prefs.groupBy)
        }
      }
    } catch (error) {
      console.error('Error loading table preferences:', error)
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback((newColumnOrder: ColumnId[], newGroupBy: GroupByOption) => {
    try {
      const prefs: TablePreferences = {
        columnOrder: newColumnOrder,
        groupBy: newGroupBy,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch (error) {
      console.error('Error saving table preferences:', error)
    }
  }, [])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as ColumnId)
        const newIndex = items.indexOf(over.id as ColumnId)
        const newOrder = arrayMove(items, oldIndex, newIndex)
        savePreferences(newOrder, groupBy)
        return newOrder
      })
    }
  }

  // Reset column order
  const handleResetColumns = () => {
    const defaultOrder = DEFAULT_COLUMNS.map(c => c.id)
    setColumnOrder(defaultOrder)
    savePreferences(defaultOrder, groupBy)
  }

  // Handle grouping change
  const handleGroupByChange = (value: GroupByOption) => {
    setGroupBy(value)
    setCollapsedGroups(new Set())
    savePreferences(columnOrder, value)
  }

  // Toggle group collapse
  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  // Expand/collapse all groups
  const expandAllGroups = () => setCollapsedGroups(new Set())
  const collapseAllGroups = () => {
    const allGroupKeys = Object.keys(groupedData)
    setCollapsedGroups(new Set(allGroupKeys))
  }

  // Get ordered columns
  const orderedColumns = useMemo(() => {
    return columnOrder.map(id => DEFAULT_COLUMNS.find(c => c.id === id)!).filter(Boolean)
  }, [columnOrder])

  // Group data
  const groupedData = useMemo(() => {
    if (groupBy === 'none') {
      return { all: insuredPersons }
    }

    const groups: Record<string, InsuredPersonWithEmployer[]> = {}

    insuredPersons.forEach(person => {
      let key: string

      switch (groupBy) {
        case 'status':
          key = person.status || 'unknown'
          break
        case 'employer':
          key = person.employer?.name || t('grouping.noEmployer')
          break
        case 'entry_year':
          key = new Date(person.entry_date).getFullYear().toString()
          break
        default:
          key = 'all'
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(person)
    })

    // Sort groups
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (groupBy === 'entry_year') {
        return parseInt(b) - parseInt(a) // Newest first
      }
      return a.localeCompare(b)
    })

    const sortedGroups: Record<string, InsuredPersonWithEmployer[]> = {}
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key]
    })

    return sortedGroups
  }, [insuredPersons, groupBy, t])

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString())

      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          current.delete(key)
        } else {
          current.set(key, value)
        }
      })

      return current.toString()
    },
    [searchParams]
  )

  const updateUrl = useCallback(
    (params: Record<string, string | null>) => {
      const queryString = createQueryString(params)
      startTransition(() => {
        router.push(`${pathname}?${queryString}`)
      })
    },
    [createQueryString, pathname, router]
  )

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateUrl({ search: value || null, page: '1' })
  }, 300)

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    debouncedSearch(value)
  }

  const handleClearSearch = () => {
    setLocalSearch('')
    updateUrl({ search: null, page: '1' })
  }

  const handleSort = (column: string) => {
    const newDirection = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc'
    updateUrl({ sortBy: column, sortDirection: newDirection })
  }

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage.toString() })
  }

  const handlePageSizeChange = (newPageSize: string) => {
    updateUrl({ pageSize: newPageSize, page: '1' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-CH')
  }

  const formatAhvNumber = (ahv: string) => {
    // Format: 756.1234.5678.97
    if (ahv.length === 13 && !ahv.includes('.')) {
      return `${ahv.slice(0, 3)}.${ahv.slice(3, 7)}.${ahv.slice(7, 11)}.${ahv.slice(11)}`
    }
    return ahv
  }

  const renderCellContent = (person: InsuredPersonWithEmployer, columnId: ColumnId) => {
    switch (columnId) {
      case 'last_name':
        return (
          <Link href={`/insured/${person.id}`} className="hover:underline font-medium">
            {person.last_name}
          </Link>
        )
      case 'first_name':
        return person.first_name
      case 'date_of_birth':
        return formatDate(person.date_of_birth)
      case 'ahv_number':
        return <span className="font-mono text-sm">{formatAhvNumber(person.ahv_number)}</span>
      case 'employer':
        return person.employer?.name || '-'
      case 'status':
        return person.status ? (
          <Badge className={statusColors[person.status]} variant="secondary">
            {t(`status.${person.status}`)}
          </Badge>
        ) : null
      case 'entry_date':
        return formatDate(person.entry_date)
      default:
        return null
    }
  }

  const getGroupLabel = (groupKey: string): string => {
    if (groupBy === 'status' && groupKey !== 'unknown') {
      return t(`status.${groupKey}`)
    }
    if (groupBy === 'entry_year') {
      return t('grouping.entryYear', { year: groupKey })
    }
    return groupKey
  }

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="space-y-4">
      {/* Search, Grouping, and Count */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {localSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={handleClearSearch}
                aria-label={tA11y('clearSearch')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('found', { count: totalCount })}
          </p>
        </div>

        {/* Grouping and Column Controls */}
        <div className="flex flex-wrap gap-4 items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('grouping.label')}</span>
              <Select value={groupBy} onValueChange={(v) => handleGroupByChange(v as GroupByOption)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('grouping.none')}</SelectItem>
                  <SelectItem value="status">{t('grouping.byStatus')}</SelectItem>
                  <SelectItem value="employer">{t('grouping.byEmployer')}</SelectItem>
                  <SelectItem value="entry_year">{t('grouping.byEntryYear')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {groupBy !== 'none' && Object.keys(groupedData).length > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={expandAllGroups}>
                  {t('grouping.expandAll')}
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAllGroups}>
                  {t('grouping.collapseAll')}
                </Button>
              </div>
            )}
          </div>

          <ExcelExportButton data={insuredPersons} disabled={insuredPersons.length === 0} />
          <Button variant="ghost" size="sm" onClick={handleResetColumns}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('columns.reset')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        {insuredPersons.length === 0 ? (
          <div className="p-8 text-center">
            {searchTerm ? (
              <>
                <p className="text-muted-foreground">{t('noResultsForSearch', { search: searchTerm })}</p>
              </>
            ) : (
              <>
                <p className="font-medium">{t('emptyState')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('emptyStateHint')}</p>
              </>
            )}
          </div>
        ) : groupBy === 'none' ? (
          // Regular table without grouping
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableCaption className="sr-only">{tA11y('tableCaption')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <SortableContext
                    items={columnOrder}
                    strategy={horizontalListSortingStrategy}
                  >
                    {orderedColumns.map((column) => (
                      <SortableHeaderCell
                        key={column.id}
                        column={column}
                        sortBy={sortBy}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        t={t}
                      />
                    ))}
                  </SortableContext>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insuredPersons.map((person) => (
                  <TableRow
                    key={person.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {orderedColumns.map((column) => (
                      <TableCell key={column.id}>
                        {renderCellContent(person, column.id)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DndContext>
        ) : (
          // Grouped table view
          <div className="divide-y">
            {Object.entries(groupedData).map(([groupKey, persons]) => (
              <Collapsible
                key={groupKey}
                open={!collapsedGroups.has(groupKey)}
                onOpenChange={() => toggleGroupCollapse(groupKey)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer">
                    <ChevronRightIcon
                      className={`h-4 w-4 transition-transform ${
                        !collapsedGroups.has(groupKey) ? 'rotate-90' : ''
                      }`}
                    />
                    <span className="font-medium">{getGroupLabel(groupKey)}</span>
                    <Badge variant="secondary" className="ml-2">
                      {persons.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <Table>
                      <TableCaption className="sr-only">{tA11y('tableCaption')} - {getGroupLabel(groupKey)}</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <SortableContext
                            items={columnOrder}
                            strategy={horizontalListSortingStrategy}
                          >
                            {orderedColumns.map((column) => (
                              <SortableHeaderCell
                                key={column.id}
                                column={column}
                                sortBy={sortBy}
                                sortDirection={sortDirection}
                                onSort={handleSort}
                                t={t}
                              />
                            ))}
                          </SortableContext>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {persons.map((person) => (
                          <TableRow
                            key={person.id}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            {orderedColumns.map((column) => (
                              <TableCell key={column.id}>
                                {renderCellContent(person, column.id)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DndContext>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('pagination.perPage')}</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('pagination.showing', { from, to, total: totalCount })}
            </span>
          </div>

          <nav aria-label={tA11y('pageOf', { current: currentPage, total: totalPages })}>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || isPending}
                aria-label={tA11y('firstPage')}
              >
                <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isPending}
                aria-label={tA11y('previousPage')}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="text-sm px-2" aria-current="page">
                {t('pagination.page', { page: currentPage, totalPages })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isPending}
                aria-label={tA11y('nextPage')}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || isPending}
                aria-label={tA11y('lastPage')}
              >
                <ChevronsRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
