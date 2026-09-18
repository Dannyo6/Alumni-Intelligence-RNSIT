import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Globe, Building2, ShieldAlert, Mail, MapPin, Building,
  GraduationCap, Phone, Briefcase, Tag, UserX, CircleAlert,
  Sparkles, ArrowRight, AlertTriangle, BarChart3,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

import {
  fetchDashboardSummary,
  fetchDashboardDistributions,
  getDrilldownUrl,
  formatCategoryName,
} from '../services/dashboardService';
import { fetchDataQualityMetrics } from '../services/dataQualityService';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Button, StatTile, PageHeader, SegmentedControl, EmptyState, Skeleton,
  FadeIn, CountUp, useChartTheme, cn,
} from '../components/ui';
import type { StatTone } from '../components/ui';

/** Tint classes for the governance alert chips, keyed by semantic tone. */
const ALERT_TONES: Record<string, string> = {
  warn: 'bg-warn-soft text-warn border-warn/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  info: 'bg-info-soft text-info border-info/20',
  accent: 'bg-accent-soft text-accent border-accent/20',
  success: 'bg-success-soft text-success border-success/20',
  neutral: 'bg-surface-sunken text-ink-muted border-line',
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload, fill } = props;
  const name = payload.value || "";
  let line1 = name;
  let line2 = "";
  if (name.length > 25) {
    const splitIndex = name.lastIndexOf(" ", 25);
    if (splitIndex > 0) {
      line1 = name.substring(0, splitIndex);
      line2 = name.substring(splitIndex + 1);
      if (line2.length > 25) {
        line2 = line2.substring(0, 23) + "...";
      }
    } else {
      line1 = name.substring(0, 25);
      line2 = name.substring(25, 48) + (name.length > 48 ? "..." : "");
    }
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={line2 ? -6 : 0} dy="0.355em" textAnchor="end" fill={fill} fontSize={11}>
        {line1}
      </text>
      {line2 && (
        <text x={-10} y={8} dy="0.355em" textAnchor="end" fill={fill} fontSize={11}>
          {line2}
        </text>
      )}
    </g>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [yearView, setYearView] = useState<'leaving' | 'joining'>('leaving');
  const chart = useChartTheme();

  // ─── Queries ──────────────────────────────────────────────────────────────
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    
  } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: fetchDashboardSummary,
  });

  const {
    data: distributions,
    isLoading: isDistLoading,
    isError: isDistError,
    error: distError,
    
  } = useQuery({
    queryKey: ['dashboardDistributions'],
    queryFn: fetchDashboardDistributions,
  });

  const {
    data: qualityMetrics,
    isLoading: isQualityLoading,
    isError: isQualityError,
    
  } = useQuery({
    queryKey: ['dataQualityMetrics'],
    queryFn: fetchDataQualityMetrics,
  });

  const isLoading = isSummaryLoading || isDistLoading || isQualityLoading;
  const isError = isSummaryError || isDistError || isQualityError;
  // ─── Loading State ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-3.5">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3 w-64" />
              <Skeleton className="mt-5 h-64 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Card className="mx-auto max-w-lg">
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle size={26} />
          </div>
          <h2 className="text-lg font-semibold text-ink">Unable to Load Dashboard Analytics</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            {summaryError instanceof Error
              ? summaryError.message
              : distError instanceof Error
                ? distError.message
                : 'An error occurred while fetching institutional intelligence data.'}
          </p>
          
        </div>
      </Card>
    );
  }

  // ─── Data Extraction ──────────────────────────────────────────────────────
  const totalAlumni = summary?.total_alumni ?? 0;
  const highValueCount = summary?.high_value_count ?? 0;
  const globalCount = summary?.global_count ?? 0;
  const topEmployerCount = summary?.top_employer_count ?? 0;
  const studentRnsitCount = summary?.student_rnsit_count ?? 0;
  const countriesCount = summary?.countries_represented ?? 0;
  const companiesCount = summary?.companies_represented ?? 0;
  const anyContactCount = summary?.alumni_with_any_contact ?? 0;

  // Chart data mappings
  const yearData = (yearView === 'leaving' ? distributions?.leaving_years : distributions?.joining_years) || [];
  const rawCompaniesData = distributions?.top_companies || [];
    const topCompaniesData = (() => {
      const merged: Record<string, number> = {};
      rawCompaniesData.forEach((item) => {
        const name = item.company.trim();
        const lowerName = name.toLowerCase();
        let normalizedName = name;
        if (
          lowerName === 'rns institute of technology' ||
          lowerName === 'rnsit'
        ) {
          normalizedName = 'RNS Institute of Technology';
        }
        merged[normalizedName] = (merged[normalizedName] || 0) + item.count;
      });
      return Object.entries(merged)
        .map(([company, count]) => ({ company, count }))
        .sort((a, b) => b.count - a.count);
    })();
  const countryData = distributions?.countries || [];
  const branchData = distributions?.branches || [];
  const sectorData = distributions?.sectors || [];
  const categoryData = (distributions?.categories || []).map((item) => ({
    ...item,
    displayName: formatCategoryName(item.category),
  }));

  const reachablePct = totalAlumni > 0 ? Math.round((anyContactCount / totalAlumni) * 100) : 0;
  const shareOfNetwork = (n: number) =>
    totalAlumni > 0 ? `${((n / totalAlumni) * 100).toFixed(1)}% of the network` : undefined;

  // KPI cards
  const kpis: {
    name: string;
    value: number;
    icon: React.ReactNode;
    tone: StatTone;
    hint?: string;
    onClick: () => void;
  }[] = [
    {
      name: 'Total Alumni',
      value: totalAlumni,
      icon: <Users size={20} />,
      tone: 'accent',
      hint: 'Canonical verified records',
      onClick: () => navigate(getDrilldownUrl('company', '')),
    },
    {
      name: 'High Value Alumni',
      value: highValueCount,
      icon: <Sparkles size={20} />,
      tone: 'warn',
      hint: shareOfNetwork(highValueCount),
      onClick: () => navigate(getDrilldownUrl('highValue')),
    },
    {
      name: 'Global Footprint',
      value: globalCount,
      icon: <Globe size={20} />,
      tone: 'success',
      hint: shareOfNetwork(globalCount),
      onClick: () => navigate(getDrilldownUrl('global')),
    },
    {
      name: 'Top Tier Employers',
      value: topEmployerCount,
      icon: <Building2 size={20} />,
      tone: 'violet',
      hint: shareOfNetwork(topEmployerCount),
      onClick: () => navigate(getDrilldownUrl('topEmployer')),
    },
    {
      name: 'Students & RNSIT',
      value: studentRnsitCount,
      icon: <GraduationCap size={20} />,
      tone: 'info',
      onClick: () => navigate(getDrilldownUrl('student')),
    },
    {
      name: 'Countries Represented',
      value: countriesCount,
      icon: <MapPin size={20} />,
      tone: 'danger',
      onClick: () => navigate('/directory'),
    },
    {
      name: 'Companies Represented',
      value: companiesCount,
      icon: <Building size={20} />,
      tone: 'accent',
      onClick: () => navigate('/directory'),
    },
    {
      name: 'Directly Reachable',
      value: anyContactCount,
      icon: <Mail size={20} />,
      tone: 'success',
      hint: `${reachablePct}% of the alumni base`,
      onClick: () => navigate(getDrilldownUrl('hasEmail')),
    },
  ];

  const heroKpi = kpis[0];
  const signalKpis = [kpis[1], kpis[2], kpis[3]];
  const secondaryKpis = [kpis[4], kpis[5], kpis[6], kpis[7]];

  const governanceAlerts = [
    { id: 'needs_verification', title: 'Verification Needed', count: qualityMetrics?.needs_verification ?? 0, icon: <ShieldAlert size={16} />, tone: 'warn' },
    { id: 'missing_contact', title: 'Missing Contact', count: qualityMetrics?.missing_contact ?? 0, icon: <UserX size={16} />, tone: 'danger' },
    { id: 'missing_email', title: 'Missing Email', count: qualityMetrics?.missing_email ?? 0, icon: <Mail size={16} />, tone: 'danger' },
    { id: 'missing_mobile', title: 'Missing Mobile', count: qualityMetrics?.missing_mobile ?? 0, icon: <Phone size={16} />, tone: 'warn' },
    { id: 'missing_company', title: 'Missing Company', count: qualityMetrics?.missing_company ?? 0, icon: <Building size={16} />, tone: 'info' },
    { id: 'missing_designation', title: 'Missing Designation', count: qualityMetrics?.missing_designation ?? 0, icon: <Briefcase size={16} />, tone: 'info' },
    { id: 'missing_sector', title: 'Missing Sector', count: qualityMetrics?.missing_sector ?? 0, icon: <Tag size={16} />, tone: 'info' },
    { id: 'missing_country', title: 'Missing Country', count: qualityMetrics?.missing_country ?? 0, icon: <MapPin size={16} />, tone: 'accent' },
    { id: 'missing_joining_year', title: 'Missing Batch Year', count: qualityMetrics?.missing_joining_year ?? 0, icon: <GraduationCap size={16} />, tone: 'success' },
    { id: 'low_data_confidence', title: 'Low/Unverified Confidence', count: qualityMetrics?.low_data_confidence ?? 0, icon: <CircleAlert size={16} />, tone: 'neutral' },
  ].filter((alert) => alert.count > 0);

  const drilldownHint = (label: string) => (
    <span className="flex items-center gap-1.5">
      <BarChart3 size={12} />
      {label}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Institutional Intelligence"
        title="Alumni Analytics"
        description={`Real-time server-side analytics across ${totalAlumni.toLocaleString()} verified alumni records.`}
        
      />

      {/* Network at a glance — one anchor figure, three outreach signals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeIn className="h-full lg:col-span-1">
          <Card spotlight interactive className="h-full" onClick={heroKpi.onClick}>
            <div className="relative flex h-full flex-col justify-between p-5">
              <div>
                <p className="font-mono text-2xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
                  Total alumni on record
                </p>
                <p className="figure mt-2 text-5xl font-semibold text-ink">
                  <CountUp to={totalAlumni} />
                </p>
              </div>

              {/* Reachability — the proportion that actually matters for outreach */}
              <div className="mt-5">
                <div className="mb-1.5 flex items-baseline justify-between text-2xs">
                  <span className="text-ink-muted">Directly reachable</span>
                  <span className="figure font-semibold text-ink">
                    {anyContactCount.toLocaleString()} · {reachablePct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${reachablePct}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                    className="h-full rounded-full bg-success"
                  />
                </div>
                <p className="mt-2 text-2xs text-ink-faint">
                  {(totalAlumni - anyContactCount).toLocaleString()} have no email or mobile on file
                </p>
              </div>
            </div>
          </Card>
        </FadeIn>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2">
          {signalKpis.map((kpi, i) => (
            <FadeIn key={kpi.name} index={i + 1} className="h-full">
              <StatTile
                label={kpi.name}
                value={kpi.value}
                icon={kpi.icon}
                tone={kpi.tone}
                hint={kpi.hint}
                index={i + 1}
                onClick={kpi.onClick}
              />
            </FadeIn>
          ))}
        </div>
      </div>

      {/* Secondary counts — present, but deliberately quieter than the row above */}
      <FadeIn index={4}>
        <Card>
          <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
            {secondaryKpis.map((kpi) => (
              <button
                key={kpi.name}
                onClick={kpi.onClick}
                className="group flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="shrink-0 text-ink-faint transition-colors group-hover:text-accent">
                  {kpi.icon}
                </span>
                <span className="min-w-0">
                  <span className="figure block text-lg font-semibold text-ink">
                    <CountUp to={kpi.value} />
                  </span>
                  <span className="block truncate text-2xs text-ink-muted">{kpi.name}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      </FadeIn>

      {/* Row 1: Batch Distribution & Top Employers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn index={8}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Alumni Batch Distribution</CardTitle>
                <CardDescription>Historical graduation and cohort volume</CardDescription>
              </div>
              <SegmentedControl
                layoutId="year-view-toggle"
                value={yearView}
                onChange={setYearView}
                options={[
                  { value: 'leaving', label: 'Graduation Year' },
                  { value: 'joining', label: 'Joining Year' },
                ]}
              />
            </CardHeader>

            <CardContent>
              {yearData.length === 0 ? (
                <EmptyState
                  className="h-72"
                  icon={<BarChart3 size={20} />}
                  title="No batch year data"
                  description="No batch year distribution data available."
                />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
                      <Tooltip
                        cursor={{ fill: chart.cursor }}
                        contentStyle={chart.tooltip}
                        labelStyle={chart.labelStyle}
                        formatter={(value: any) => [
                          `${value} Alumni`,
                          yearView === 'leaving' ? 'Graduating Batch' : 'Joining Batch',
                        ]}
                      />
                      <Bar
                        dataKey="count"
                        fill={chart.series[0]}
                        fillOpacity={0.88}
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        activeBar={{ fillOpacity: 1, stroke: chart.label, strokeWidth: 1 }}
                        onClick={(entry: any) => {
                          const payload = entry?.payload ?? entry;
                          if (payload && payload.year) {
                            const url = yearView === 'leaving'
                              ? getDrilldownUrl('leavingYear', payload.year)
                              : getDrilldownUrl('joiningYear', payload.year);
                            navigate(url);
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
            <CardFooter>{drilldownHint('Click any bar to drill down into the Directory')}</CardFooter>
          </Card>
        </FadeIn>

        <FadeIn index={9}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Top 15 Employers</CardTitle>
                <CardDescription>Leading organizations employing RNSIT alumni</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {topCompaniesData.length === 0 ? (
                <EmptyState
                  className="h-72"
                  icon={<Building2 size={20} />}
                  title="No employer data"
                  description="No employer distribution data available."
                />
              ) : (
                <div style={{ height: Math.max(300, Math.min(topCompaniesData.length, 15) * 50 + 20) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={topCompaniesData.slice(0, 15)}
                        margin={{ top: 5, right: 24, left: 0, bottom: 0 }}
                        barSize={20}
                      >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chart.grid} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
                      <YAxis
                          type="category"
                          dataKey="company"
                          axisLine={false}
                          tickLine={false}
                          width={200}
                          tick={<CustomYAxisTick fill={chart.label} />}
                        />
                      <Tooltip
                        cursor={{ fill: chart.cursor }}
                        contentStyle={chart.tooltip}
                        labelStyle={chart.labelStyle}
                        formatter={(value: any) => [`${value} Alumni`, 'Employed']}
                      />
                      <Bar
                        dataKey="count"
                        fill={chart.series[2]}
                        fillOpacity={0.88}
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        activeBar={{ fillOpacity: 1, stroke: chart.label, strokeWidth: 1 }}
                        onClick={(entry: any) => {
                          const payload = entry?.payload ?? entry;
                          if (payload && payload.company) {
                            navigate(getDrilldownUrl('company', payload.company));
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
            <CardFooter>{drilldownHint('Click any company to filter the Directory')}</CardFooter>
          </Card>
        </FadeIn>
      </div>

      {/* Row 2: Global Footprint & Academic Branches */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn index={10}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Global Footprint by Country</CardTitle>
                <CardDescription>Top international destinations for RNSIT graduates</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {countryData.length === 0 ? (
                <EmptyState
                  className="h-72"
                  icon={<Globe size={20} />}
                  title="No country data"
                  description="No country distribution data available."
                />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryData.slice(0, 10)} margin={{ top: 10, right: 12, left: -12, bottom: 22 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
                      <XAxis
                        dataKey="country"
                        axisLine={false}
                        tickLine={false}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        tick={{ fill: chart.axis, fontSize: 10 }}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
                      <Tooltip
                        cursor={{ fill: chart.cursor }}
                        contentStyle={chart.tooltip}
                        labelStyle={chart.labelStyle}
                        formatter={(value: any) => [`${value} Alumni`, 'Based In']}
                      />
                      <Bar
                        dataKey="count"
                        fill={chart.series[6]}
                        fillOpacity={0.88}
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        activeBar={{ fillOpacity: 1, stroke: chart.label, strokeWidth: 1 }}
                        onClick={(entry: any) => {
                          const payload = entry?.payload ?? entry;
                          if (payload && payload.country) {
                            navigate(getDrilldownUrl('country', payload.country));
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
            <CardFooter>{drilldownHint('Click any country to filter the Directory')}</CardFooter>
          </Card>
        </FadeIn>

        <FadeIn index={11}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Academic Branch Representation</CardTitle>
                <CardDescription>Alumni cohort distribution across departments</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {branchData.length === 0 ? (
                <EmptyState
                  className="h-72"
                  icon={<GraduationCap size={20} />}
                  title="No branch data"
                  description="No branch representation data available."
                />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={branchData.slice(0, 8)}
                      margin={{ top: 5, right: 24, left: 40, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chart.grid} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="branch"
                        axisLine={false}
                        tickLine={false}
                        width={110}
                        tick={{ fill: chart.label, fontSize: 10 }}
                      />
                      <Tooltip
                        cursor={{ fill: chart.cursor }}
                        contentStyle={chart.tooltip}
                        labelStyle={chart.labelStyle}
                        formatter={(value: any) => [`${value} Alumni`, 'Department']}
                      />
                      <Bar
                        dataKey="count"
                        fill={chart.series[5]}
                        fillOpacity={0.88}
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        activeBar={{ fillOpacity: 1, stroke: chart.label, strokeWidth: 1 }}
                        onClick={(entry: any) => {
                          const payload = entry?.payload ?? entry;
                          if (payload && payload.branch) {
                            navigate(getDrilldownUrl('branch', payload.branch));
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
            <CardFooter>{drilldownHint('Click any branch to filter the Directory')}</CardFooter>
          </Card>
        </FadeIn>
      </div>

      {/* Row 3: Industry Sectors & Primary Classification */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn index={12}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Industry &amp; Domain Sectors</CardTitle>
                <CardDescription>Distribution across economic sectors</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {sectorData.length === 0 ? (
                <EmptyState
                  className="h-72"
                  icon={<Briefcase size={20} />}
                  title="No sector data"
                  description="No sector distribution data available."
                />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorData.slice(0, 8)} margin={{ top: 10, right: 12, left: -12, bottom: 22 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
                      <XAxis
                        dataKey="sector"
                        axisLine={false}
                        tickLine={false}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                        tick={{ fill: chart.axis, fontSize: 10 }}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
                      <Tooltip
                        cursor={{ fill: chart.cursor }}
                        contentStyle={chart.tooltip}
                        labelStyle={chart.labelStyle}
                        formatter={(value: any) => [`${value} Alumni`, 'Sector']}
                      />
                      <Bar
                        dataKey="count"
                        fill={chart.series[3]}
                        fillOpacity={0.88}
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        activeBar={{ fillOpacity: 1, stroke: chart.label, strokeWidth: 1 }}
                        onClick={(entry: any) => {
                          const payload = entry?.payload ?? entry;
                          if (payload && payload.sector) {
                            navigate(getDrilldownUrl('sector', payload.sector));
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
            <CardFooter>{drilldownHint('Click any sector to filter the Directory')}</CardFooter>
          </Card>
        </FadeIn>

        <FadeIn index={13}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Primary Classification Mix</CardTitle>
                <CardDescription>Tiering and status breakdown across alumni base</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {categoryData.length === 0 ? (
                <EmptyState
                  className="h-72"
                  icon={<Tag size={20} />}
                  title="No classification data"
                  description="No category distribution data available."
                />
              ) : (
                <div className="flex h-72 flex-col">
                  <ResponsiveContainer width="100%" height="72%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="count"
                        nameKey="displayName"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={3}
                        cursor="pointer"
                        stroke="none"
                        onClick={(entry: any) => {
                          const payload = entry?.payload ?? entry;
                          if (payload && payload.category) {
                            navigate(getDrilldownUrl('category', payload.category));
                          }
                        }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.category}-${index}`}
                            fill={chart.series[index % chart.series.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chart.tooltip}
                        labelStyle={chart.labelStyle}
                        formatter={(value: any) => [`${value} Alumni`, 'Count']}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="scroll-slim mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 overflow-y-auto">
                    {categoryData.map((cat, i) => (
                      <button
                        key={cat.category}
                        onClick={() => navigate(getDrilldownUrl('category', cat.category))}
                        className={cn(
                          'inline-flex min-h-6 items-center gap-1.5 rounded-md px-2 py-1',
                          'text-2xs text-ink-secondary transition-colors hover:bg-surface-hover hover:text-accent-ink',
                        )}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: chart.series[i % chart.series.length] }}
                        />
                        {cat.displayName}
                        <span className="tnum text-ink-faint">{cat.count.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>{drilldownHint('Click any category to filter the Directory')}</CardFooter>
          </Card>
        </FadeIn>
      </div>

      {/* Row 4: Data Quality & Governance Alerts */}
      <FadeIn index={14}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Data Governance &amp; Verification Alerts</CardTitle>
              <CardDescription>
                Live discrepancy detection across {totalAlumni.toLocaleString()} records
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/data-quality')}
              iconRight={<ArrowRight size={14} />}
              className="text-accent-ink"
            >
              Open Quality Center
            </Button>
          </CardHeader>

          <CardContent>
            {governanceAlerts.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert size={20} />}
                title="No outstanding governance alerts"
                description="Every tracked data quality dimension is currently clear."
              />
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {governanceAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => navigate(`/data-quality?filter=${alert.id}`)}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg border border-line bg-surface p-3 text-left',
                      'transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-sm',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                        ALERT_TONES[alert.tone],
                      )}
                    >
                      {alert.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-ink">{alert.title}</span>
                      <span className="block text-2xs text-ink-faint">Inspect in Quality Center</span>
                    </span>
                    <span className="tnum shrink-0 text-sm font-semibold text-ink">
                      {alert.count.toLocaleString()}
                    </span>
                    <ArrowRight
                      size={13}
                      className="shrink-0 text-ink-faint opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100"
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
};

export default Dashboard;









