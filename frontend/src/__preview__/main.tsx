/**
 * Local-only visual harness for the Phase 9 redesign.
 * Services and auth are aliased to fixtures by vite.preview.config.ts, so every
 * page renders without a Supabase session. Not part of the app build.
 *
 * Pick a route with ?p= — e.g. /preview.html?p=/admin%3Ftab%3Dduplicates
 * A MemoryRouter is used so deep routes need no server-side rewrite.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '../index.css';
import { ThemeProvider } from '../contexts/ThemeContext';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import Directory from '../pages/Directory';
import DataQuality from '../pages/DataQuality';
import Admin from '../pages/Admin';
import ImportData from '../pages/Import';
import Login from '../pages/Login';
import Entry from '../pages/Entry';
import NotFound from '../components/NotFound';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
});

const initialRoute = new URLSearchParams(window.location.search).get('p') || '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/entry" element={<Entry />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="directory" element={<Directory />} />
              <Route path="data-quality" element={<DataQuality />} />
              <Route path="admin" element={<Admin />} />
              <Route path="import" element={<ImportData />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
