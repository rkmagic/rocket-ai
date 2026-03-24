"use client";

import * as React from "react";

type JobFilterContextValue = {
  selectedCompanyIds: string[];
  toggleCompany: (id: string) => void;
  clearCompanies: () => void;
};

const JobFilterContext = React.createContext<JobFilterContextValue | null>(null);

export function JobFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<string[]>([]);

  const toggleCompany = React.useCallback((id: string) => {
    setSelectedCompanyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const clearCompanies = React.useCallback(() => setSelectedCompanyIds([]), []);

  const value = React.useMemo(
    () => ({
      selectedCompanyIds,
      toggleCompany,
      clearCompanies,
    }),
    [selectedCompanyIds, toggleCompany, clearCompanies],
  );

  return <JobFilterContext.Provider value={value}>{children}</JobFilterContext.Provider>;
}

export function useJobFilters() {
  const ctx = React.useContext(JobFilterContext);
  if (!ctx) throw new Error("useJobFilters must be used within JobFilterProvider");
  return ctx;
}
