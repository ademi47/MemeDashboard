"use client";

import React, { useEffect, useMemo, useState } from "react";

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

function formatNumber(n?: number) {
  if (n == null) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return String(n);
  }
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function MemeDashboardClient({
  initialItems,
  reportEndpoint,
}: {
  initialItems: MemeItem[];
  reportEndpoint: string;
}) {
  const [items, setItems] = useState<MemeItem[]>(initialItems || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // controls
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"upvotes" | "comments" | "time">(
    "upvotes"
  );
  const [direction, setDirection] = useState<"desc" | "asc">("desc");
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(300);

  // pagination
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(reportEndpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MemeItem[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (e: any) {
      setError(e?.message || "Failed to refresh");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const id = setInterval(refresh, autoRefreshSec * 1000);
    return () => clearInterval(id);
  }, [autoRefreshSec]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? items.filter(
          (m) =>
            m.title?.toLowerCase().includes(q) ||
            m.author?.toLowerCase().includes(q) ||
            m.permalink?.toLowerCase().includes(q)
        )
      : items;

    const sorted = [...searched].sort((a, b) => {
      const av =
        sortBy === "upvotes"
          ? a.upvotes
          : sortBy === "comments"
          ? a.numComments ?? 0
          : new Date(a.createdUtc).getTime();
      const bv =
        sortBy === "upvotes"
          ? b.upvotes
          : sortBy === "comments"
          ? b.numComments ?? 0
          : new Date(b.createdUtc).getTime();
      return direction === "desc" ? bv - av : av - bv;
    });

    return sorted;
  }, [items, query, sortBy, direction]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          className="px-3 py-2 border rounded-lg w-64 focus:outline-none focus:ring focus:ring-indigo-200"
          placeholder="Search title, author, link..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-xl bg-gray-900 border border-gray-700 px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          title="Sort by"
        >
          <option value="upvotes">Upvotes</option>
          <option value="comments">Comments</option>
          <option value="time">Newest</option>
        </select>
        <button
          className="px-3 py-2 border rounded-lg hover:bg-slate-100"
          onClick={() => setDirection((d) => (d === "desc" ? "asc" : "desc"))}
          title="Toggle sort direction"
        >
          {direction === "desc" ? "↓" : "↑"}
        </button>
        <button
          className="px-3 py-2 border rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={refresh}
          title="Refresh"
        >
          Refresh
        </button>
        <select
          className="rounded-xl bg-gray-900 border border-gray-700 px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          value={autoRefreshSec}
          onChange={(e) => setAutoRefreshSec(parseInt(e.target.value, 10))}
          title="Auto refresh interval"
        >
          <option value={0}>No auto-refresh</option>
          <option value={60}>Every 1 min</option>
          <option value={300}>Every 5 min</option>
          <option value={900}>Every 15 min</option>
        </select>
      </div>

      {/* Error / Loading / Empty */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
          Failed to load: {error}
        </div>
      )}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: pageSize }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-white p-4 animate-pulse"
            >
              <div className="h-48 bg-slate-200 rounded-lg mb-3" />
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-center text-slate-500 py-16">
          No memes found in the last 24 hours.
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paged.map((m) => (
          <article
            key={m.id}
            className="rounded-xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  m.contentUrl ||
                  m.thumbnail ||
                  "https://placehold.co/800x450?text=No+Image"
                }
                alt={m.title}
                className="w-full h-56 object-cover bg-slate-100"
                loading="lazy"
              />
              <span className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                {timeAgo(m.createdUtc)}
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <header>
                <h3 className="font-semibold text-slate-800 line-clamp-2">
                  {m.title}
                </h3>
                <p className="text-sm text-slate-500">
                  by{" "}
                  <span className="font-medium text-slate-700">
                    u/{m.author}
                  </span>
                </p>
              </header>
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border">
                  👍 {formatNumber(m.upvotes)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border">
                  💬 {formatNumber(m.numComments)}
                </span>
              </div>
              <footer className="mt-1 flex gap-2">
                <a
                  href={m.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border"
                  title="Open on Reddit"
                >
                  Open on Reddit ↗
                </a>
                {m.contentUrl && (
                  <a
                    href={m.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border"
                    title="Open image"
                  >
                    View Image
                  </a>
                )}
              </footer>
            </div>
          </article>
        ))}
      </div>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            className="px-3 py-2 border rounded-lg hover:bg-slate-100"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ◀ Prev
          </button>
          <div className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </div>
          <button
            className="px-3 py-2 border rounded-lg hover:bg-slate-100"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next ▶
          </button>
        </div>
      )}

      <div className="text-center text-xs text-slate-400 mt-10">
        Data source: r/memes • Last 24h • API: {reportEndpoint}
      </div>
    </div>
  );
}
