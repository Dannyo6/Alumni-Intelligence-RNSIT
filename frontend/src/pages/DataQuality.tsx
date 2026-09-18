import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Mail, MapPin, Building, GraduationCap, Phone,
  Edit2, ExternalLink, RefreshCw, Download, CheckSquare, Square,
  GitBranch, AlertTriangle, Info, X, ChevronRight,
  Link2, Briefcase, Globe, Calendar, Tag, Users, UserX, TrendingDown,
  Shield, CircleAlert
} from 'lucide-react';
import EditAlumniModal from '../components/EditAlumniModal';
import AlumniProfileModal from '../components/AlumniProfileModal';
import {
  fetchDataQualityMetrics,
  fetchQualityRecords,
  fetchBranchNormalizationReport,
  VALID_QUALITY_FILTERS,
  type DataQualityMetrics,
  type QualityRecord,
  type QualityFilterKey,
  type BranchReportRow,
  type BranchClassification,
} from '../services/dataQualityService';
import { markAlumnusVerified } from '../services/directoryService';
import type { Database } from '../types/supabase';
import {
  Alert, Badge, Button, Card, EmptyState, PageHeader, Pagination,
  SearchInput, Skeleton, Table, TableWrap, TBody, TD, TH, THead, TR, Tabs, Toast, cn,
} from '../components/ui';
import type { TabItem } from '../components/ui';

type AlumnusRow = Database['public']['Tables']['alumni']['Row'];

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'records' | 'branch_audit';

type FilterKey = QualityFilterKey;

type Severity = 'critical' | 'warning' | 'info';

interface MetricCard {
  id: FilterKey;
  title: string;
  description: string;
  icon: React.ReactNode;
  group: 'contact' | 'professional' | 'governance' | 'confidence';
  severity: (count: number, total: number) => Severity;
}

// ─── Metric Card Definitions ─────────────────────────────────────────────────

const pct = (n: number, t: number) => (t > 0 ? (n / t) * 100 : 0);

