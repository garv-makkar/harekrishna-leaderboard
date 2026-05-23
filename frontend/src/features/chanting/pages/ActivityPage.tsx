"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Award, BarChart3, CalendarDays, CheckCircle2, Download, FileUp, Flame, ListChecks, ShieldCheck, Users } from "lucide-react";
import { useChanting } from "../ChantingContext";
import {
  addDays,
  bestStreak,
  buildActivityFeed,
  currentStreak,
  formatDate,
  recentChantingHistory,
  roundsForDate
} from "../domain";
import type { ActivityFeedItem } from "../domain";
import { EmptyState, Panel } from "../ui";

const rangeOptions = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 }
];

export function ActivityPage() {
  const { state, currentUser, todayKey, editableDates, setSelectedDate, setDailyRounds, showMessage } = useChanting();
  const [days, setDays] = useState(30);
  const [importStatus, setImportStatus] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const history = useMemo(
    () => recentChantingHistory(state.chantTotals, currentUser?.id || "", todayKey, days),
    [currentUser?.id, days, state.chantTotals, todayKey]
  );

  if (!currentUser) return null;

  const activeDays = history.filter((item) => item.rounds > 0).length;
  const totalRounds = history.reduce((sum, item) => sum + item.rounds, 0);
  const highestRounds = Math.max(1, ...history.map((item) => item.rounds));
  const averageOnActiveDays = activeDays ? Math.round((totalRounds / activeDays) * 10) / 10 : 0;
  const allEntries = state.chantTotals
    .filter((total) => total.userId === currentUser.id && total.rounds > 0)
    .sort((a, b) => b.localDate.localeCompare(a.localDate));
  const feedItems = buildActivityFeed(state, currentUser.id, todayKey).slice(0, 14);
  const exportHistory = () => {
    const rows = [
      ["date", "rounds", "updated_at"],
      ...state.chantTotals
        .filter((total) => total.userId === currentUser.id)
        .sort((a, b) => a.localDate.localeCompare(b.localDate))
        .map((total) => [total.localDate, String(total.rounds), total.updatedAt])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `chanting-history-${currentUser.username}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showMessage("History exported as CSV.");
  };
  const importHistory = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportStatus("Reading CSV...");
    const text = await file.text();
    const rows = parseCsvRows(text);
    const header = rows[0]?.map((cell) => cell.toLowerCase()) || [];
    const dateIndex = header.indexOf("date");
    const roundsIndex = header.indexOf("rounds");
    if (dateIndex < 0 || roundsIndex < 0) {
      setImportStatus("CSV must include date and rounds columns.");
      return;
    }
    const entries = rows
      .slice(1)
      .map((row) => ({
        dateKey: row[dateIndex],
        rounds: Math.max(0, Math.min(999, Math.floor(Number(row[roundsIndex]) || 0)))
      }))
      .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.dateKey) && editableDates.includes(entry.dateKey));
    if (entries.length === 0) {
      setImportStatus("No editable dates found. Import currently accepts only today and the previous 6 days.");
      return;
    }
    for (const entry of entries) {
      await setDailyRounds(entry.dateKey, entry.rounds);
    }
    setImportStatus(`Imported ${entries.length} editable entr${entries.length === 1 ? "y" : "ies"}. Older dates were skipped.`);
    if (importInputRef.current) importInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <Panel title="Activity summary" icon={<BarChart3 size={18} />}>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-md px-3 py-2 text-sm font-black transition ${
                  days === option.value ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
                }`}
                onClick={() => setDays(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md bg-peacock-600 px-3 py-2 text-sm font-black text-white shadow-sm"
            onClick={exportHistory}
          >
            <Download size={16} /> Export CSV
          </button>
          <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={importHistory} />
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md bg-stone-900 px-3 py-2 text-sm font-black text-white shadow-sm"
            onClick={() => importInputRef.current?.click()}
          >
            <FileUp size={16} /> Import CSV
          </button>
        </div>
        {importStatus && (
          <div className="mb-4 rounded-md border border-saffron-200 bg-saffron-50 px-4 py-3 text-sm font-bold text-saffron-900">
            {importStatus}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile label="Rounds" value={totalRounds} note={`last ${days} days`} />
          <SummaryTile label="Active days" value={activeDays} note={`${days - activeDays} blank day${days - activeDays === 1 ? "" : "s"}`} />
          <SummaryTile label="Average" value={averageOnActiveDays} note="on active days" />
          <SummaryTile label="Current streak" value={currentStreak(state.chantTotals, currentUser.id, todayKey)} note={`best ${bestStreak(state.chantTotals, currentUser.id)}`} />
        </div>
      </Panel>

      <Panel title="Recent activity" icon={<ListChecks size={18} />}>
        {feedItems.length === 0 ? (
          <EmptyState text="No recent app activity yet. Log rounds, join a group, or add a friend and it will appear here." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            {feedItems.map((item) => (
              <div key={item.id} className="grid gap-2 border-b border-stone-100 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex min-w-0 gap-3">
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md ${feedIconClass(item.tone)}`}>
                    {feedIcon(item)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-black text-stone-900">{item.title}</p>
                    <p className="text-sm leading-6 text-stone-600">{item.body}</p>
                  </div>
                </div>
                <span className="w-fit rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600">
                  {formatFeedTime(item.at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={`${days}-day history`} icon={<CalendarDays size={18} />}>
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(72px,1fr))]">
          {history.map((item) => {
            const isToday = item.dateKey === todayKey;
            const barHeight = Math.max(8, Math.round((item.rounds / highestRounds) * 76));
            return (
              <button
                key={item.dateKey}
                type="button"
                className={`flex min-w-0 flex-col items-center gap-2 rounded-md border px-2 py-3 text-center ${
                  isToday ? "border-saffron-400 bg-saffron-50 shadow-sm" : "border-stone-200 bg-white shadow-sm hover:border-saffron-200"
                }`}
                onClick={() => {
                  setSelectedDate(item.dateKey);
                  showMessage(`Selected ${formatDate(item.dateKey)} in the rounds editor.`);
                }}
                title={`${formatDate(item.dateKey)}: ${item.rounds} rounds`}
              >
                <div className="flex h-20 w-full items-end rounded bg-stone-50 px-1 py-1">
                  <div
                    className={`w-full rounded-sm ${item.rounds > 0 ? "bg-peacock-500" : "bg-stone-200"}`}
                    style={{ height: `${item.rounds > 0 ? barHeight : 8}px` }}
                  />
                </div>
                <span className="text-sm font-black text-stone-900">{item.rounds}</span>
                <span className={`truncate text-xs ${isToday ? "font-black text-saffron-800" : "text-stone-500"}`}>
                  {isToday ? "Today" : shortDate(item.dateKey)}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Logged days" icon={<ListChecks size={18} />}>
        <div className="mb-4 rounded-md border border-peacock-100 bg-peacock-50 px-4 py-3 text-sm leading-6 text-peacock-900">
          <div className="flex items-center gap-2 font-black">
            <ShieldCheck size={16} />
            Data confidence
          </div>
          <p>Rounds are self-entered. Dates marked editable can still be corrected from Home; older dates are locked by the 7-day edit rule.</p>
        </div>
        {allEntries.length === 0 ? (
          <EmptyState text="No chanting history yet. Add rounds on Home and your logged days will appear here." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            {allEntries.slice(0, 60).map((entry) => {
              const previousDate = addDays(entry.localDate, -1);
              const previousRounds = roundsForDate(state.chantTotals, currentUser.id, previousDate);
              const delta = entry.rounds - previousRounds;
              const isEditable = editableDates.includes(entry.localDate);
              const freshness = freshnessLabel(entry.updatedAt);
              return (
                <div key={entry.localDate} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-stone-100 bg-white px-3 py-3 last:border-b-0 sm:grid-cols-[1fr_90px_90px] sm:px-4">
                  <div>
                    <p className="font-black text-stone-900">{formatDate(entry.localDate)}</p>
                    <p className="text-sm text-stone-500">Updated {new Date(entry.updatedAt).toLocaleString()}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ConfidenceBadge tone="peacock" text="Self-entered" />
                      <ConfidenceBadge tone={isEditable ? "saffron" : "stone"} text={isEditable ? "Editable" : "Locked"} />
                      <ConfidenceBadge tone={freshness === "Updated today" ? "emerald" : "stone"} text={freshness} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-peacock-900">{entry.rounds}</p>
                    <p className="text-xs text-stone-500">rounds</p>
                  </div>
                  <div className="col-span-2 text-right text-sm font-bold sm:col-span-1">
                    <span className={delta >= 0 ? "text-emerald-700" : "text-red-700"}>
                      {delta === 0 ? "same" : delta > 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function formatFeedTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

function feedIcon(item: ActivityFeedItem) {
  if (item.id.startsWith("milestone")) return <Award size={17} />;
  if (item.id.startsWith("goal")) return <CheckCircle2 size={17} />;
  if (item.id.startsWith("streak")) return <Flame size={17} />;
  if (item.id.startsWith("group") || item.id.startsWith("friend")) return <Users size={17} />;
  return <ListChecks size={17} />;
}

function feedIconClass(tone: ActivityFeedItem["tone"]) {
  if (tone === "emerald") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  if (tone === "saffron") return "bg-saffron-50 text-saffron-900 ring-1 ring-saffron-100";
  if (tone === "peacock") return "bg-peacock-50 text-peacock-900 ring-1 ring-peacock-100";
  return "bg-stone-100 text-stone-600 ring-1 ring-stone-200";
}

function SummaryTile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <p className="mt-1 text-3xl font-black text-stone-900">{value}</p>
      <p className="text-sm text-stone-600">{note}</p>
    </div>
  );
}

function ConfidenceBadge({ tone, text }: { tone: "peacock" | "saffron" | "emerald" | "stone"; text: string }) {
  const toneClass =
    tone === "peacock"
      ? "bg-peacock-50 text-peacock-900 ring-peacock-100"
      : tone === "saffron"
        ? "bg-saffron-50 text-saffron-900 ring-saffron-100"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
          : "bg-stone-100 text-stone-700 ring-stone-200";
  return <span className={`rounded-md px-2 py-1 text-xs font-black ring-1 ${toneClass}`}>{text}</span>;
}

function freshnessLabel(updatedAt: string) {
  const updated = new Date(updatedAt);
  const now = new Date();
  if (updated.toDateString() === now.toDateString()) return "Updated today";
  const ageMs = now.getTime() - updated.getTime();
  if (ageMs >= 0 && ageMs < 7 * 24 * 60 * 60 * 1000) return "Updated this week";
  return "Older update";
}

function shortDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short"
  });
}

function parseCsvRows(text: string) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const cells: string[] = [];
      let cell = "";
      let quoted = false;
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];
        if (char === '"' && quoted && next === '"') {
          cell += '"';
          index += 1;
        } else if (char === '"') {
          quoted = !quoted;
        } else if (char === "," && !quoted) {
          cells.push(cell);
          cell = "";
        } else {
          cell += char;
        }
      }
      cells.push(cell);
      return cells.map((value) => value.trim());
    });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
