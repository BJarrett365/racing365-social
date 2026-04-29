"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditingWorkflowRole } from "@/features/editing-studio/types/workflow";
import { normalizeWorkflowRole } from "@/features/editing-studio/workflow/workflow-permissions";

const STORAGE_KEY = "editing-studio-role";

export function useEditingWorkflowRole(): [EditingWorkflowRole, (role: EditingWorkflowRole) => void] {
  const [role, setRoleState] = useState<EditingWorkflowRole>("writer");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRoleState(normalizeWorkflowRole(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  const setRole = useCallback((next: EditingWorkflowRole) => {
    setRoleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  return [role, setRole];
}
