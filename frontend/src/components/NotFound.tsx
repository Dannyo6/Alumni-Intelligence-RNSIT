import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center mx-auto text-brand-600 mb-4">
        <Compass size={32} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-600 max-w-md mb-6">
        The requested resource does not exist or you do not have permission to view it in the RNSIT Alumni Management Portal.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
      >
        <ArrowLeft size={14} />
        Return to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