const METRIC_CARDS: MetricCard[] = [
  // Contact & Identity
  {
    id: 'missing_email',
    title: 'Missing Email',
    description: 'Records without any email address.',
    icon: <Mail size={18} />,
    group: 'contact',
    severity: (c, t) => pct(c, t) > 20 ? 'critical' : pct(c, t) > 5 ? 'warning' : 'info',
  },
  {
    id: 'missing_mobile',
    title: 'Missing Mobile',
    description: 'Records without a contact number.',
    icon: <Phone size={18} />,
    group: 'contact',
    severity: (c, t) => pct(c, t) > 30 ? 'critical' : pct(c, t) > 10 ? 'warning' : 'info',
  },
  {
    id: 'missing_contact',
    title: 'Missing Contact',
    description: 'Records with no email and no mobile.',
    icon: <UserX size={18} />,
    group: 'contact',
    severity: (c, _) => c > 100 ? 'critical' : c > 10 ? 'warning' : 'info',
  },
  {
    id: 'invalid_mobile',
    title: 'Invalid Mobile',
    description: 'Mobile numbers that fail digit-length validation.',
    icon: <Phone size={18} />,
    group: 'contact',
    severity: (c, _) => c > 100 ? 'critical' : c > 10 ? 'warning' : 'info',
  },
  {
    id: 'multiple_emails',
    title: 'Multiple Emails',
    description: 'Records with alternate email addresses on file.',
    icon: <Mail size={18} />,
    group: 'contact',
    severity: (_c, _t) => 'info',
  },
  {
    id: 'missing_linkedin',
    title: 'Missing LinkedIn',
    description: 'Records with no LinkedIn or profile link.',
    icon: <Link2 size={18} />,
    group: 'contact',
    severity: (c, t) => pct(c, t) > 50 ? 'warning' : 'info',
  },
  // Professional
  {
    id: 'missing_company',
    title: 'Missing Company',
    description: 'Records missing current employer.',
    icon: <Building size={18} />,
    group: 'professional',
    severity: (c, t) => pct(c, t) > 20 ? 'critical' : pct(c, t) > 5 ? 'warning' : 'info',
  },
  {
    id: 'missing_designation',
    title: 'Missing Designation',
    description: 'Records missing job title or role.',
    icon: <Briefcase size={18} />,
    group: 'professional',
    severity: (c, t) => pct(c, t) > 30 ? 'warning' : 'info',
  },
  {
    id: 'missing_professional',
    title: 'Missing Professional Info',
    description: 'Records with no company and no designation.',
    icon: <TrendingDown size={18} />,
    group: 'professional',
    severity: (c, _) => c > 200 ? 'critical' : c > 50 ? 'warning' : 'info',
  },
  {
    id: 'missing_sector',
    title: 'Missing Sector',
    description: 'Records without an industry sector classification.',
    icon: <Tag size={18} />,
    group: 'professional',
    severity: (c, t) => pct(c, t) > 40 ? 'warning' : 'info',
  },
  {
    id: 'missing_country',
    title: 'Missing Country',
    description: 'Records without a country on file.',
    icon: <Globe size={18} />,
    group: 'professional',
    severity: (c, t) => pct(c, t) > 20 ? 'warning' : 'info',
  },
  {
    id: 'missing_city',
    title: 'Missing City',
    description: 'Records without a city on file.',
    icon: <MapPin size={18} />,
    group: 'professional',
    severity: (c, t) => pct(c, t) > 30 ? 'warning' : 'info',
  },
  {
    id: 'missing_joining_year',
    title: 'Missing Joining Year',
    description: 'Records without an RNSIT joining year.',
    icon: <Calendar size={18} />,
    group: 'professional',
    severity: (c, t) => pct(c, t) > 20 ? 'warning' : 'info',
  },
  {
    id: 'missing_leaving_year',
    title: 'Missing Leaving Year',
    description: 'Records without an RNSIT leaving year.',
    icon: <Calendar size={18} />,
    group: 'professional',
    severity: (c, t) => pct(c, t) > 20 ? 'warning' : 'info',
  },
  {
    id: 'missing_academic_branch',
    title: 'Missing Academic Branch',
    description: 'Records without a department / programme on file.',
    icon: <GraduationCap size={18} />,
    group: 'professional',
    severity: (c, t) => pct(c, t) > 20 ? 'warning' : 'info',
  },
  // Governance
  {
    id: 'needs_verification',
    title: 'Needs Verification',
    description: 'Records flagged for manual administrative review.',
    icon: <ShieldAlert size={18} />,
    group: 'governance',
    severity: (c, _) => c > 0 ? 'critical' : 'info',
  },
  {
    id: 'low_data_confidence',
    title: 'Low / Unverified Confidence',
    description: 'Records with Low or unverified confidence.',
    icon: <CircleAlert size={18} />,
    group: 'governance',
    severity: (c, t) => pct(c, t) > 30 ? 'critical' : pct(c, t) > 10 ? 'warning' : 'info',
  },
  // Confidence Distribution
  {
    id: 'confidence_high',
    title: 'High Confidence',
    description: 'Records classified as high confidence.',
    icon: <Shield size={18} />,
    group: 'confidence',
    severity: (_c, _t) => 'info',
  },
  {
    id: 'confidence_medium',
    title: 'Medium Confidence',
    description: 'Records classified as medium / standard confidence.',
    icon: <Shield size={18} />,
    group: 'confidence',
    severity: (_c, _t) => 'info',
  },
  {
    id: 'confidence_low',
    title: 'Low Confidence',
    description: 'Records classified as low confidence.',
    icon: <Shield size={18} />,
    group: 'confidence',
    severity: (c, _) => c > 100 ? 'warning' : 'info',
  },
  {
    id: 'confidence_unverified',
    title: 'Unverified / NULL Confidence',
    description: 'Records with no confidence set (treated as unverified).',
    icon: <Shield size={18} />,
    group: 'confidence',
    severity: (c, t) => pct(c, t) > 30 ? 'warning' : 'info',
  },
];

// ─── Severity Styling ─────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<
  Severity,
  { tone: 'danger' | 'warn' | 'info'; label: string; chip: string; bar: string; ring: string }
