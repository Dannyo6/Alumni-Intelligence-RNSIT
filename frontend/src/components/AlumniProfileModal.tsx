import React, { useState } from 'react';
import {
  Edit2, ExternalLink, Mail, Phone, MapPin, Building, GraduationCap,
  Briefcase, ShieldAlert, Tag, BookOpen, Award, ShieldCheck, Database as DbIcon,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { markAlumnusVerified, type AlumnusRow } from '../services/directoryService';
import { Badge, Button, Drawer, Select, cn } from './ui';

interface AlumniProfileModalProps {
  record: AlumnusRow | null;
  onClose: () => void;
  onEdit: () => void;
  onVerified?: (updatedRecord: AlumnusRow) => void;
}

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
  isLink?: boolean;
}

const ProfileField: React.FC<FieldProps> = ({ icon, label, value, isLink = false }) => (
  <div className="flex items-start gap-3 rounded-lg border border-line bg-surface-sunken p-3 transition-colors hover:border-line-strong">
    <div className="mt-0.5 shrink-0 text-ink-faint">{icon}</div>
    <div className="min-w-0 flex-1">
      <div className="font-mono text-2xs font-semibold tracking-wide text-ink-muted uppercase">
        {label}
      </div>
      <div className="mt-1 text-[0.8125rem] font-medium break-words text-ink">
        {value !== null && value !== undefined && String(value).trim() !== '' ? (
          isLink ? (
            <a
              href={String(value).startsWith('http') ? String(value) : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent-ink hover:underline"
            >
              <span className="truncate">{String(value)}</span>
              <ExternalLink size={12} className="shrink-0" />
            </a>
          ) : (
            String(value)
          )
        ) : (
          <span className="font-normal text-ink-faint">—</span>
        )}
      </div>
    </div>
  </div>
);

/** Sections rise in sequence so the panel resolves top-down rather than all at once. */
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  index: number;
  children: React.ReactNode;
}> = ({ icon, title, index, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28, delay: Math.min(index * 0.045, 0.3), ease: [0.22, 1, 0.36, 1] }}
  >
    <h3 className="flex items-center gap-2 border-b border-line pb-2 font-mono text-2xs font-semibold tracking-[0.1em] text-ink uppercase">
      <span className="text-accent">{icon}</span>
      {title}
    </h3>
    <div className="mt-3">{children}</div>
  </motion.section>
);

const MetaTile: React.FC<{ label: string; value: React.ReactNode; title?: string }> = ({
  label,
  value,
  title,
}) => (
  <div className="rounded-lg border border-line bg-surface-sunken p-2.5">
    <div className="font-mono text-2xs font-semibold tracking-wide text-ink-muted uppercase">
      {label}
    </div>
    <div className="mt-0.5 truncate text-xs font-medium text-ink" title={title}>
      {value}
    </div>
  </div>
);

