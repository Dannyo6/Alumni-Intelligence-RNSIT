import { useState, useEffect, useMemo, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { flexRender } from '@tanstack/react-table';
import {
  useLegacyTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel
} from '@tanstack/react-table/legacy';
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy';
import {
  Search, Download, ChevronDown, ChevronUp, Plus,
  ShieldAlert, Filter, RotateCcw, SlidersHorizontal, Award, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import EditAlumniModal from '../components/EditAlumniModal';
import AlumniProfileModal from '../components/AlumniProfileModal';
import {
  fetchAlumniDiscovery,
  fetchDirectoryFilterOptions,
  searchDirectoryFilterOptions,
  fetchFilteredAlumniForExport,
  validateSortField,
  type AlumnusRow
} from '../services/directoryService';
import {
  parseUrlToDirectoryState,
  serializeDirectoryStateToUrl,
  type DirectoryFilterState,
  DEFAULT_DIRECTORY_STATE
} from '../utils/urlState';
import {
  Alert, Badge, Button, Card, Checkbox, EmptyState, FieldLabel, FilterChip, Input, PageHeader,
  Pagination, SearchInput, Select, Skeleton, Table, TableWrap, TBody, TD, TH, THead, TR, cn,
} from '../components/ui';

const Directory = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [, startTransition] = useTransition();

  // Internal state initialized from URL
  const [filterState, setFilterState] = useState<DirectoryFilterState>(() =>
    parseUrlToDirectoryState(searchParams)
  );

  // Local inputs
  const [searchInput, setSearchInput] = useState(filterState.searchQuery);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showColumnToggles, setShowColumnToggles] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Modals state
  const [editingRecord, setEditingRecord] = useState<AlumnusRow | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AlumnusRow | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Searchable combobox option state
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [designationSuggestions, setDesignationSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);

  // Optional column visibility
  const [columnVisibility, setColumnVisibility] = useState({
    company_sector: false,
    email: false,
    mobile: false,
    value_score: false,
    flags: false,
  });

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filterState.searchQuery) {
        setFilterState(prev => ({
          ...prev,
          searchQuery: searchInput,
          page: 1, // reset to page 1 on search change
        }));
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, filterState.searchQuery]);

  // Synchronize state changes to URL query parameters
  useEffect(() => {
    const params = serializeDirectoryStateToUrl(filterState);
    startTransition(() => {
      setSearchParams(params, { replace: true });
    });
  }, [filterState, setSearchParams]);

  // Fetch directory filter options (cached by React Query)
  const { data: filterOptions } = useQuery({
    queryKey: ['directoryFilterOptions'],
    queryFn: fetchDirectoryFilterOptions,
    staleTime: 1000 * 60 * 15, // 15 mins
  });

  // Fetch alumni discovery records
  const {
    data: discoveryData,
    isLoading,
    isFetching,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['alumniDiscovery', filterState],
    queryFn: () => fetchAlumniDiscovery(filterState),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30, // 30 seconds
  });

  const records = discoveryData?.records || [];
  const totalCount = discoveryData?.totalCount || 0;
  const parsedQuery = discoveryData?.parsedQuery;
  const totalPages = Math.max(1, Math.ceil(totalCount / filterState.pageSize));

  // Searchable filter suggestions (bounded RPC)
  useEffect(() => {
    if (filterState.company && filterState.company.length >= 2) {
      searchDirectoryFilterOptions('company', filterState.company, 8)
        .then(setCompanySuggestions)
        .catch(() => setCompanySuggestions([]));
    } else {
      setCompanySuggestions([]);
    }
  }, [filterState.company]);

  useEffect(() => {
    if (filterState.designation && filterState.designation.length >= 2) {
      searchDirectoryFilterOptions('designation', filterState.designation, 8)
        .then(setDesignationSuggestions)
        .catch(() => setDesignationSuggestions([]));
    } else {
      setDesignationSuggestions([]);
    }
  }, [filterState.designation]);

  useEffect(() => {
    if (filterState.city && filterState.city.length >= 2) {
      searchDirectoryFilterOptions('city', filterState.city, 8)
        .then(setCitySuggestions)
        .catch(() => setCitySuggestions([]));
    } else {
      setCitySuggestions([]);
    }
  }, [filterState.city]);

  // Handler for filter updates
  const updateFilter = (updates: Partial<DirectoryFilterState>) => {
    setFilterState(prev => ({
      ...prev,
      ...updates,
      page: updates.page !== undefined ? updates.page : 1,
    }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setFilterState({
      ...DEFAULT_DIRECTORY_STATE,
      pageSize: filterState.pageSize,
    });
  };

  const handleSortToggle = (field: string) => {
    const validated = validateSortField(field);
    if (filterState.sortBy === validated) {
      updateFilter({
        sortOrder: filterState.sortOrder === 'asc' ? 'desc' : 'asc',
        page: 1,
      });
    } else {
      updateFilter({
        sortBy: validated,
        sortOrder: 'desc',
        page: 1,
      });
    }
  };

  const handleExportFiltered = async (allFiltered = true) => {
    setIsExporting(true);
    setExportNotice(null);
    setShowExportMenu(false);

    try {
      let exportRows: AlumnusRow[] = [];
      if (allFiltered) {
        const exportResult = await fetchFilteredAlumniForExport(filterState, 5000);
        exportRows = exportResult.records;
        if (exportResult.isCapped) {
          setExportNotice(`Export was capped at 5,000 records (out of ${exportResult.totalAvailable.toLocaleString()} matching). Refine filters if you need a narrower export.`);
        }
      } else {
        exportRows = records;
      }

      if (exportRows.length === 0) {
        setExportNotice('No alumni records available to export for current criteria.');
        return;
      }

      // Safe user-facing columns whitelist (Strictly no search_vector, *_normalized, or internal IDs)
      const worksheet = XLSX.utils.json_to_sheet(exportRows.map(r => ({
        Name: r.name,
        Email: r.email || '',
        Mobile: r.mobile || '',
        Company: r.current_company || '',
        Designation: r.current_designation || '',
        Sector: r.company_sector || '',
        City: r.city || '',
        Country: r.country || '',
        Branch: r.academic_branch || r.branch_or_designation_raw || '',
        JoiningYear: r.joining_year || '',
        LeavingYear: r.leaving_year || '',
        Category: r.primary_category || '',
        ValueScore: r.value_score ?? '',
        HighValue: r.is_high_value ? 'Yes' : 'No',
        Global: r.is_global ? 'Yes' : 'No',
        TopEmployer: r.is_top_employer ? 'Yes' : 'No',
        StudentOrRNSIT: r.is_student_or_rnsit ? 'Yes' : 'No',
        NeedsVerification: r.needs_verification ? 'Yes' : 'No',
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumni');
      const filename = allFiltered
        ? `RNSIT_Alumni_Filtered_${Date.now()}.xlsx`
        : `RNSIT_Alumni_Page_${filterState.page}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error('Export failed:', err);
      setExportNotice('Failed to generate export file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const invalidateAndRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['alumniDiscovery'] });
    queryClient.invalidateQueries({ queryKey: ['directoryFilterOptions'] });
    refetch();
  };

  // 8 Default Visible Columns: Name, Company, Designation, Location, Academic Branch, Joining Year, Leaving Year, Primary Category
  const columns = useMemo<ColumnDef<AlumnusRow>[]>(() => {
    const cols: ColumnDef<AlumnusRow>[] = [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => (
          <div className="min-w-0">
            <div className="font-semibold text-ink transition-colors group-hover:text-accent-ink">
              {info.getValue() as string}
            </div>
            {info.row.original.needs_verification && (
              <Badge tone="danger" className="mt-1">
                <ShieldAlert size={10} /> Verify
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'current_company',
        header: 'Company',
        cell: (info) => (
          <span className="font-medium text-ink-secondary">
            {(info.getValue() as string) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'current_designation',
        header: 'Designation',
        cell: (info) => (
          <span className="text-ink-muted">
            {(info.getValue() as string) || '—'}
          </span>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        accessorFn: (row) => [row.city, row.country].filter(Boolean).join(', ') || '—',
        cell: (info) => (
          <span className="text-ink-secondary">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'academic_branch',
        header: 'Academic Branch',
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="font-medium text-ink-secondary">
              {row.academic_branch || row.branch_or_designation_raw || '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'joining_year',
        header: 'Joining Year',
        cell: (info) => (
          <span className="tnum text-ink-muted">
            {(info.getValue() as number) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'leaving_year',
        header: 'Leaving Year',
        cell: (info) => (
          <span className="tnum text-ink-muted">
            {(info.getValue() as number) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'primary_category',
        header: 'Primary Category',
        cell: (info) => {
          const cat = info.getValue() as string;
          return cat ? (
            <Badge tone="accent">{cat}</Badge>
          ) : (
            <span className="text-xs text-ink-faint">—</span>
          );
        },
      },
    ];

    // Optional Toggleable Columns
    if (columnVisibility.company_sector) {
      cols.push({
        accessorKey: 'company_sector',
        header: 'Sector',
        cell: (info) => (
          <Badge tone="neutral">{(info.getValue() as string) || '—'}</Badge>
        ),
      });
    }

    if (columnVisibility.email) {
      cols.push({
        accessorKey: 'email',
        header: 'Email',
        cell: (info) => (
          <span className="font-mono text-xs text-ink-muted">
            {(info.getValue() as string) || '—'}
          </span>
        ),
      });
    }

    if (columnVisibility.mobile) {
      cols.push({
        accessorKey: 'mobile',
        header: 'Mobile',
        cell: (info) => (
          <span className="font-mono text-xs text-ink-muted">
            {(info.getValue() as string) || '—'}
          </span>
        ),
      });
    }

    if (columnVisibility.value_score) {
      cols.push({
        accessorKey: 'value_score',
        header: 'Score',
        cell: (info) => {
          const val = info.getValue() as number;
          return val ? (
            <Badge tone="warn">
              <Award size={11} /> {val}
            </Badge>
          ) : (
            <span className="text-xs text-ink-faint">—</span>
          );
        }
      });
    }

    if (columnVisibility.flags) {
      cols.push({
        id: 'flags',
        header: 'Classifications',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex max-w-[200px] flex-wrap gap-1">
              {row.is_high_value && <Badge tone="warn">High Value</Badge>}
              {row.is_global && <Badge tone="success">Global</Badge>}
              {row.is_top_employer && <Badge tone="accent">Top Employer</Badge>}
              {row.is_student_or_rnsit && <Badge tone="info">Student</Badge>}
            </div>
          );
        }
      });
    }

    // Row Action column
    cols.push({
      id: 'actions',
      header: '',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            <Button size="sm" onClick={() => setViewingRecord(row)}>
              View
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setEditingRecord(row)}
                className="bg-accent-soft text-accent-ink"
              >
                Edit
              </Button>
            )}
          </div>
        );
      }
    });

    return cols;
  }, [columnVisibility, isAdmin]);

  const table = useLegacyTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.company) count++;
    if (filterState.designation) count++;
    if (filterState.sector) count++;
    if (filterState.branch) count++;
    if (filterState.country) count++;
    if (filterState.city) count++;
    if (filterState.joiningYear) count++;
    if (filterState.leavingYear) count++;
    if (filterState.primaryCategory) count++;
    if (filterState.isHighValue) count++;
    if (filterState.isGlobal) count++;
    if (filterState.isTopEmployer) count++;
    if (filterState.isStudentOrRnsit) count++;
    if (filterState.needsVerification) count++;
    if (filterState.hasEmail) count++;
    if (filterState.hasMobile) count++;
    return count;
  }, [filterState]);

  /** Every active filter as a removable token — active state must be visible. */
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; value: string; clear: Partial<DirectoryFilterState> }[] = [];
    const text: [keyof DirectoryFilterState, string][] = [
      ['company', 'Company'],
      ['designation', 'Role'],
      ['sector', 'Sector'],
      ['branch', 'Branch'],
      ['country', 'Country'],
      ['city', 'City'],
      ['primaryCategory', 'Category'],
    ];
    for (const [key, label] of text) {
      const v = filterState[key];
      if (typeof v === 'string' && v.trim()) {
        chips.push({ key, label, value: v, clear: { [key]: '' } as Partial<DirectoryFilterState> });
      }
    }
    if (filterState.joiningYear) {
      chips.push({ key: 'joiningYear', label: 'Joined', value: String(filterState.joiningYear), clear: { joiningYear: null } });
    }
    if (filterState.leavingYear) {
      chips.push({ key: 'leavingYear', label: 'Left', value: String(filterState.leavingYear), clear: { leavingYear: null } });
    }
    const flags: [keyof DirectoryFilterState, string][] = [
      ['isHighValue', 'High value'],
      ['isGlobal', 'Global'],
      ['isTopEmployer', 'Top employer'],
      ['isStudentOrRnsit', 'Student / RNSIT'],
      ['needsVerification', 'Needs verification'],
      ['hasEmail', 'Has email'],
      ['hasMobile', 'Has mobile'],
    ];
    for (const [key, label] of flags) {
      if (filterState[key]) {
        chips.push({ key, label: 'Flag', value: label, clear: { [key]: false } as Partial<DirectoryFilterState> });
      }
    }
    return chips;
  }, [filterState]);

  const flagFilters: { key: keyof DirectoryFilterState; label: string }[] = [
    { key: 'isHighValue', label: 'High Value' },
    { key: 'isGlobal', label: 'Global Spread' },
    { key: 'isTopEmployer', label: 'Top Employers' },
    { key: 'isStudentOrRnsit', label: 'Students / RNSIT' },
    { key: 'needsVerification', label: 'Needs Verification' },
    { key: 'hasEmail', label: 'Has Email' },
    { key: 'hasMobile', label: 'Has Mobile' },
  ];

  return (
    <div className="space-y-5">
      {/* Export Notification Banner */}
      {exportNotice && (
        <Alert tone="warn" onDismiss={() => setExportNotice(null)}>
          {exportNotice}
        </Alert>
      )}

      {/* Top Header */}
      <PageHeader
        eyebrow="Alumni Discovery"
        title="Alumni Directory"
        description={
          <span className="flex items-center gap-2">
            <span className="tnum">{totalCount.toLocaleString()}</span> canonical alumni matching
            active search and filters
            {isFetching && (
              <span className="inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-accent" />
            )}
          </span>
        }
        actions={
          <>
            {isAdmin && (
              <Button variant="primary" onClick={() => setIsAdding(true)} icon={<Plus size={15} />}>
                <span className="hidden sm:inline">Add Alumni</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}

            {/* Export menu — click-driven so it works on touch devices */}
            <div className="relative">
              <Button
                disabled={isExporting || totalCount === 0}
                onClick={() => setShowExportMenu((v) => !v)}
                icon={<Download size={15} />}
                iconRight={<ChevronDown size={13} />}
                aria-expanded={showExportMenu}
              >
                {isExporting ? 'Exporting…' : 'Export'}
              </Button>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowExportMenu(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
                    <button
                      onClick={() => handleExportFiltered(true)}
                      className="flex w-full items-center justify-between px-3.5 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
                    >
                      <span>Export All Filtered</span>
                      <span className="text-2xs text-ink-faint">up to 5,000</span>
                    </button>
                    <button
                      onClick={() => handleExportFiltered(false)}
                      className="flex w-full items-center justify-between px-3.5 py-2 text-xs text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
                    >
                      <span>Export Current Page</span>
                      <span className="tnum text-2xs text-ink-faint">{records.length} rows</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <Button
              onClick={() => setShowColumnToggles((v) => !v)}
              title="Toggle Column Visibility"
              aria-pressed={showColumnToggles}
              className={cn('px-2.5', showColumnToggles && 'border-accent/40 bg-accent-soft text-accent-ink')}
            >
              <SlidersHorizontal size={16} />
            </Button>
          </>
        }
      />

      {/* Main Filter & Search Container */}
      <Card className="p-4 sm:p-5">
        <div className="space-y-4">
          {/* Global Search Bar */}
          <div className="flex flex-col gap-2.5 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <SearchInput
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="h-10 pr-16"
                  aria-label="Search alumni"
                  placeholder="Search by name, company (Amazon, AWS), role, branch (CSE, ISE), batch year (2019, 2015-2019), or country (USA)…"
                />
                <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-2xs text-ink-faint lg:block">
                  ⌘K
                </kbd>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="lg"
                onClick={() => setShowAdvancedFilters(v => !v)}
                icon={<Filter size={15} />}
                iconRight={
                  <ChevronDown
                    size={13}
                    className={cn('transition-transform', showAdvancedFilters && 'rotate-180')}
                  />
                }
                aria-expanded={showAdvancedFilters}
                className={cn(
                  'flex-1 md:flex-none',
                  (showAdvancedFilters || activeFilterCount > 0) &&
                    'border-accent/40 bg-accent-soft text-accent-ink',
                )}
              >
                Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
              </Button>

              {(activeFilterCount > 0 || searchInput) && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={handleResetFilters}
                  icon={<RotateCcw size={15} />}
                  title="Reset all search queries and filters"
                  className="hover:bg-danger-soft hover:text-danger-ink"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Active filters — always visible and individually removable */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-2xs font-semibold tracking-[0.1em] text-ink-faint uppercase">
                Active
              </span>
              {activeChips.map((chip) => (
                <FilterChip
                  key={chip.key}
                  label={chip.label}
                  value={chip.value}
                  onRemove={() => updateFilter(chip.clear)}
                />
              ))}
              <button
                onClick={handleResetFilters}
                className="ml-1 text-2xs font-medium text-ink-muted underline underline-offset-2 transition-colors hover:text-danger-ink"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Interpreted Search Pills Bar */}
          {parsedQuery && parsedQuery.detectedPills.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-medium text-ink-muted">
                <Sparkles size={13} className="text-accent" />
                Interpreted:
              </span>
              {parsedQuery.detectedPills.map((pill, idx) => (
                <Badge key={idx} tone="accent">{pill.label}</Badge>
              ))}
            </div>
          )}

          {/* Column Visibility Toggles Drawer */}
          {showColumnToggles && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl border border-line bg-surface-sunken p-4">
              <span className="text-2xs font-semibold tracking-wide text-ink-muted uppercase">
                Toggle Columns
              </span>
              {Object.keys(columnVisibility).map((key) => (
                <Checkbox
                  key={key}
                  checked={(columnVisibility as any)[key]}
                  onChange={e => setColumnVisibility(prev => ({ ...prev, [key]: e.target.checked }))}
                  label={key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                />
              ))}
            </div>
          )}

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="space-y-4 border-t border-line pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <div>
                  <FieldLabel htmlFor="flt-company">Company</FieldLabel>
                  <Input
                    id="flt-company"
                    type="text"
                    value={filterState.company}
                    onChange={e => updateFilter({ company: e.target.value })}
                    placeholder="e.g. Amazon, Microsoft"
                    list="company-datalist"
                  />
                  <datalist id="company-datalist">
                    {companySuggestions.map((comp, idx) => (
                      <option key={idx} value={comp} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <FieldLabel htmlFor="flt-designation">Designation</FieldLabel>
                  <Input
                    id="flt-designation"
                    type="text"
                    value={filterState.designation}
                    onChange={e => updateFilter({ designation: e.target.value })}
                    placeholder="e.g. Staff Engineer"
                    list="designation-datalist"
                  />
                  <datalist id="designation-datalist">
                    {designationSuggestions.map((desig, idx) => (
                      <option key={idx} value={desig} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <FieldLabel htmlFor="flt-branch">Academic Branch</FieldLabel>
                  <Select
                    id="flt-branch"
                    value={filterState.branch}
                    onChange={e => updateFilter({ branch: e.target.value })}
                  >
                    <option value="">All Academic Branches</option>
                    {(filterOptions?.branches || []).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <FieldLabel htmlFor="flt-country">Country</FieldLabel>
                  <Select
                    id="flt-country"
                    value={filterState.country}
                    onChange={e => updateFilter({ country: e.target.value })}
                  >
                    <option value="">All Countries</option>
                    {(filterOptions?.countries || []).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <FieldLabel htmlFor="flt-city">City</FieldLabel>
                  <Input
                    id="flt-city"
                    type="text"
                    value={filterState.city}
                    onChange={e => updateFilter({ city: e.target.value })}
                    placeholder="e.g. Bengaluru, Seattle"
                    list="city-datalist"
                  />
                  <datalist id="city-datalist">
                    {citySuggestions.map((city, idx) => (
                      <option key={idx} value={city} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <FieldLabel htmlFor="flt-category">Primary Category</FieldLabel>
                  <Select
                    id="flt-category"
                    value={filterState.primaryCategory}
                    onChange={e => updateFilter({ primaryCategory: e.target.value })}
                  >
                    <option value="">All Categories</option>
                    {(filterOptions?.categories || []).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <FieldLabel htmlFor="flt-sector">Sector</FieldLabel>
                  <Select
                    id="flt-sector"
                    value={filterState.sector}
                    onChange={e => updateFilter({ sector: e.target.value })}
                  >
                    <option value="">All Sectors</option>
                    {(filterOptions?.sectors || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor="flt-joining">Joining Yr</FieldLabel>
                    <Input
                      id="flt-joining"
                      type="number"
                      value={filterState.joiningYear || ''}
                      onChange={e => updateFilter({ joiningYear: e.target.value ? parseInt(e.target.value, 10) : null })}
                      placeholder="2018"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="flt-leaving">Leaving Yr</FieldLabel>
                    <Input
                      id="flt-leaving"
                      type="number"
                      value={filterState.leavingYear || ''}
                      onChange={e => updateFilter({ leavingYear: e.target.value ? parseInt(e.target.value, 10) : null })}
                      placeholder="2022"
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox Flags (AND Semantics) */}
              <div className="flex flex-wrap gap-x-5 gap-y-2.5 border-t border-line pt-3.5">
                {flagFilters.map(flag => (
                  <Checkbox
                    key={flag.key}
                    checked={Boolean(filterState[flag.key])}
                    onChange={e => updateFilter({ [flag.key]: e.target.checked } as Partial<DirectoryFilterState>)}
                    label={flag.label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Directory Table with Row Click & Server Sort */}
      <Card className="overflow-hidden">
        <TableWrap>
          <Table>
            <THead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    const sortFieldMap: Record<string, string> = {
                      name: 'name',
                      current_company: 'current_company',
                      current_designation: 'current_designation',
                      academic_branch: 'academic_branch',
                      joining_year: 'joining_year',
                      leaving_year: 'leaving_year',
                      value_score: 'value_score',
                    };
                    const sortKey = sortFieldMap[header.column.id];
                    const isSorted = sortKey && filterState.sortBy === sortKey;
                    const isAsc = filterState.sortOrder === 'asc';

                    return (
                      <TH
                        key={header.id}
                        align={header.column.id === 'actions' ? 'right' : 'left'}
                        className={cn(
                          sortKey && 'cursor-pointer transition-colors select-none hover:bg-surface-hover hover:text-ink',
                          isSorted && 'text-accent-ink',
                        )}
                        onClick={sortKey ? () => handleSortToggle(sortKey) : undefined}
                        aria-sort={isSorted ? (isAsc ? 'ascending' : 'descending') : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {sortKey && isSorted && (
                            isAsc
                              ? <ChevronUp size={13} className="text-accent" />
                              : <ChevronDown size={13} className="text-accent" />
                          )}
                        </div>
                      </TH>
                    );
                  })}
                </tr>
              ))}
            </THead>

            <TBody>
              {isLoading ? (
                // Loading Skeleton
                Array.from({ length: 10 }).map((_, i) => (
                  <TR key={i}>
                    {columns.map((_col, ci) => (
                      <TD key={ci}>
                        <Skeleton className={cn('h-4', ci === 0 ? 'w-32' : 'w-20')} />
                      </TD>
                    ))}
                  </TR>
                ))
              ) : queryError ? (
                // Error State
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <EmptyState
                      className="py-14"
                      icon={<ShieldAlert size={22} className="text-danger" />}
                      title="Failed to load alumni records"
                      description={(queryError as Error).message}
                      action={
                        <Button variant="primary" onClick={() => refetch()}>
                          Retry Query
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                // Empty State (Ordinary zero results)
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <EmptyState
                      className="py-16"
                      icon={<Search size={22} />}
                      title="No alumni found"
                      description="No canonical records matched your search term or active filter combination."
                      action={<Button onClick={handleResetFilters}>Clear All Filters</Button>}
                    />
                  </td>
                </tr>
              ) : (
                // Records Table with Row Click
                table.getRowModel().rows.map(row => (
                  <TR
                    key={row.id}
                    interactive
                    tabIndex={0}
                    role="button"
                    aria-label={`Open profile for ${row.original.name}`}
                    onClick={() => setViewingRecord(row.original)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setViewingRecord(row.original);
                      }
                    }}
                    className="group focus-visible:bg-surface-hover"
                  >
                    {row.getVisibleCells().map(cell => (
                      <TD
                        key={cell.id}
                        className={cn(
                          'text-xs whitespace-nowrap sm:text-[0.8125rem]',
                          cell.column.id === 'actions' && 'text-right',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TD>
                    ))}
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </TableWrap>

        {/* Server-Side Pagination Bar */}
        <div className="border-t border-line px-4 py-3">
          <Pagination
            page={filterState.page}
            totalPages={totalPages}
            disabled={isLoading}
            onPrev={() => updateFilter({ page: Math.max(1, filterState.page - 1) })}
            onNext={() => updateFilter({ page: Math.min(totalPages, filterState.page + 1) })}
            summary={
              <>
                Showing{' '}
                <span className="tnum font-semibold text-ink">
                  {totalCount > 0 ? (filterState.page - 1) * filterState.pageSize + 1 : 0}
                </span>{' '}
                to{' '}
                <span className="tnum font-semibold text-ink">
                  {Math.min(filterState.page * filterState.pageSize, totalCount)}
                </span>{' '}
                of <span className="tnum font-semibold text-ink">{totalCount.toLocaleString()}</span>{' '}
                records
              </>
            }
          >
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <span className="hidden sm:inline">Rows per page:</span>
              <Select
                value={filterState.pageSize}
                onChange={e => updateFilter({ pageSize: parseInt(e.target.value, 10), page: 1 })}
                aria-label="Rows per page"
                className="h-8 w-auto text-xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
            </div>
          </Pagination>
        </div>
      </Card>

      {/* Edit Alumni Modal (Admin Only) */}
      {(editingRecord || isAdding) && (
        <EditAlumniModal
          record={editingRecord || {}}
          onClose={() => {
            setEditingRecord(null);
            setIsAdding(false);
          }}
          onSave={() => {
            setEditingRecord(null);
            setIsAdding(false);
            invalidateAndRefetch();
          }}
        />
      )}

      {/* View Profile Modal (Schema v1) */}
      {viewingRecord && (
        <AlumniProfileModal
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onEdit={() => {
            setEditingRecord(viewingRecord);
            setViewingRecord(null);
          }}
          onVerified={(updatedRecord) => {
            setViewingRecord(updatedRecord);
            invalidateAndRefetch();
          }}
        />
      )}
    </div>
  );
};

export default Directory;
