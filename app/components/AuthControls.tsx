"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { plexaAuthApiUrl } from "@/app/lib/auth/client-api-url";

type Me = {
  user?: {
    name: string;
    email: string;
    role: string;
  };
};

export function AuthControls() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    void fetch(plexaAuthApiUrl("/api/auth/me"), { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMe(data))
      .catch(() => setMe(null));
  }, []);

  const logout = async () => {
    await fetch(plexaAuthApiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  };

  if (!me?.user) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden text-slate-500 sm:inline">
        {me.user.name} · {me.user.role}
      </span>
      <button type="button" onClick={logout} className="rounded-md border border-[#1f2d26] px-3 py-2 text-slate-400 hover:text-white">
        Logout
      </button>
    </div>
  );
}
