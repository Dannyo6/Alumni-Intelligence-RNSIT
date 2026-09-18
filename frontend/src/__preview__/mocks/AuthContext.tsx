import React from 'react';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const useAuth = () => ({
  user: { id: 'u-1', email: 'eya.clinic@gmail.com' } as any,
  profile: null,
  isActive: true,
  isAdmin: true,
  loading: false,
  authStatus: 'AUTHORIZED' as const,
  refreshProfile: async () => {},
});