> = {
  critical: {
    tone: 'danger',
    label: 'Critical',
    chip: 'bg-danger-soft text-danger',
    bar: 'bg-danger',
    ring: 'border-danger/50',
  },
  warning: {
    tone: 'warn',
    label: 'Warning',
    chip: 'bg-warn-soft text-warn',
    bar: 'bg-warn',
    ring: 'border-warn/50',
  },
  info: {
    tone: 'info',
    label: 'Info',
    chip: 'bg-info-soft text-info',
    bar: 'bg-accent',
    ring: 'border-accent/50',
  },
};

// ─── Branch Classification Styling ───────────────────────────────────────────

const BRANCH_CLASSIFICATION_LABELS: Record<
  BranchClassification,
  { label: string; tone: 'success' | 'warn' | 'accent' | 'danger' | 'neutral' }
> = {
  recognized_academic_branch: { label: 'Recognized', tone: 'success' },
  role_like_value:            { label: 'Role-like', tone: 'warn' },
  organization_like_value:    { label: 'Organization-like', tone: 'accent' },
  unrecognized_branch_value:  { label: 'Unrecognized', tone: 'warn' },
  unknown:                    { label: 'Unknown', tone: 'danger' },
};

const BRANCH_FILTER_LABELS: Record<string, string> = {
  all: 'All',
  recognized_academic_branch: 'Recognized',
  role_like_value: 'Role-like',
  organization_like_value: 'Org-like',
  unrecognized_branch_value: 'Unrecognized',
  unknown: 'Unknown',
};

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportToCsv(records: QualityRecord[], filename: string) {
  if (records.length === 0) return;
  const COLS: (keyof QualityRecord)[] = [
    'name', 'email', 'mobile', 'current_company', 'current_designation',
    'company_sector', 'city', 'country', 'joining_year', 'leaving_year',
    'academic_branch', 'linkedin_url', 'profile_link', 'needs_verification',
    'data_confidence', 'notes', 'updated_at',
  ];
  const escape = (v: unknown) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const header = COLS.join(',');
  const rows = records.map(r => COLS.map(c => escape(r[c])).join(','));
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

const DataQuality = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Tab
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Metrics
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Records tab
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [recordsTotalCount, setRecordsTotalCount] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [editingRecord, setEditingRecord] = useState<AlumnusRow | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AlumnusRow | null>(null);

  // Branch audit
  const [branchReport, setBranchReport] = useState<BranchReportRow[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [branchSortBy, setBranchSortBy] = useState<'count' | 'name'>('count');
  const [branchClassFilter, setBranchClassFilter] = useState<BranchClassification | 'all'>('all');

  // ─── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // ─── Fetch metrics ─────────────────────────────────────────────────────────
  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const m = await fetchDataQualityMetrics();
      setMetrics(m);
    } catch (err: any) {
      setMetricsError(err?.message ?? 'Failed to load metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // ─── Fetch records for active filter ──────────────────────────────────────
  const loadRecords = useCallback(async (filter: FilterKey, page = 1) => {
    setRecordsLoading(true);
    setSelectedIds(new Set());
    try {
      const result = await fetchQualityRecords(filter, page, PAGE_SIZE);
      setRecords(result.records);
      setRecordsTotalCount(result.totalCount);
      setRecordsPage(page);
    } catch (err: any) {
      showToast(`Error loading records: ${err?.message}`);
    } finally {
      setRecordsLoading(false);
    }
  }, [showToast]);

  // ─── Select filter → switch to Records tab ────────────────────────────────
  const drillDown = useCallback((filter: FilterKey) => {
    setActiveFilter(filter);
    setSearchQuery('');
    setActiveTab('records');
    loadRecords(filter, 1);
    navigate(`/data-quality?filter=${filter}`, { replace: true });
  }, [loadRecords, navigate]);

  // ─── Load branch audit ─────────────────────────────────────────────────────
  const loadBranchReport = useCallback(async () => {
    setBranchLoading(true);
    try {
      const rows = await fetchBranchNormalizationReport();
      setBranchReport(rows);
    } catch (err: any) {
      showToast(`Error loading branch report: ${err?.message}`);
    } finally {
      setBranchLoading(false);
    }
  }, [showToast]);

  // ─── Initial load from URL query param ────────────────────────────────────
  useEffect(() => {
    loadMetrics();
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter') as FilterKey | null;
    if (filter && VALID_QUALITY_FILTERS.includes(filter)) {
      setActiveFilter(filter);
      setActiveTab('records');
      loadRecords(filter, 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Tab switch: load branch report lazily ─────────────────────────────────
  useEffect(() => {
    if (activeTab === 'branch_audit' && branchReport.length === 0 && !branchLoading) {
      loadBranchReport();
    }
  }, [activeTab, branchReport.length, branchLoading, loadBranchReport]);

  // ─── Filtered records (client-side search within loaded page) ──────────────
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.current_company && r.current_company.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.city && r.city.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  // ─── Bulk selection helpers ────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };
  const allSelected = filteredRecords.length > 0 && selectedIds.size === filteredRecords.length;

  // ─── Bulk: Mark Verified ──────────────────────────────────────────────────
  // Security: This calls markAlumnusVerified which issues a supabase .update()
  // with the user's session. Database RLS is the authorization boundary, NOT
  // this UI. Only admin-role sessions with appropriate RLS policies can
  // successfully update alumni rows. Viewer sessions will receive a Postgres
  // error from RLS, which we surface as a failed count.
  const bulkMarkVerified = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkWorking(true);
    let success = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await markAlumnusVerified(id, 'high');
        success++;
      } catch {
        failed++;
      }
    }
    setBulkWorking(false);
    showToast(`Marked ${success} record(s) as verified${failed > 0 ? `, ${failed} failed` : ''}.`);
    setSelectedIds(new Set());
    if (activeFilter) await loadRecords(activeFilter, recordsPage);
    await loadMetrics();
  }, [selectedIds, activeFilter, recordsPage, loadRecords, loadMetrics, showToast]);

  // ─── Bulk: Export CSV ────────────────────────────────────────────────────
  const bulkExportCsv = useCallback(() => {
    const toExport = filteredRecords.filter(r => selectedIds.has(r.id));
    if (toExport.length === 0) return;
    const filterLabel = activeFilter ?? 'selection';
    exportToCsv(toExport, `alumni_${filterLabel}_${Date.now()}.csv`);
    showToast(`Exported ${toExport.length} records to CSV.`);
  }, [filteredRecords, selectedIds, activeFilter, showToast]);

  // ─── Convert QualityRecord → AlumnusRow (for modals) ──────────────────────
  const toAlumnusRow = (r: QualityRecord): AlumnusRow => ({
    ...(r as any),
    name_normalized: null,
    current_company_normalized: null,
    designation_normalized: null,
    city_normalized: null,
    country_code: null,
    email_normalized: null,
    mobile_normalized: null,
    profile_link_normalized: null,
    is_high_value: r.is_high_value ?? false,
    is_global: r.is_global ?? false,
    is_top_employer: r.is_top_employer ?? false,
    is_student_or_rnsit: r.is_student_or_rnsit ?? false,
    needs_verification: r.needs_verification ?? false,
    last_import_job_id: null,
    search_vector: null,
    source_workbook: null,
    source_sheet: null,
  });

  // ─── Branch report sorted + filtered ─────────────────────────────────────
  const sortedBranch = useMemo(() => {
    let rows = branchReport;
    if (branchClassFilter !== 'all') {
      rows = rows.filter(r => r.classification === branchClassFilter);
    }
    if (branchSearch.trim()) {
      const q = branchSearch.toLowerCase();
      rows = rows.filter(r => r.academic_branch.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      if (branchSortBy === 'count') return b.record_count - a.record_count;
      return a.academic_branch.localeCompare(b.academic_branch);
    });
  }, [branchReport, branchSearch, branchSortBy, branchClassFilter]);

  const unrecoCount = branchReport.filter(r => !r.is_recognized).length;
  const roleCount = branchReport.filter(r => r.classification === 'role_like_value').length;
  const orgCount = branchReport.filter(r => r.classification === 'organization_like_value').length;

  // ─── Triage ───────────────────────────────────────────────────────────────
  /** Rank dimensions by severity so the worst problems are reachable in one click. */
  const contactCards = METRIC_CARDS.filter(c => c.group === 'contact');
  const professionalCards = METRIC_CARDS.filter(c => c.group === 'professional');
  const governanceCards = METRIC_CARDS.filter(c => c.group === 'governance');
  const confidenceCards = METRIC_CARDS.filter(c => c.group === 'confidence');

  const totalCount = metrics?.total_count ?? 0;
  const totalPages = Math.ceil(recordsTotalCount / PAGE_SIZE);

  // ─── Active filter card label for tab ──────────────────────────────────────
  const activeCardTitle = activeFilter
    ? METRIC_CARDS.find(c => c.id === activeFilter)?.title ?? activeFilter
    : null;

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderMetricCard = (card: MetricCard) => {
    const count = metrics ? ((metrics as any)[card.id] ?? 0) : 0;
    const sev = card.severity(count, totalCount);
    const styles = SEVERITY_STYLES[sev];
    const isActive = activeFilter === card.id && activeTab === 'records';
    const share = pct(count, totalCount);

    return (
      <Card
        key={card.id}
        spotlight
        interactive
        onClick={() => drillDown(card.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            drillDown(card.id);
          }
        }}
        aria-label={`${card.title}: ${count.toLocaleString()} records. Drill down.`}
        className={cn('group/metric h-full', isActive && `${styles.ring} shadow-md`)}
      >
        <div className="relative flex h-full flex-col p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300',
                'group-hover/metric:scale-105',
                styles.chip,
              )}
            >
              {card.icon}
            </span>
            
          </div>

          <div className="flex-1">
            <div className="tnum text-2xl font-semibold leading-none text-ink">
              {metricsLoading ? <Skeleton className="h-7 w-16" /> : count.toLocaleString()}
            </div>
            <div className="mt-1.5 text-[0.8125rem] font-medium text-ink-secondary">{card.title}</div>
            <div className="mt-1 text-xs leading-snug text-ink-faint">{card.description}</div>
          </div>

          {!metricsLoading && totalCount > 0 && count > 0 && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
                  style={{ width: `${Math.min(100, share).toFixed(1)}%` }}
                />
              </div>
              <div className="tnum mt-1 text-2xs text-ink-faint">{share.toFixed(1)}% of total</div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const MetricSection: React.FC<{
    icon: React.ReactNode;
    title: string;
    cards: MetricCard[];
    cols?: string;
  }> = ({ icon, title, cards, cols = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' }) => (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-2xs font-semibold tracking-[0.1em] text-ink-muted uppercase">
        {icon} {title}
      </h2>
      <div className={cn('grid grid-cols-1 gap-4', cols)}>{cards.map(renderMetricCard)}</div>
    </section>
  );

  const tabs: TabItem<TabId>[] = [
    { id: 'overview', label: 'Overview', icon: <Info size={15} /> },
    {
      id: 'records',
      label: activeCardTitle ? `Records — ${activeCardTitle}` : 'Records',
      icon: <Users size={15} />,
    },
    {
      id: 'branch_audit',
      label: `Branch Audit${unrecoCount > 0 ? ` (${unrecoCount} suspicious)` : ''}`,
      icon: <GitBranch size={15} />,
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="Data Quality & Governance"
        description={`Administrative workspace for data integrity across ${totalCount > 0 ? totalCount.toLocaleString() : '—'} alumni records.`}
        actions={
          <Button
            onClick={() => { loadMetrics(); if (activeTab === 'branch_audit') loadBranchReport(); }}
            icon={<RefreshCw size={14} className={metricsLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        }
      />

      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} layoutId="dq-tabs" />

      {/* ── TAB: Overview ────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-7">
          {metricsError && (
            <Alert
              tone="danger"
              action={
                <Button size="sm" onClick={loadMetrics}>
                  Retry
                </Button>
              }
            >
              {metricsError}
            </Alert>
          )}

          <MetricSection icon={<Mail size={13} />} title="Contact & Identity" cards={contactCards} />
          <MetricSection icon={<Briefcase size={13} />} title="Professional & Academic" cards={professionalCards} />
          <MetricSection icon={<ShieldAlert size={13} />} title="Governance" cards={governanceCards} />
          <MetricSection icon={<Shield size={13} />} title="Confidence Distribution" cards={confidenceCards} />
        </div>
      )}

      {/* ── TAB: Records ─────────────────────────────────────────────────────── */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {!activeFilter ? (
            <Card>
              <EmptyState
                className="py-20"
                icon={<Info size={22} />}
                title="No filter selected"
                description="Pick a metric card on the Overview tab to drill into the matching records."
                action={<Button onClick={() => setActiveTab('overview')}>Go to Overview</Button>}
              />
            </Card>
          ) : (
            <>
              {/* Breadcrumb back to the queue — closes the triage loop */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className="inline-flex min-h-6 items-center font-medium text-ink-muted transition-colors hover:text-accent-ink"
                >
                  Quality overview
                </button>
                <ChevronRight size={13} className="text-ink-faint" />
                <span className="font-medium text-ink">{activeCardTitle}</span>
              </div>

              {/* Toolbar */}
              <Card className="p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[200px] flex-1">
                    <SearchInput
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      aria-label="Search loaded records"
                      placeholder="Search name, company, email…"
                    />
                  </div>

                  <span className="tnum text-xs whitespace-nowrap text-ink-muted">
                    {recordsLoading
                      ? 'Loading…'
                      : `${filteredRecords.length.toLocaleString()} / ${recordsTotalCount.toLocaleString()} records`}
                  </span>

                  {/* Bulk actions */}
                  {selectedIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent" dot>{selectedIds.size} selected</Badge>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={bulkMarkVerified}
                        disabled={bulkWorking}
                        icon={<ShieldAlert size={14} />}
                        className="bg-success hover:brightness-110"
                      >
                        {bulkWorking ? 'Working…' : 'Mark Verified'}
                      </Button>
                      <Button size="sm" onClick={bulkExportCsv} icon={<Download size={14} />}>
                        Export CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedIds(new Set())}
                        title="Clear selection"
                        className="px-2"
                      >
                        <X size={15} />
                      </Button>
                    </div>
                  )}

                  {/* Export all visible */}
                  {selectedIds.size === 0 && filteredRecords.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        exportToCsv(filteredRecords, `alumni_${activeFilter}_page${recordsPage}.csv`);
                        showToast(`Exported ${filteredRecords.length} records.`);
                      }}
                      icon={<Download size={14} />}
                    >
                      Export Page
                    </Button>
                  )}
                </div>
              </Card>

              {/* Table */}
              <Card className="overflow-hidden">
                {recordsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-24 text-sm text-ink-muted">
                    <RefreshCw size={18} className="animate-spin" /> Loading records…
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <EmptyState
                    className="py-24"
                    icon={<CheckSquare size={22} />}
                    title="No records found"
                    description={searchQuery ? 'Try clearing the search filter.' : undefined}
                  />
                ) : (
                  <TableWrap maxHeight="640px">
                    <Table>
                      <THead sticky>
                        <tr>
                          <TH className="w-10">
                            <button
                              onClick={toggleSelectAll}
                              aria-label={allSelected ? 'Deselect all' : 'Select all'}
                              className="-m-1 inline-flex h-6 w-6 items-center justify-center rounded p-1 text-ink-faint transition-colors hover:text-accent"
                            >
                              {allSelected ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
                            </button>
                          </TH>
                          <TH>Name</TH>
                          <TH>Contact</TH>
                          <TH>Company &amp; Role</TH>
                          <TH>Location</TH>
                          <TH>Batch</TH>
                          <TH align="right">Actions</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {filteredRecords.map(rec => (
                          <TR key={rec.id} selected={selectedIds.has(rec.id)} className="hover:bg-surface-hover">
                            <TD>
                              <button
                                onClick={() => toggleSelect(rec.id)}
                                aria-label={`Select ${rec.name}`}
                                className="-m-1 inline-flex h-6 w-6 items-center justify-center rounded p-1 text-ink-faint transition-colors hover:text-accent"
                              >
                                {selectedIds.has(rec.id)
                                  ? <CheckSquare size={16} className="text-accent" />
                                  : <Square size={16} />}
                              </button>
                            </TD>
                            <TD>
                              <button
                                onClick={() => setViewingRecord(toAlumnusRow(rec))}
                                className="flex min-h-6 min-w-6 max-w-[180px] items-center truncate text-left text-[0.8125rem] font-medium text-accent-ink hover:underline"
                                title={rec.name}
                              >
                                {rec.name}
                              </button>
                              {rec.needs_verification && (
                                <span className="mt-0.5 inline-flex items-center gap-1 text-2xs text-warn">
                                  <ShieldAlert size={10} /> Needs verification
                                </span>
                              )}
                              {rec.data_confidence && (
                                <span className="block text-2xs text-ink-faint">
                                  {rec.data_confidence} confidence
                                </span>
                              )}
                              {rec.profile_link && (
                                <a
                                  href={rec.profile_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 inline-flex min-h-6 items-center gap-0.5 text-2xs text-ink-faint transition-colors hover:text-accent"
                                >
                                  Profile <ExternalLink size={9} />
                                </a>
                              )}
                            </TD>
                            <TD>
                              <div className={rec.email ? 'text-xs text-ink-secondary' : 'text-2xs italic text-danger'}>
                                {rec.email || 'Missing Email'}
                              </div>
                              <div
                                className={cn(
                                  'text-2xs',
                                  !rec.mobile ? 'italic text-warn'
                                    : rec.mobile_valid === false ? 'text-danger'
                                    : 'text-ink-muted',
                                )}
                              >
                                {rec.mobile || 'Missing Mobile'}
                                {rec.mobile_valid === false && rec.mobile && ' ⚠ invalid'}
                              </div>
                              {rec.alternate_emails && rec.alternate_emails.length > 0 && (
                                <div className="mt-0.5 text-2xs text-info">
                                  {rec.alternate_emails.length} alternate email(s)
                                </div>
                              )}
                            </TD>
                            <TD className="max-w-[180px]">
                              <div
                                className={cn('truncate text-xs', rec.current_company ? 'text-ink-secondary' : 'italic text-info')}
                                title={rec.current_company || undefined}
                              >
                                {rec.current_company || 'Missing Company'}
                              </div>
                              <div
                                className="truncate text-2xs text-ink-muted"
                                title={rec.current_designation || undefined}
                              >
                                {rec.current_designation || ''}
                              </div>
                              {rec.company_sector && (
                                <div className="mt-0.5 truncate text-2xs text-ink-faint">{rec.company_sector}</div>
                              )}
                            </TD>
                            <TD className="max-w-[140px]">
                              <div
                                className={cn('truncate text-xs', (rec.city || rec.country) ? 'text-ink-secondary' : 'italic text-accent')}
                                title={[rec.city, rec.country].filter(Boolean).join(', ') || undefined}
                              >
                                {rec.city || rec.country
                                  ? [rec.city, rec.country].filter(Boolean).join(', ')
                                  : 'Missing Location'}
                              </div>
                            </TD>
                            <TD className="tnum text-xs whitespace-nowrap text-ink-muted">
                              {(rec.joining_year || rec.leaving_year)
                                ? `${rec.joining_year || '?'} – ${rec.leaving_year || '?'}`
                                : <span className="italic text-success">Missing Batch</span>}
                            </TD>
                            <TD className="text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                onClick={() => setEditingRecord(toAlumnusRow(rec))}
                                icon={<Edit2 size={12} />}
                                className="bg-accent-soft text-accent-ink"
                              >
                                Edit
                              </Button>
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </TableWrap>
                )}

                {/* Pagination */}
                {!recordsLoading && totalPages > 1 && (
                  <div className="border-t border-line bg-surface-sunken px-4 py-3">
                    <Pagination
                      page={recordsPage}
                      totalPages={totalPages}
                      onPrev={() => { if (activeFilter) loadRecords(activeFilter, recordsPage - 1); }}
                      onNext={() => { if (activeFilter) loadRecords(activeFilter, recordsPage + 1); }}
                      summary={
                        <span className="tnum">{recordsTotalCount.toLocaleString()} total records</span>
                      }
                    />
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Branch Audit ────────────────────────────────────────────────── */}
      {activeTab === 'branch_audit' && (
        <div className="space-y-4">
          <Card className="p-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[200px] flex-1">
                  <SearchInput
                    value={branchSearch}
                    onChange={e => setBranchSearch(e.target.value)}
                    aria-label="Search branch values"
                    placeholder="Search branch values…"
                  />
                </div>

                {(unrecoCount > 0 || roleCount > 0 || orgCount > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {roleCount > 0 && <Badge tone="warn">{roleCount} role-like</Badge>}
                    {orgCount > 0 && <Badge tone="accent">{orgCount} org-like</Badge>}
                    {unrecoCount > 0 && (
                      <Badge tone="warn">
                        <AlertTriangle size={11} /> {unrecoCount} suspicious total
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-2xs font-semibold tracking-wide text-ink-muted uppercase">
                    Class
                  </span>
                  {(['all', 'recognized_academic_branch', 'role_like_value', 'organization_like_value', 'unrecognized_branch_value', 'unknown'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setBranchClassFilter(f)}
                      aria-pressed={branchClassFilter === f}
                      className={cn(
                        'rounded-lg border px-2.5 py-1 text-2xs font-medium transition-colors',
                        branchClassFilter === f
                          ? 'border-accent bg-accent text-white dark:text-brand-950'
                          : 'border-line bg-surface text-ink-muted hover:bg-surface-hover hover:text-ink',
                      )}
                    >
                      {BRANCH_FILTER_LABELS[f]}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="mr-1 text-2xs font-semibold tracking-wide text-ink-muted uppercase">
                    Sort
                  </span>
                  {(['count', 'name'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setBranchSortBy(s)}
                      aria-pressed={branchSortBy === s}
                      className={cn(
                        'rounded-lg border px-2.5 py-1 text-2xs font-medium transition-colors',
                        branchSortBy === s
                          ? 'border-accent bg-accent text-white dark:text-brand-950'
                          : 'border-line bg-surface text-ink-muted hover:bg-surface-hover hover:text-ink',
                      )}
                    >
                      {s === 'count' ? 'By Count' : 'By Name'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {branchLoading ? (
              <div className="flex items-center justify-center gap-2 py-24 text-sm text-ink-muted">
                <RefreshCw size={18} className="animate-spin" /> Loading branch report…
              </div>
            ) : sortedBranch.length === 0 ? (
              <EmptyState className="py-24" icon={<GitBranch size={22} />} title="No branch data found" />
            ) : (
              <TableWrap maxHeight="640px">
                <Table>
                  <THead sticky>
                    <tr>
                      <TH>Academic Branch Value</TH>
                      <TH>Records</TH>
                      <TH>Classification</TH>
                      <TH align="right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {sortedBranch.map(row => {
                      const cls = BRANCH_CLASSIFICATION_LABELS[row.classification] ?? BRANCH_CLASSIFICATION_LABELS.unknown;
                      return (
                        <TR
                          key={row.academic_branch}
                          className={cn(!row.is_recognized && 'bg-warn-soft/40 hover:bg-warn-soft/70', row.is_recognized && 'hover:bg-surface-hover')}
                        >
                          <TD className="font-mono text-xs text-ink">{row.academic_branch}</TD>
                          <TD className="tnum text-xs font-medium text-ink-secondary">
                            {row.record_count.toLocaleString()}
                          </TD>
                          <TD>
                            <Badge tone={cls.tone}>
                              {row.is_recognized ? <CheckSquare size={11} /> : <AlertTriangle size={11} />}
                              {cls.label}
                            </Badge>
                          </TD>
                          <TD className="text-right">
                            <a
                              href={`/directory?branch=${encodeURIComponent(row.academic_branch)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-accent-ink hover:underline"
                            >
                              View in Directory <ExternalLink size={11} />
                            </a>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableWrap>
            )}
            <div className="border-t border-line bg-surface-sunken px-4 py-3 text-2xs text-ink-faint">
              {sortedBranch.length} distinct branch value{sortedBranch.length !== 1 ? 's' : ''} shown
              {branchSearch && ` (filtered from ${branchReport.length})`}
              {branchClassFilter !== 'all' && ` — classification: ${branchClassFilter.replace(/_/g, ' ')}`}
            </div>
          </Card>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {editingRecord && (
        <EditAlumniModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={async (updatedRecord) => {
            setRecords(prev => prev.map(r => r.id === updatedRecord.id ? { ...r, ...(updatedRecord as any) } : r));
            setEditingRecord(null);
            await loadMetrics();
          }}
        />
      )}

      {viewingRecord && (
        <AlumniProfileModal
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onEdit={() => {
            setEditingRecord(viewingRecord);
            setViewingRecord(null);
          }}
        />
      )}
    </div>
  );
};

export default DataQuality;

