import React from 'react';
import { ArrowRight, Upload, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, PageHeader } from '../components/ui';

const ImportData: React.FC = () => {
  return (
    <div className="mx-auto max-w-2xl space-y-12 py-8">
      <PageHeader
        eyebrow="Data Operations"
        title="Bulk Import Alumni Data"
        description="Production bulk import and data synchronization."
      />

      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface-sunken/30 px-6 py-20 text-center transition-colors hover:bg-surface-sunken/50">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface shadow-sm ring-1 ring-line">
          <Upload size={24} className="text-ink-muted" />
        </div>
        <h3 className="text-[1.0625rem] font-semibold text-ink">Upload Workbook</h3>
        <p className="mt-2 mb-8 max-w-sm text-sm leading-relaxed text-ink-muted">
          Select a multi-sheet Excel workbook (.xlsx) to stage for ingestion and canonical promotion.
        </p>
        <Button disabled variant="primary" size="lg" icon={<Upload size={15} />}>
          Select File...
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4 border-t border-line pt-8 sm:flex-row sm:justify-center">
        <Link to="/admin?tab=imports">
          <Button variant="secondary" icon={<History size={14} />}>
            Import History
          </Button>
        </Link>
        <Link to="/directory">
          <Button variant="secondary" iconRight={<ArrowRight size={14} />}>
            Return to Directory
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ImportData;
