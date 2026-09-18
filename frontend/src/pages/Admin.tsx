import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Users, Upload, Copy, CheckCircle2, Activity, ShieldCheck,
  AlertTriangle, RefreshCw, Eye, Edit3, Check, ShieldAlert,
  Clock, Database, Info, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchAdminUsers,
  updateUserProfileRoleAndStatus,
  fetchAdminImportJobs,
  fetchAdminImportJobDetails,
  fetchAdminDuplicateCandidates,
  resolveDuplicateCandidate,
  fetchAdminAuditSummary,
  type AdminUserProfile
} from '../services/adminService';
import { fetchQualityRecords } from '../services/dataQualityService';
import { markAlumnusVerified } from '../services/directoryService';
import EditAlumniModal from '../components/EditAlumniModal';
import AlumniProfileModal from '../components/AlumniProfileModal';
import type { Database as DatabaseTypes } from '../types/supabase';
import {
  Alert, Badge, Button, Card, CardHeader, CardTitle, CardDescription,
  EmptyState, FieldLabel, Modal, PageHeader, PagerButton, Select, Skeleton,
  Table, TableWrap, TBody, TD, TH, THead, TR, Tabs, cn,
} from '../components/ui';
import type { TabItem } from '../components/ui';

type AlumnusRow = DatabaseTypes['public']['Tables']['alumni']['Row'];

type AdminTab = 'users' | 'imports' | 'duplicates' | 'verification' | 'audit';

/** Maps an import job status onto a semantic badge tone. */
const jobStatusTone = (status: string | null): 'success' | 'info' | 'danger' | 'warn' => {
  if (status === 'completed') return 'success';
  if (status === 'running') return 'info';
  if (status === 'failed') return 'danger';
  return 'warn';
};

