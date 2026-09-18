import React, { useState, useEffect } from 'react';
import { Save, UserX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveAlumnusRecord, type AlumnusRow } from '../services/directoryService';
import {
  Alert, Button, Checkbox, FieldLabel, Input, Modal, Select, Textarea,
} from './ui';

interface EditAlumniModalProps {
  record: Partial<AlumnusRow> | null;
  onClose: () => void;
  onSave: (updatedRecord: AlumnusRow) => void;
}

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section>
    <h3 className="border-b border-line pb-2 text-2xs font-semibold tracking-wide text-ink uppercase">
      {title}
    </h3>
    <div className="mt-3">{children}</div>
  </section>
);

const EditAlumniModal: React.FC<EditAlumniModalProps> = ({ record, onClose, onSave }) => {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState<Partial<AlumnusRow>>(() => ({ ...(record ?? {}) }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setFormData({ ...record });
    }
  }, [record]);

  // Access control check: Viewer must never edit
  if (!isAdmin) {
    return (
      <Modal open onClose={onClose} size="sm">
        <div className="px-6 py-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <UserX size={22} />
          </div>
          <h3 className="text-base font-semibold text-ink">Access Denied</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">
            Administrator privileges are required to create or edit alumni records.
          </p>
          <Button className="mt-6" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  if (!record) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value, type } = target;
    const checked = (target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!formData.name || !formData.name.trim()) {
        throw new Error('Full Name is required');
      }

      const saved = await saveAlumnusRecord(record?.id, formData);
      onSave(saved);
    } catch (err: any) {
      console.error('Failed to save record:', err);
      setError(err.message || 'Failed to save alumnus record');
    } finally {
      setIsSaving(false);
    }
  };

  const flags: { name: string; label: string }[] = [
    { name: 'is_high_value', label: 'High Value Alumni' },
    { name: 'is_global', label: 'Global Spread' },
    { name: 'is_top_employer', label: 'Top Employer' },
    { name: 'is_student_or_rnsit', label: 'Student / RNSIT' },
    { name: 'needs_verification', label: 'Needs Verification' },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
          {record?.id ? 'Edit Alumni Record' : 'Add New Alumnus'}
        </h2>
      }
      subtitle={
        record?.id
          ? `Updating canonical record #${record.id.slice(0, 8)}`
          : 'Create a new alumnus entry in Schema v1'
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-alumni-form"
            variant="primary"
            disabled={isSaving}
            icon={<Save size={14} />}
          >
            {isSaving ? 'Saving Changes…' : 'Save Alumnus'}
          </Button>
        </div>
      }
    >
      <form id="edit-alumni-form" onSubmit={handleSave} className="space-y-6 p-5">
        {error && <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>}

        <FormSection title="Identity & Contact">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="f-name">Full Name *</FieldLabel>
              <Input
                id="f-name"
                required
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-email">Primary Email</FieldLabel>
              <Input
                id="f-email"
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="e.g. user@example.com"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-mobile">Mobile</FieldLabel>
              <Input
                id="f-mobile"
                type="text"
                name="mobile"
                value={formData.mobile || ''}
                onChange={handleChange}
                placeholder="e.g. +91 9876543210"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-profile">Profile Link</FieldLabel>
              <Input
                id="f-profile"
                type="url"
                name="profile_link"
                value={formData.profile_link || ''}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-linkedin">LinkedIn URL</FieldLabel>
              <Input
                id="f-linkedin"
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url || ''}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Employment & Organization">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="f-company">Current Company</FieldLabel>
              <Input
                id="f-company"
                type="text"
                name="current_company"
                value={formData.current_company || ''}
                onChange={handleChange}
                placeholder="e.g. Google, Amazon"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-designation">Current Designation</FieldLabel>
              <Input
                id="f-designation"
                type="text"
                name="current_designation"
                value={formData.current_designation || ''}
                onChange={handleChange}
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-sector">Company Sector</FieldLabel>
              <Input
                id="f-sector"
                type="text"
                name="company_sector"
                value={formData.company_sector || ''}
                onChange={handleChange}
                placeholder="e.g. Technology, Finance"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-city">City</FieldLabel>
              <Input
                id="f-city"
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                placeholder="e.g. Bengaluru, Seattle"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-country">Country</FieldLabel>
              <Input
                id="f-country"
                type="text"
                name="country"
                value={formData.country || ''}
                onChange={handleChange}
                placeholder="e.g. India, United States"
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="RNSIT & Academic Programs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="f-branch">Academic Branch</FieldLabel>
              <Input
                id="f-branch"
                type="text"
                name="academic_branch"
                value={formData.academic_branch || ''}
                onChange={handleChange}
                placeholder="e.g. Computer Science and Engineering"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-rawbranch">Raw Branch / Designation</FieldLabel>
              <Input
                id="f-rawbranch"
                type="text"
                name="branch_or_designation_raw"
                value={formData.branch_or_designation_raw || ''}
                onChange={handleChange}
                placeholder="Historical/raw input"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-role">RNSIT Role</FieldLabel>
              <Input
                id="f-role"
                type="text"
                name="rnsit_role"
                value={formData.rnsit_role || ''}
                onChange={handleChange}
                placeholder="e.g. Alumnus, Faculty, Student"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="f-joining">Joining Year</FieldLabel>
                <Input
                  id="f-joining"
                  type="number"
                  name="joining_year"
                  value={formData.joining_year ?? ''}
                  onChange={handleChange}
                  placeholder="e.g. 2015"
                />
              </div>
              <div>
                <FieldLabel htmlFor="f-leaving">Leaving Year</FieldLabel>
                <Input
                  id="f-leaving"
                  type="number"
                  name="leaving_year"
                  value={formData.leaving_year ?? ''}
                  onChange={handleChange}
                  placeholder="e.g. 2019"
                />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Classifications & Scoring">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {flags.map((flag) => (
              <Checkbox
                key={flag.name}
                name={flag.name}
                checked={Boolean((formData as any)[flag.name])}
                onChange={handleChange}
                label={flag.label}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="f-score">Value Score (0–100)</FieldLabel>
              <Input
                id="f-score"
                type="number"
                name="value_score"
                min="0"
                max="100"
                value={formData.value_score ?? ''}
                onChange={handleChange}
                placeholder="e.g. 85"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-confidence">Data Confidence</FieldLabel>
              <Select
                id="f-confidence"
                name="data_confidence"
                value={formData.data_confidence || 'Standard'}
                onChange={handleChange}
              >
                <option value="High">High Confidence</option>
                <option value="Standard">Standard Confidence</option>
                <option value="Unverified">Unverified</option>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="f-status">Status</FieldLabel>
              <Select
                id="f-status"
                name="status"
                value={formData.status || 'active'}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="flagged">Flagged</option>
              </Select>
            </div>
          </div>
        </FormSection>

        <div>
          <FieldLabel htmlFor="f-notes">Notes &amp; Admin Annotations</FieldLabel>
          <Textarea
            id="f-notes"
            name="notes"
            rows={3}
            value={formData.notes || ''}
            onChange={handleChange}
            placeholder="Add verified remarks, contact updates, or notes..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditAlumniModal;
