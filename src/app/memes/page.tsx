import React from "react";
import MemeDashboardClient from "@/components/MemeDashboardClient";

export const revalidate = 300; // revalidate every 5 minutes

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ""; // e.g., http://localhost:8080
const REPORT_ENDPOINT = `${API_BASE}/memes/top-24h`;

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

async function fetchTop24h(): Promise<MemeItem[]> {
  // Server-side fetch with ISR
  const res = await fetch(REPORT_ENDPOINT, { next: { revalidate } });
  if (!res.ok) {
    console.error("Failed to fetch memes/top-24h:", res.status, res.statusText);
    return [];
  }
  return (await res.json()) as MemeItem[];
}

export default async function Page() {
  const initialData = await fetchTop24h();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"></header>
        User Dashboard: Shows Active Top Reddit Posts
      </div>
      <MemeDashboardClient
        initialItems={initialData}
        reportEndpoint={REPORT_ENDPOINT}
      />
    </div>
  );
}
