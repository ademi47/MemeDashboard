"use client";
import React from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""; // e.g., "http://localhost:8080"
const API_PATH = `${API_BASE}/reports/top-24h`;
const SEND_PATH = `${API_BASE}/reports/send-telegram-now`;

export type MemeReportItem = {
  id: string;
  title: string;
  author: string;
  permalink: string;
  contentUrl?: string | null;
  thumbnail?: string | null;
  upvotes: number;
  numComments: number;
  createdUtc: string;
  snapshotAt?: string | null;
  isRemoved?: boolean | null;
  removedAt?: string | null;
};

async function fetchTop24h(): Promise<MemeReportItem[]> {
  const res = await fetch(API_PATH, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (Array.isArray(data)) return data as MemeReportItem[];
  if (Array.isArray((data as any)?.items))
    return (data as any).items as MemeReportItem[];
  return [];
}

async function sendReportNow() {
  const res = await fetch(SEND_PATH, { method: "POST" });
  if (!res.ok)
    throw new Error(`Send failed ${res.status}: ${await res.text()}`);
  return await res.text();
}

function toLocal(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso ?? "-";
  return d.toLocaleString();
}

function csvEscape(v: unknown) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function downloadCSV(rows: MemeReportItem[]) {
  const header = [
    "id",
    "title",
    "author",
    "upvotes",
    "numComments",
    "createdUtc",
    "snapshotAt",
    "permalink",
    "contentUrl",
    "isRemoved",
    "removedAt",
  ];
  const data = rows.map((r) =>
    [
      r.id,
      r.title,
      r.author,
      r.upvotes,
      r.numComments,
      r.createdUtc,
      r.snapshotAt ?? "",
      r.permalink,
      r.contentUrl ?? "",
      r.isRemoved ?? "",
      r.removedAt ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );
  const csv = [header.join(","), ...data].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `meme-report-top24h-${new Date()
    .toISOString()
    .slice(0, 19)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [items, setItems] = React.useState<MemeReportItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [sendMsg, setSendMsg] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchTop24h();
      setItems(rows);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReport() {
    setSending(true);
    setSendMsg(null);
    try {
      const msg = await sendReportNow();
      setSendMsg(msg || "Report sent to Telegram.");
    } catch (e: any) {
      setSendMsg(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Admin Dashboard : Reports — Top 24h
          </h1>
          <p className="text-sm text-gray-400">
            Showing top posts from the last 24 hours including deleted posts.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load()}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white"
          >
            Refresh
          </button>
          <button
            onClick={() => downloadCSV(items)}
            className="px-3 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-sm text-white"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleSendReport()}
            disabled={sending}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-sm text-white"
          >
            {sending ? "Sending..." : "Send Report"}
          </button>
        </div>
      </header>

      {sendMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-sm text-emerald-300">
          {sendMsg}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800 text-sm">
          <b>Error:</b> {error}
        </div>
      )}

      <section className="overflow-x-auto rounded-2xl border border-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-[#0f1115] text-gray-300">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Post</th>
              <th className="p-3 text-left">Author</th>
              <th className="p-3 text-right">Upvotes</th>
              <th className="p-3 text-right">Comments</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Snapshot</th>
              <th className="p-3 text-left">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading
              ? [...Array(20)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-3 text-gray-700">—</td>
                    <td className="p-3">
                      <div className="h-4 w-56 bg-gray-800 rounded" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-24 bg-gray-800 rounded" />
                    </td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3">—</td>
                    <td className="p-3">—</td>
                    <td className="p-3">—</td>
                  </tr>
                ))
              : items.map((r, idx) => (
                  <tr key={r.id + idx} className="hover:bg-white/5">
                    <td className="p-3 align-top">{idx + 1}</td>
                    <td className="p-3 align-top">
                      <div className="flex gap-3 items-start">
                        {r.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.thumbnail}
                            alt="thumb"
                            className="w-14 h-14 object-cover rounded-xl border border-gray-800"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gray-900 border border-gray-800" />
                        )}
                        <div>
                          <a
                            href={r.permalink}
                            target="_blank"
                            className={`font-medium ${
                              r.isRemoved ? "line-through text-gray-400" : ""
                            }`}
                          >
                            {r.title}
                          </a>
                          <div className="text-xs text-gray-400">
                            ID: {r.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 align-top">u/{r.author}</td>
                    <td className="p-3 text-right align-top font-semibold">
                      {r.upvotes.toLocaleString()}
                    </td>
                    <td className="p-3 text-right align-top">
                      {r.numComments.toLocaleString()}
                    </td>
                    <td className="p-3 align-top">{toLocal(r.createdUtc)}</td>
                    <td className="p-3 align-top">{toLocal(r.snapshotAt)}</td>
                    <td className="p-3 align-top">
                      <div className="flex gap-2">
                        <a
                          href={r.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg text-xs text-white bg-indigo-600 hover:bg-indigo-500"
                        >
                          Reddit
                        </a>
                        {r.contentUrl && (
                          <a
                            href={r.contentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-lg text-xs text-white bg-emerald-600 hover:bg-emerald-500"
                          >
                            Content
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  No data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
