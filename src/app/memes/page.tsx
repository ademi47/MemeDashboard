"use client";

import React, { useEffect, useState } from "react";
import MemeDashboardClient from "@/components/MemeDashboardClient";

export type MemeItem = {
  id: string;
  title: string;
  author: string;
  permalink: string;
  contentUrl: string;
  upvotes: number;
  numComments?: number;
  createdUtc: string;
  thumbnail?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""; // e.g., https://memecrawler.duckdns.org
const REPORT_ENDPOINT = API_BASE ? `${API_BASE}/memes/top-24h` : "";

export default function Page() {
  const [items, setItems] = useState<MemeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!REPORT_ENDPOINT) {
        setError("NEXT_PUBLIC_API_BASE is not set");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(REPORT_ENDPOINT, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as MemeItem[];
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" />
        <div className="mb-2">
          User Dashboard: Shows Active Top Reddit Posts
        </div>
        {loading && <p>Loading…</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>

      {/* Pass client-fetched data to our client widget */}
      <MemeDashboardClient
        initialItems={items}
        reportEndpoint={REPORT_ENDPOINT}
      />
    </div>
  );
}