const AlumniProfileModal: React.FC<AlumniProfileModalProps> = ({
  record,
  onClose,
  onEdit,
  onVerified,
}) => {
  const { isAdmin } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [selectedConfidence, setSelectedConfidence] = useState<string>(record?.data_confidence || 'High');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (!record) return null;

  const handleMarkVerified = async () => {
    if (!record.id) return;
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const updated = await markAlumnusVerified(record.id, selectedConfidence);
      setShowVerifyConfirm(false);
      if (onVerified) {
        onVerified(updated);
      }
    } catch (err: any) {
      console.error('Failed to mark verified:', err);
      setVerifyError(err.message || 'Failed to update verification status');
    } finally {
      setIsVerifying(false);
    }
  };

  const initials = record.name
    ?.split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || '?';

  const title = (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold',
          record.is_high_value
            ? 'bg-signal-soft text-signal-ink ring-1 ring-signal/30'
            : 'bg-accent-soft text-accent-ink ring-1 ring-accent/20',
        )}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold tracking-tight text-ink">{record.name}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {record.primary_category && <Badge tone="accent">{record.primary_category}</Badge>}
          {record.value_score !== null && record.value_score !== undefined && (
            <Badge tone="warn">
              <Award size={11} /> {record.value_score}
            </Badge>
          )}
          {record.needs_verification ? (
            <Badge tone="danger">
              <ShieldAlert size={11} /> Unverified
            </Badge>
          ) : (
            <Badge tone="success">
              <ShieldCheck size={11} /> Verified
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  const headerActions = isAdmin ? (
    <Button size="sm" onClick={onEdit} icon={<Edit2 size={14} />}>
      Edit
    </Button>
  ) : null;

  const verifyBanner = showVerifyConfirm ? (
    <div className="shrink-0 border-b border-success/25 bg-success-soft px-5 py-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" />
          <div>
            <p className="text-xs font-semibold text-success-ink">Confirm Record Verification</p>
            <p className="mt-0.5 text-xs text-success-ink opacity-80">
              Set verification status to verified and timestamp with current time.
            </p>
            {verifyError && <p className="mt-1 text-xs text-danger-ink">{verifyError}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedConfidence}
            onChange={(e) => setSelectedConfidence(e.target.value)}
            className="h-8 w-auto text-xs"
          >
            <option value="High">High Confidence</option>
            <option value="Standard">Standard Confidence</option>
            <option value="Unverified">Unverified</option>
          </Select>
          <Button size="sm" onClick={() => setShowVerifyConfirm(false)} disabled={isVerifying}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleMarkVerified}
            disabled={isVerifying}
            className="bg-success hover:brightness-110"
          >
            {isVerifying ? 'Verifying…' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const classifications: { show: boolean; tone: 'accent' | 'warn' | 'success' | 'info' | 'danger'; label: React.ReactNode }[] = [
    { show: Boolean(record.primary_category), tone: 'accent', label: record.primary_category },
    { show: Boolean(record.is_high_value), tone: 'warn', label: 'High Value' },
    { show: Boolean(record.is_global), tone: 'success', label: 'Global Alumni' },
    { show: Boolean(record.is_top_employer), tone: 'accent', label: 'Top Employer' },
    { show: Boolean(record.is_student_or_rnsit), tone: 'info', label: 'Student / RNSIT' },
    {
      show: Boolean(record.needs_verification),
      tone: 'danger',
      label: (
        <>
          <ShieldAlert size={11} /> Needs Verification
        </>
      ),
    },
  ];

  const branch = record.academic_branch || record.branch_or_designation_raw;
  const role = [record.current_designation, record.current_company].filter(Boolean).join(' at ');
  const place = [record.city, record.country].filter(Boolean).join(', ');

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={title}
      headerActions={headerActions}
      banner={verifyBanner}
      footer={
        isAdmin && record.needs_verification && !showVerifyConfirm ? (
          <Button
            size="sm"
            onClick={() => setShowVerifyConfirm(true)}
            icon={<ShieldCheck size={14} />}
            className="w-full bg-success-soft text-success-ink sm:w-auto"
          >
            Mark Verified
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6 p-5">
        {/* Trajectory — the through-line from RNSIT cohort to current post.
            This is the one view that connects academic history to career. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-xl border border-line bg-surface-sunken p-4"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 ring-1 ring-line">
              <GraduationCap size={13} className="shrink-0 text-accent" />
              <span className="font-medium text-ink">{branch || 'Branch unknown'}</span>
            </span>
            <ChevronRight size={13} className="shrink-0 text-ink-faint" />
            <span className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 font-mono ring-1 ring-line">
              <span className="text-ink">{record.joining_year ?? '—'}</span>
              <span className="text-ink-faint">→</span>
              <span className="text-ink">{record.leaving_year ?? '—'}</span>
            </span>
            <ChevronRight size={13} className="shrink-0 text-ink-faint" />
            <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 ring-1 ring-line">
              <Briefcase size={13} className="shrink-0 text-signal" />
              <span className="truncate font-medium text-ink">{role || 'No current role on file'}</span>
            </span>
          </div>
          {place && (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink-muted">
              <MapPin size={12} className="shrink-0" />
              {place}
            </p>
          )}
        </motion.div>

        <Section icon={<Briefcase size={13} />} title="Professional" index={1}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProfileField icon={<Building size={15} />} label="Current Company" value={record.current_company} />
            <ProfileField icon={<Briefcase size={15} />} label="Current Designation" value={record.current_designation} />
            <ProfileField icon={<Tag size={15} />} label="Sector" value={record.company_sector} />
          </div>
        </Section>

        <Section icon={<MapPin size={13} />} title="Location" index={2}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProfileField icon={<MapPin size={15} />} label="City" value={record.city} />
            <ProfileField icon={<MapPin size={15} />} label="Country" value={record.country} />
          </div>
        </Section>

        <Section icon={<GraduationCap size={13} />} title="RNSIT Academic Details" index={3}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProfileField icon={<GraduationCap size={15} />} label="Academic Branch" value={record.academic_branch} />
            <ProfileField icon={<GraduationCap size={15} />} label="Raw Branch / Designation" value={record.branch_or_designation_raw} />
            <ProfileField icon={<Tag size={15} />} label="RNSIT Role" value={record.rnsit_role} />
            <ProfileField icon={<GraduationCap size={15} />} label="Joining Year" value={record.joining_year} />
            <ProfileField icon={<GraduationCap size={15} />} label="Leaving Year" value={record.leaving_year} />
          </div>
        </Section>

        <Section icon={<Mail size={13} />} title="Contact Information" index={4}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProfileField icon={<Mail size={15} />} label="Primary Email" value={record.email} />
            <ProfileField
              icon={<Mail size={15} />}
              label="Alternate Emails"
              value={record.alternate_emails && record.alternate_emails.length > 0 ? record.alternate_emails.join(', ') : null}
            />
            <ProfileField icon={<Phone size={15} />} label="Mobile" value={record.mobile} />
          </div>
        </Section>

        <Section icon={<ExternalLink size={13} />} title="Links" index={5}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: 'Profile Link', value: record.profile_link },
              { label: 'LinkedIn', value: record.linkedin_url }
            ].map((link, i) => (
              <div key={i} className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface-sunken p-2.5 transition-colors hover:border-line-strong">
                <span className="font-mono text-2xs font-semibold tracking-wide text-ink-muted uppercase">
                  {link.label}
                </span>
                {link.value ? (
                  <a
                    href={link.value.startsWith('http') ? link.value : `https://${link.value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.value}
                    className="group flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-medium text-accent-ink hover:underline"
                  >
                    <span className="truncate">{link.value}</span>
                    <ExternalLink size={12} className="shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
                  </a>
                ) : (
                  <span className="text-[0.8125rem] italic text-ink-faint">Not provided</span>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<Award size={13} />} title="Classification" index={6}>
          <div className="flex flex-wrap gap-2">
            {classifications
              .filter((c) => c.show)
              .map((c, i) => (
                <Badge key={i} tone={c.tone} className="px-2.5 py-1">
                  {c.label}
                </Badge>
              ))}
          </div>
        </Section>

        {record.notes && (
          <Section icon={<BookOpen size={13} />} title="Notes" index={7}>
            <p className="rounded-lg border border-line bg-surface-sunken p-3 text-xs leading-relaxed whitespace-pre-line text-ink-secondary">
              {record.notes}
            </p>
          </Section>
        )}

        <Section icon={<DbIcon size={13} />} title="Metadata" index={8}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetaTile label="Data Confidence" value={record.data_confidence || 'Standard'} />
            <MetaTile
              label="Last Verified"
              value={record.last_verified_at ? new Date(record.last_verified_at).toLocaleDateString() : 'Never'}
            />
            <MetaTile
              label="Updated At"
              value={record.updated_at ? new Date(record.updated_at).toLocaleDateString() : '—'}
            />
            <MetaTile
              label="Source Workbook"
              value={record.source_workbook || '—'}
              title={record.source_workbook || ''}
            />
            <MetaTile
              label="Source Sheet"
              value={record.source_sheet || '—'}
              title={record.source_sheet || ''}
            />
            <MetaTile label="Record Status" value={<span className="capitalize">{record.status || 'Active'}</span>} />
          </div>
        </Section>
      </div>
    </Drawer>
  );
};

export default AlumniProfileModal;

