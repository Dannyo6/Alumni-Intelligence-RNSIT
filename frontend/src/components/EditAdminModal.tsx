import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { updateAdminUserName, type AdminUserProfile } from '../services/adminService';

interface EditAdminModalProps {
  user: AdminUserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedUser: AdminUserProfile) => void;
}

const EditAdminModal: React.FC<EditAdminModalProps> = ({
  user,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
    }
  }, [user?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) {
      setErrorMessage('Full name cannot be empty.');
      return;
    }

    if (trimmed.length > 100) {
      setErrorMessage('Full name must be 100 characters or fewer.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await updateAdminUserName(user.id, trimmed);
      onSaveSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update administrator name.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-admin-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 sm:p-6 border border-slate-200 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 id="edit-admin-title" className="text-base font-bold text-slate-900">
            Edit Administrator
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition focus-visible:ring-2 focus-visible:ring-[#2570cc] focus-visible:outline-none"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field (Read Only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-slate-400 font-normal">(Read-only)</span>
            </label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              readOnly
              className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-slate-500 cursor-not-allowed select-none font-mono"
            />
          </div>

          {/* Full Name field */}
          <div>
            <label htmlFor="admin-full-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="admin-full-name-input"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Ramesh Kumar"
              maxLength={100}
              required
              autoFocus
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-[#2570cc]/30 focus:border-[#2570cc] transition outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This name will be displayed across the administration portal and audit logs.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#2570cc] hover:bg-[#1b5399] rounded-md shadow-2xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAdminModal;
