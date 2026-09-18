// Preview-only stand-in for the dashboard service.
export * from '../../services/dashboardService';
import type { DashboardSummary, DashboardDistributions } from '../../services/dashboardService';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return {
    total_alumni: 6472, high_value_count: 412, top_employer_count: 1834, global_count: 968,
    student_rnsit_count: 233, needs_verification_count: 517, countries_represented: 34,
    companies_represented: 1207, alumni_with_email: 5120, alumni_with_mobile: 4388,
    alumni_with_any_contact: 5744,
  };
}

export async function fetchDashboardDistributions(): Promise<DashboardDistributions> {
  return {
    leaving_years: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
      .map((year, i) => ({ year, count: 288 + i * 38 + (i % 3) * 24 })),
    joining_years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020]
      .map((year, i) => ({ year, count: 274 + i * 41 + (i % 4) * 18 })),
    top_companies: [
      { company: 'Infosys', count: 412 }, { company: 'TCS', count: 388 }, { company: 'Wipro', count: 301 },
      { company: 'Accenture', count: 264 }, { company: 'Amazon', count: 198 }, { company: 'Microsoft', count: 154 },
      { company: 'Cognizant', count: 142 }, { company: 'Oracle', count: 118 }, { company: 'IBM', count: 104 },
      { company: 'Deloitte', count: 91 },
    ],
    countries: [
      { country: 'India', count: 5504 }, { country: 'United States', count: 512 }, { country: 'Germany', count: 118 },
      { country: 'Canada', count: 96 }, { country: 'United Kingdom', count: 84 }, { country: 'Australia', count: 62 },
      { country: 'Singapore', count: 41 }, { country: 'Netherlands', count: 27 }, { country: 'UAE', count: 19 },
      { country: 'Ireland', count: 12 },
    ],
    branches: [
      { branch: 'Computer Science', count: 1842 }, { branch: 'Information Science', count: 1288 },
      { branch: 'Electronics & Comm.', count: 1104 }, { branch: 'Mechanical', count: 812 },
      { branch: 'Civil', count: 566 }, { branch: 'Electrical', count: 448 },
      { branch: 'Industrial Eng.', count: 232 }, { branch: 'Telecommunication', count: 180 },
    ],
    sectors: [
      { sector: 'IT Services', count: 2688 }, { sector: 'Product', count: 1204 },
      { sector: 'Consulting', count: 702 }, { sector: 'Finance', count: 512 },
      { sector: 'Manufacturing', count: 404 }, { sector: 'Healthcare', count: 246 },
      { sector: 'Education', count: 188 }, { sector: 'Government', count: 122 },
    ],
    categories: [
      { category: 'high_value', count: 412 }, { category: 'top_employer', count: 1834 },
      { category: 'global', count: 968 }, { category: 'student_rnsit', count: 233 },
      { category: 'general', count: 3025 },
    ],
  };
}