const TableSkeleton: React.FC<{ cols: number; rows?: number }> = ({ cols, rows = 6 }) => (
  <TBody>
    {Array.from({ length: rows }).map((_, r) => (
      <TR key={r}>
        {Array.from({ length: cols }).map((_, c) => (
          <TD key={c}>
            <Skeleton className={cn('h-4', c === 0 ? 'w-36' : 'w-20')} />
          </TD>
        ))}
      </TR>
    ))}
  </TBody>
);

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: AdminTab = (searchParams.get('tab') as AdminTab) || 'users';

  const setTab = (tab: AdminTab) => {
    setSearchParams({ tab });
  };

  // ─── Self-Action Warning Modal State ──────────────────────────────────────────
  const [selfActionWarning, setSelfActionWarning] = useState<{
    targetUser: AdminUserProfile;
    intendedActive: boolean;
  } | null>(null);

  // ─── Verification Queue & Modals State ────────────────────────────────────────
  const [editingRecord, setEditingRecord] = useState<AlumnusRow | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AlumnusRow | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // ─── Tab 1: User Access Management ────────────────────────────────────────────
  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: fetchAdminUsers,
    enabled: activeTab === 'users' || activeTab === 'audit',
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string;  isActive: boolean }) =>
      updateUserProfileRoleAndStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminAudit'] });
      setSelfActionWarning(null);
    },
  });

  const handleRoleOrStatusChange = (
    targetUser: AdminUserProfile,
    
    newActive: boolean
  ) => {
    // Check if target user is currently logged-in admin
    if (targetUser.id === currentUser?.id || targetUser.email === currentUser?.email) {
      setSelfActionWarning({
        targetUser,
        
        intendedActive: newActive,
      });
      return;
    }

    updateUserMutation.mutate({
      userId: targetUser.id,
      
      isActive: newActive,
    });
  };

  // ─── Tab 2: Import History ───────────────────────────────────────────────────
  const [importStatusFilter, setImportStatusFilter] = useState<string>('all');
  const [importPage, setImportPage] = useState<number>(1);

  const {
    data: importJobsData,
    isLoading: isImportsLoading,
    refetch: refetchImports
  } = useQuery({
    queryKey: ['adminImportJobs', importStatusFilter, importPage],
    queryFn: () => fetchAdminImportJobs(importStatusFilter, importPage, 15),
    enabled: activeTab === 'imports',
  });

  const {
    data: selectedJobDetails,
    isLoading: isJobDetailsLoading
  } = useQuery({
    queryKey: ['adminImportJobDetails', selectedJobId],
    queryFn: () => fetchAdminImportJobDetails(selectedJobId!),
    enabled: Boolean(selectedJobId),
  });

  // ─── Tab 3: Duplicate Review ─────────────────────────────────────────────────
  const [duplicateStatusFilter, setDuplicateStatusFilter] = useState<string>('pending');
  const [duplicatePage, setDuplicatePage] = useState<number>(1);

  const {
    data: duplicateData,
    isLoading: isDuplicatesLoading,
    refetch: refetchDuplicates
  } = useQuery({
    queryKey: ['adminDuplicates', duplicateStatusFilter, duplicatePage],
    queryFn: () => fetchAdminDuplicateCandidates(duplicateStatusFilter, duplicatePage, 15),
    enabled: activeTab === 'duplicates',
  });

  const resolveDuplicateMutation = useMutation({
    mutationFn: ({ candidateId, resolution }: { candidateId: string; resolution: 'same_person' | 'different_people' | 'ignored' | 'pending' }) =>
      resolveDuplicateCandidate(candidateId, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDuplicates'] });
      queryClient.invalidateQueries({ queryKey: ['adminAudit'] });
    },
  });

  // ─── Tab 4: Verification Queue ───────────────────────────────────────────────
  const [verifyPage, setVerifyPage] = useState<number>(1);

  const {
    data: verifyRecordsData,
    isLoading: isVerifyLoading,
    refetch: refetchVerify
  } = useQuery({
    queryKey: ['adminVerificationQueue', verifyPage],
    queryFn: () => fetchQualityRecords('needs_verification', verifyPage, 25),
    enabled: activeTab === 'verification',
  });

  const verifyRecordMutation = useMutation({
    mutationFn: ({ recordId, confidence }: { recordId: string; confidence?: string }) =>
      markAlumnusVerified(recordId, confidence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVerificationQueue'] });
      queryClient.invalidateQueries({ queryKey: ['dataQualityMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminAudit'] });
    },
  });

  // ─── Tab 5: Operational Audit ────────────────────────────────────────────────
  const {
    data: auditSummary,
    isLoading: isAuditLoading,
    refetch: refetchAudit
  } = useQuery({
    queryKey: ['adminAudit'],
    queryFn: fetchAdminAuditSummary,
    // Enabled on every tab: it is one RPC and it powers the pending-work
    // counts shown on the tab strip.
    staleTime: 1000 * 60,
  });

  const handleRefreshCurrentTab = () => {
    switch (activeTab) {
      case 'users':
        refetchUsers();
        break;
      case 'imports':
        refetchImports();
        break;
      case 'duplicates':
        refetchDuplicates();
        break;
      case 'verification':
        refetchVerify();
        break;
      case 'audit':
        refetchAudit();
        break;
    }
  };

  /** Outstanding-work count rendered beside a tab label. */
  const tabCount = (n: number | undefined, tone: 'warn' | 'danger') =>
    n && n > 0 ? (
      <Badge tone={tone} className="ml-1.5">
        {n.toLocaleString()}
      </Badge>
    ) : null;

  const tabs: TabItem<AdminTab>[] = [
    { id: 'users', label: 'User Access', icon: <Users size={15} /> },
    { id: 'imports', label: 'Import History', icon: <Upload size={15} /> },
    {
      id: 'duplicates',
      label: (
        <span className="flex items-center">
          Duplicate Review
          {tabCount(auditSummary?.pending_duplicates, 'warn')}
        </span>
      ),
      icon: <Copy size={15} />,
    },
    {
      id: 'verification',
      label: (
        <span className="flex items-center">
          Verification Queue
          {tabCount(auditSummary?.unverified_alumni, 'danger')}
        </span>
      ),
      icon: <ShieldAlert size={15} />,
    },
    { id: 'audit', label: 'System Activity', icon: <Activity size={15} /> },
  ];

  const auditTiles = [
    {
      label: 'Total Staff Accounts',
      value: auditSummary?.total_users ?? users.length,
      hint: `${auditSummary?.admin_users ?? 0} Admins`,
      icon: <Users size={20} />,
      tone: 'bg-accent-soft text-accent',
    },
    {
      label: 'Import Sessions',
      value: auditSummary?.total_import_jobs ?? 0,
      hint: `${auditSummary?.completed_import_jobs ?? 0} Completed`,
      icon: <Upload size={20} />,
      tone: 'bg-info-soft text-info',
    },
    {
      label: 'Duplicate Queue',
      value: auditSummary?.total_duplicates ?? 0,
      hint: `${auditSummary?.pending_duplicates ?? 0} Pending Review`,
      icon: <Copy size={20} />,
      tone: 'bg-warn-soft text-warn',
    },
    {
      label: 'Verified Alumni',
      value: auditSummary?.verified_alumni ?? 0,
      hint: `${auditSummary?.unverified_alumni ?? 0} Needs Verification`,
      icon: <ShieldCheck size={20} />,
      tone: 'bg-success-soft text-success',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        eyebrow="Administration"
        title="Institutional Administration"
        description="Access control, ingest review, duplicate management, and governance queue."
        actions={
          <>
            <Badge tone="accent" dot className="hidden sm:inline-flex">
              Admin Authorized
            </Badge>
            <Button onClick={handleRefreshCurrentTab} icon={<RefreshCw size={14} />}>
              Refresh
            </Button>
          </>
        }
      />

      <Tabs tabs={tabs} value={activeTab} onChange={setTab} layoutId="admin-tabs" />

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: USER ACCESS MANAGEMENT                                          */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <Alert tone="info" icon={<Info size={17} />} title="User Role & Account Access Governance">
            Authorized staff accounts are maintained in <code>public.profiles</code>. Admins can
            activate/deactivate administrator accounts. Self-deactivation is
            protected by confirmation prompts.
          </Alert>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Authorized Platform Staff ({users.length})</CardTitle>
            </CardHeader>

            {isUsersError ? (
              <EmptyState
                className="py-14"
                icon={<AlertTriangle size={22} className="text-danger" />}
                title="Failed to load user profiles"
                action={<Button onClick={() => refetchUsers()}>Retry</Button>}
              />
            ) : !isUsersLoading && users.length === 0 ? (
              <EmptyState className="py-14" icon={<Users size={22} />} title="No user profiles found" />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Staff Member</TH>
                      <TH>Assigned Role</TH>
                      <TH>Account Status</TH>
                      <TH>Created</TH>
                      <TH align="right">Access Controls</TH>
                    </tr>
                  </THead>
                  {isUsersLoading ? (
                    <TableSkeleton cols={5} />
                  ) : (
                    <TBody>
                      {users.map((u) => {
                        const isSelf = u.id === currentUser?.id || u.email === currentUser?.email;
                        return (
                          <TR key={u.id} className="hover:bg-surface-hover">
                            <TD>
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">
                                  {u.full_name?.charAt(0) || u.email?.charAt(0) || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink">
                                    {u.full_name || 'Unnamed Staff'}
                                    {isSelf && <Badge tone="neutral">You</Badge>}
                                  </p>
                                  <p className="truncate text-2xs text-ink-muted">{u.email}</p>
                                </div>
                              </div>
                            </TD>
                            <TD>
                              <Badge tone={u.role === 'admin' ? 'accent' : 'info'}>
                                Administrator
                              </Badge>
                            </TD>
                            <TD>
                              <Badge tone={u.is_active ? 'success' : 'danger'} dot>
                                {u.is_active ? 'Active' : 'Deactivated'}
                              </Badge>
                            </TD>
                            <TD className="text-xs whitespace-nowrap text-ink-muted">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                            </TD>
                            <TD>
                              <div className="flex items-center justify-end gap-2">
                                <span>Administrator</span>

                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleRoleOrStatusChange(u, !u.is_active)
                                  }
                                  className={cn(
                                    u.is_active
                                      ? 'hover:bg-danger-soft hover:text-danger-ink'
                                      : 'bg-success-soft text-success-ink',
                                  )}
                                >
                                  {u.is_active ? 'Deactivate' : 'Activate'}
                                </Button>
                              </div>
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  )}
                </Table>
              </TableWrap>
            )}
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: IMPORT HISTORY & JOB DETAILS                                    */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'imports' && (
        <div className="space-y-4">
          <Card className="p-3.5">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <FieldLabel htmlFor="import-status" className="mb-0">
                  Filter Status
                </FieldLabel>
                <Select
                  id="import-status"
                  value={importStatusFilter}
                  onChange={(e) => {
                    setImportStatusFilter(e.target.value);
                    setImportPage(1);
                  }}
                  className="h-8 w-auto text-xs"
                >
                  <option value="all">All Ingestion Jobs</option>
                  <option value="completed">Completed</option>
                  <option value="running">Running</option>
                  <option value="ready">Ready</option>
                  <option value="validating">Validating</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
              <div className="tnum text-xs text-ink-muted">
                Total Ingestion Logs: {importJobsData?.totalCount ?? 0}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {!isImportsLoading && (!importJobsData?.jobs || importJobsData.jobs.length === 0) ? (
              <EmptyState
                className="py-16"
                icon={<Database size={22} />}
                title="No Import Jobs Found"
                description="Historical ingest workbooks and batch processing sessions will appear here with full execution summaries."
              />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Workbook File</TH>
                      <TH>Mode</TH>
                      <TH>Status</TH>
                      <TH>Valid / Total</TH>
                      <TH>Errors / Dupes</TH>
                      <TH>Uploaded By</TH>
                      <TH>Created At</TH>
                      <TH align="right">Details</TH>
                    </tr>
                  </THead>
                  {isImportsLoading ? (
                    <TableSkeleton cols={8} />
                  ) : (
                    <TBody>
                      {importJobsData!.jobs.map((job) => (
                        <TR key={job.id} className="hover:bg-surface-hover">
                          <TD className="text-[0.8125rem] font-medium text-ink">{job.filename}</TD>
                          <TD className="text-2xs font-semibold text-ink-muted uppercase">
                            {job.mode || 'standard'}
                          </TD>
                          <TD>
                            <Badge
                              tone={jobStatusTone(job.status)}
                              className={cn(job.status === 'running' && 'animate-pulse')}
                            >
                              {job.status}
                            </Badge>
                          </TD>
                          <TD className="tnum text-xs text-ink-secondary">
                            {job.valid_rows ?? 0} / {job.total_rows ?? 0}
                          </TD>
                          <TD className="text-xs">
                            {(job.error_rows ?? 0) > 0 && (
                              <span className="mr-2 font-semibold text-danger">
                                {job.error_rows} errors
                              </span>
                            )}
                            {(job.duplicate_rows ?? 0) > 0 && (
                              <span className="font-semibold text-warn">
                                {job.duplicate_rows} dupes
                              </span>
                            )}
                            {(job.error_rows ?? 0) === 0 && (job.duplicate_rows ?? 0) === 0 && (
                              <span className="text-success">Clean</span>
                            )}
                          </TD>
                          <TD className="text-xs text-ink-muted">
                            {job.uploaded_by_name || job.uploaded_by_email || 'System Admin'}
                          </TD>
                          <TD className="text-xs whitespace-nowrap text-ink-muted">
                            {job.created_at ? new Date(job.created_at).toLocaleString() : '—'}
                          </TD>
                          <TD className="text-right">
                            <Button
                              size="sm"
                              onClick={() => setSelectedJobId(job.id)}
                              icon={<Eye size={13} />}
                              className="bg-accent-soft text-accent-ink"
                            >
                              Inspect
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  )}
                </Table>
              </TableWrap>
            )}
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: DUPLICATE CANDIDATE REVIEW                                      */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          <Card className="p-3.5">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <FieldLabel htmlFor="dup-status" className="mb-0">
                  Resolution Filter
                </FieldLabel>
                <Select
                  id="dup-status"
                  value={duplicateStatusFilter}
                  onChange={(e) => {
                    setDuplicateStatusFilter(e.target.value);
                    setDuplicatePage(1);
                  }}
                  className="h-8 w-auto text-xs"
                >
                  <option value="pending">Pending Review</option>
                  <option value="same_person">Resolved: Same Person</option>
                  <option value="different_people">Resolved: Different People</option>
                  <option value="ignored">Ignored</option>
                  <option value="all">All Candidates</option>
                </Select>
              </div>
              <div className="tnum text-xs text-ink-muted">
                Total Matches: {duplicateData?.totalCount ?? 0}
              </div>
            </div>
          </Card>

          <Alert tone="warn" title="Non-Destructive Governance">
            Resolving candidate duplicates flags review status without executing destructive merges
            or unverified data overwrites.
          </Alert>

          <Card className="overflow-hidden">
            {isDuplicatesLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink-muted">
                <RefreshCw size={18} className="animate-spin" /> Loading duplicate candidates…
              </div>
            ) : !duplicateData?.candidates || duplicateData.candidates.length === 0 ? (
              <EmptyState
                className="py-16"
                icon={<CheckCircle2 size={22} className="text-success" />}
                title="No Duplicates In Queue"
                description="All staged records are deduplicated or no match candidates match the current filter."
              />
            ) : (
              <div className="divide-y divide-line">
                {duplicateData.candidates.map((cand) => (
                  <div key={cand.id} className="p-4 transition-colors hover:bg-surface-hover">
                    <div className="mb-3 flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.8125rem] font-semibold text-ink">
                          Candidate Review #{cand.id.substring(0, 8)}
                        </span>
                        <Badge tone="accent">
                          Score: {Number(cand.match_score ?? 0).toFixed(1)}%
                        </Badge>
                        <Badge
                          tone={
                            cand.status === 'pending' ? 'warn'
                              : cand.status === 'same_person' ? 'info'
                              : 'neutral'
                          }
                        >
                          {cand.status}
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            resolveDuplicateMutation.mutate({
                              candidateId: cand.id,
                              resolution: 'same_person',
                            })
                          }
                          className="bg-info-soft text-info-ink"
                        >
                          Same Person
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            resolveDuplicateMutation.mutate({
                              candidateId: cand.id,
                              resolution: 'different_people',
                            })
                          }
                          className="bg-success-soft text-success-ink"
                        >
                          Different People
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            resolveDuplicateMutation.mutate({
                              candidateId: cand.id,
                              resolution: 'ignored',
                            })
                          }
                        >
                          Ignore
                        </Button>
                        {cand.status !== 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              resolveDuplicateMutation.mutate({
                                candidateId: cand.id,
                                resolution: 'pending',
                              })
                            }
                            title="Reset to pending"
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Comparison Grid: Candidate Preview vs Canonical Record */}
                    <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {/* Candidate (Staged / Incoming) */}
                      <div className="rounded-xl border border-warn/25 bg-warn-soft p-3">
                        <div className="mb-2 flex items-center justify-between text-2xs font-semibold tracking-wide text-warn-ink uppercase">
                          <span>Incoming / Candidate Preview</span>
                          <span className="font-normal opacity-80">Staged Entry</span>
                        </div>
                        <p className="text-[0.8125rem] font-semibold text-ink">
                          {cand.candidate_name || '—'}
                        </p>
                        <div className="mt-1 space-y-0.5 text-xs text-ink-secondary">
                          <p>
                            <span className="text-ink-faint">Company:</span> {cand.candidate_company || '—'}
                            {cand.candidate_designation ? ` (${cand.candidate_designation})` : ''}
                          </p>
                          <p>
                            <span className="text-ink-faint">Email:</span> {cand.candidate_email || '—'}
                          </p>
                          <p>
                            <span className="text-ink-faint">Mobile:</span> {cand.candidate_mobile || '—'}
                          </p>
                          <p>
                            <span className="text-ink-faint">Academic:</span> {cand.candidate_academic_branch || '—'}
                            {cand.candidate_leaving_year ? ` (Class of ${cand.candidate_leaving_year})` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Canonical Match (Existing) */}
                      <div className="rounded-xl border border-info/25 bg-info-soft p-3">
                        <div className="mb-2 flex items-center justify-between text-2xs font-semibold tracking-wide text-info-ink uppercase">
                          <span>Existing Canonical Alumnus</span>
                          <span className="font-normal opacity-80">Database Match</span>
                        </div>
                        <p className="text-[0.8125rem] font-semibold text-ink">
                          {cand.existing_alumni_name || '—'}
                        </p>
                        <div className="mt-1 space-y-0.5 text-xs text-ink-secondary">
                          <p>
                            <span className="text-ink-faint">Company:</span> {cand.existing_alumni_company || '—'}
                            {cand.existing_alumni_designation ? ` (${cand.existing_alumni_designation})` : ''}
                          </p>
                          <p>
                            <span className="text-ink-faint">Email:</span> {cand.existing_alumni_email || '—'}
                          </p>
                          <p>
                            <span className="text-ink-faint">Mobile:</span> {cand.existing_alumni_mobile || '—'}
                          </p>
                          <p>
                            <span className="text-ink-faint">Academic:</span> {cand.existing_alumni_branch || '—'}
                            {cand.existing_alumni_leaving_year ? ` (Class of ${cand.existing_alumni_leaving_year})` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {cand.match_reason && (
                      <div className="rounded-lg bg-surface-sunken p-2.5 text-2xs text-ink-muted">
                        <span className="mr-1 font-semibold text-ink-secondary">Match Reason:</span>
                        <span>
                          {typeof cand.match_reason === 'object'
                            ? JSON.stringify(cand.match_reason)
                            : String(cand.match_reason)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: VERIFICATION QUEUE                                              */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-[0.8125rem] font-semibold text-ink">
                  Alumni Records Requiring Verification ({verifyRecordsData?.totalCount ?? 0})
                </h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Staff can inspect, edit attributes, and mark records as verified directly from this queue.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="tnum text-xs text-ink-muted">Page {verifyPage}</span>
                <PagerButton
                  disabled={verifyPage <= 1}
                  onClick={() => setVerifyPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </PagerButton>
                <PagerButton
                  disabled={!verifyRecordsData?.records || verifyRecordsData.records.length < 25}
                  onClick={() => setVerifyPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </PagerButton>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {!isVerifyLoading && (!verifyRecordsData?.records || verifyRecordsData.records.length === 0) ? (
              <EmptyState
                className="py-16"
                icon={<CheckCircle2 size={22} className="text-success" />}
                title="Verification Queue Empty"
                description="All alumni records are verified!"
              />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Alumnus Name</TH>
                      <TH>Company &amp; Role</TH>
                      <TH>Academic Branch</TH>
                      <TH>Contact Info</TH>
                      <TH align="right">Actions</TH>
                    </tr>
                  </THead>
                  {isVerifyLoading ? (
                    <TableSkeleton cols={5} />
                  ) : (
                    <TBody>
                      {verifyRecordsData!.records.map((rec) => (
                        <TR key={rec.id} className="hover:bg-surface-hover">
                          <TD>
                            <button
                              onClick={() => setViewingRecord(rec as any)}
                              className="inline-flex min-h-6 min-w-6 items-center text-left text-[0.8125rem] font-semibold text-accent-ink hover:underline"
                            >
                              {rec.name}
                            </button>
                            {rec.primary_category && (
                              <Badge tone="neutral" className="ml-2">
                                {rec.primary_category}
                              </Badge>
                            )}
                          </TD>
                          <TD>
                            <p className="text-xs font-medium text-ink-secondary">{rec.current_company || '—'}</p>
                            <p className="text-2xs text-ink-muted">{rec.current_designation || '—'}</p>
                          </TD>
                          <TD>
                            <p className="text-xs text-ink-secondary">{rec.academic_branch || '—'}</p>
                            <p className="tnum text-2xs text-ink-muted">Class of {rec.leaving_year || '—'}</p>
                          </TD>
                          <TD>
                            <p className="text-xs text-ink-muted">{rec.email || 'No email'}</p>
                            <p className="text-2xs text-ink-faint">{rec.mobile || 'No mobile'}</p>
                          </TD>
                          <TD>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => setEditingRecord(rec as any)}
                                icon={<Edit3 size={13} />}
                                title="Edit Record"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  verifyRecordMutation.mutate({
                                    recordId: rec.id,
                                    confidence: 'high',
                                  })
                                }
                                icon={<Check size={13} />}
                                title="Mark as Verified"
                                className="bg-success-soft text-success-ink"
                              >
                                Verify
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  )}
                </Table>
              </TableWrap>
            )}
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: SYSTEM ACTIVITY & OPERATIONAL AUDIT                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {auditTiles.map((tile) => (
              <Card key={tile.label} spotlight className="h-full">
                <div className="relative flex h-full items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-2xs font-medium tracking-wide text-ink-muted uppercase">
                      {tile.label}
                    </p>
                    <div className="figure mt-1.5 text-2xl font-semibold leading-none text-ink">
                      {isAuditLoading ? <Skeleton className="h-7 w-14" /> : tile.value}
                    </div>
                    <p className="mt-1.5 truncate text-2xs text-ink-faint">{tile.hint}</p>
                  </div>
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      tile.tone,
                    )}
                  >
                    {tile.icon}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Phase 10 Roadmap Note */}
          <Alert tone="info" icon={<Clock size={17} />} title="Audit Logging Architecture Note">
            Institutional audit metrics are aggregated in real time from <code>import_jobs</code>,{' '}
            <code>duplicate_candidates</code>, <code>profiles</code>, and{' '}
            <code>alumni.last_verified_at</code>. Generic row-level change-log triggers for alumni
            field modifications are slated for Phase 10 hardening.
          </Alert>

          {/* Recent Verifications */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Recent Verification Activity</CardTitle>
                <CardDescription>Latest records marked verified by staff.</CardDescription>
              </div>
            </CardHeader>

            {!isAuditLoading &&
            (!auditSummary?.recent_verifications || auditSummary.recent_verifications.length === 0) ? (
              <EmptyState
                className="py-14"
                icon={<Activity size={22} />}
                title="No recent verifications recorded"
              />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Alumnus</TH>
                      <TH>Company</TH>
                      <TH>Branch &amp; Batch</TH>
                      <TH>Verified Date</TH>
                      <TH align="right">Confidence</TH>
                    </tr>
                  </THead>
                  {isAuditLoading ? (
                    <TableSkeleton cols={5} rows={4} />
                  ) : (
                    <TBody>
                      {auditSummary!.recent_verifications.map((v) => (
                        <TR key={v.id} className="hover:bg-surface-hover">
                          <TD className="text-[0.8125rem] font-medium text-ink">{v.name}</TD>
                          <TD className="text-xs text-ink-secondary">{v.current_company || '—'}</TD>
                          <TD className="text-xs text-ink-secondary">
                            {v.academic_branch || '—'} ({v.leaving_year || '—'})
                          </TD>
                          <TD className="text-xs whitespace-nowrap text-ink-muted">
                            {v.last_verified_at ? new Date(v.last_verified_at).toLocaleString() : '—'}
                          </TD>
                          <TD className="text-right">
                            <Badge tone="success">{v.data_confidence || 'verified'}</Badge>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  )}
                </Table>
              </TableWrap>
            )}
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: SELF-ACTION ESCALATION / DEACTIVATION WARNING                   */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(selfActionWarning)}
        onClose={() => setSelfActionWarning(null)}
        size="sm"
        title={
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warn-soft text-warn">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-ink">Self-Modification Confirmation</h3>
              <p className="mt-0.5 text-xs text-ink-muted">
                You are changing your own administrative account privileges.
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => setSelfActionWarning(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() =>
                selfActionWarning &&
                updateUserMutation.mutate({
                  userId: selfActionWarning.targetUser.id,
                  
                  isActive: selfActionWarning.intendedActive,
                })
              }
            >
              Confirm Modification
            </Button>
          </div>
        }
      >
        {selfActionWarning && (
          <div className="p-5">
            <div className="space-y-1.5 rounded-xl border border-warn/25 bg-warn-soft p-3.5 text-xs text-warn-ink">
              <p>
                
              </p>
              <p>
                <strong>Intended Status:</strong>{' '}
                {selfActionWarning.intendedActive ? 'Active' : 'Deactivated'}
              </p>
              {(!selfActionWarning.intendedActive) && (
                <p className="pt-1 font-semibold text-danger-ink">
                  ⚠️ Warning: Demoting or deactivating your account will immediately revoke your
                  administrator privileges.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: IMPORT JOB DETAILS                                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(selectedJobId)}
        onClose={() => setSelectedJobId(null)}
        size="md"
        title={<h3 className="text-base font-semibold text-ink">Import Job Details</h3>}
        subtitle={selectedJobDetails?.job.filename}
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setSelectedJobId(null)}>Close</Button>
          </div>
        }
      >
        <div className="p-5">
          {isJobDetailsLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-muted">
              <RefreshCw size={17} className="animate-spin" /> Loading details…
            </div>
          ) : selectedJobDetails ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-sunken p-3.5 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-ink-muted">Status:</span>{' '}
                  <span className="font-semibold text-ink">{selectedJobDetails.job.status}</span>
                </div>
                <div>
                  <span className="text-ink-muted">Mode:</span>{' '}
                  <span className="font-semibold text-ink uppercase">
                    {selectedJobDetails.job.mode || 'standard'}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted">Total Rows:</span>{' '}
                  <span className="tnum font-semibold text-ink">
                    {selectedJobDetails.job.total_rows ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted">Valid / Invalid:</span>{' '}
                  <span className="tnum font-semibold text-success">
                    {selectedJobDetails.job.valid_rows ?? 0}
                  </span>
                  {' / '}
                  <span className="tnum font-semibold text-danger">
                    {selectedJobDetails.job.invalid_rows ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted">Uploaded By:</span>{' '}
                  <span className="font-semibold text-ink">
                    {selectedJobDetails.job.uploaded_by_name || selectedJobDetails.job.uploaded_by_email || 'Admin'}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted">Created:</span>{' '}
                  <span className="font-semibold text-ink">
                    {selectedJobDetails.job.created_at
                      ? new Date(selectedJobDetails.job.created_at).toLocaleString()
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Error Log */}
              <div>
                <h4 className="mb-2 text-[0.8125rem] font-semibold text-ink">
                  Import Error Log ({selectedJobDetails.errors.length})
                </h4>
                {selectedJobDetails.errors.length === 0 ? (
                  <p className="text-xs italic text-ink-muted">No errors logged for this job.</p>
                ) : (
                  <div className="scroll-slim max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                    {selectedJobDetails.errors.map((err) => (
                      <div key={err.id} className="p-2.5 text-xs transition-colors hover:bg-surface-hover">
                        <span className="mr-2 font-mono text-danger">Row {err.row_number ?? '—'}:</span>
                        <span className="text-ink-secondary">{err.message}</span>
                        {err.field_name && (
                          <span className="ml-2 text-ink-faint">({err.field_name})</span>
                        )}
                        {err.error_code && (
                          <span className="ml-2 font-mono text-2xs text-ink-faint">[{err.error_code}]</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* PROFILE & EDIT MODALS                                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {viewingRecord && (
        <AlumniProfileModal
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onEdit={() => {
            const rec = viewingRecord;
            setViewingRecord(null);
            setEditingRecord(rec);
          }}
          onVerified={() => {
            queryClient.invalidateQueries({ queryKey: ['adminVerificationQueue'] });
          }}
        />
      )}

      {editingRecord && (
        <EditAlumniModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={() => {
            setEditingRecord(null);
            queryClient.invalidateQueries({ queryKey: ['adminVerificationQueue'] });
          }}
        />
      )}
    </div>
  );
};

export default Admin;






