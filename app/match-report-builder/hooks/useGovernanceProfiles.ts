"use client";

import { useCallback, useEffect, useState } from "react";
import { studioApiPath } from "@/app/lib/app-base-path";
import type { LanguageJournalistProfile } from "@/app/lib/language-studio/types";
import type { MatchReportTargetBrand } from "@/app/lib/match-report/types";

export function useGovernanceProfiles(targetBrand: MatchReportTargetBrand | "") {
  const [profiles, setProfiles] = useState<LanguageJournalistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = targetBrand ? `?brand=${encodeURIComponent(targetBrand)}` : "";
      const res = await fetch(studioApiPath(`/api/match-report/creator-profiles${query}`), {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { profiles?: LanguageJournalistProfile[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Failed to load profiles (${res.status})`);
      }
      setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
    } catch (e) {
      setProfiles([]);
      setError(e instanceof Error ? e.message : "Failed to load Content Creator profiles");
    } finally {
      setLoading(false);
    }
  }, [targetBrand]);

  useEffect(() => {
    void load();
  }, [load]);

  return { profiles, loading, error, reload: load };
}
