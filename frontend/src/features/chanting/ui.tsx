"use client";

import type { LeaderboardPeriod } from "@/lib/types";
import type { Milestone, RankedUser } from "./domain";
import { detectTimezone, periodLabel, timezoneOptions } from "./domain";
import { useChanting } from "./ChantingContext";

export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  min,
  max,
  autoComplete,
  placeholder,
  inputMode,
  helper
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-stone-700">{label}</span>
      <input
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        min={min}
        max={max}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
      />
      {helper && <span className="mt-1 block text-xs leading-5 text-stone-500">{helper}</span>}
    </label>
  );
}

export function TimezoneSelect({
  country,
  value,
  onChange
}: {
  country: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const detected = detectTimezone();
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-stone-700">Timezone</span>
      <select
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        {timezoneOptions(country, value).map((timezone) => (
          <option key={timezone} value={timezone}>
            {timezone}{timezone === detected ? " (detected)" : ""}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs leading-5 text-stone-500">
        Detected from this browser: {detected}. This controls daily reset, weekly reset, and editable dates.
      </span>
    </label>
  );
}

export function InlineNotice({ children, tone }: { children: React.ReactNode; tone: "info" | "error" | "success" }) {
  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-peacock-200 bg-peacock-50 text-peacock-900";
  return (
    <div className={`rounded-md border px-4 py-3 text-sm font-semibold leading-5 shadow-sm ${toneClass}`}>
      {children}
    </div>
  );
}

export function PasswordChecklist({
  rules,
  touched
}: {
  rules: { label: string; met: boolean }[];
  touched: boolean;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50/90 px-4 py-3">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-stone-500">Password requirements</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className={`flex items-center gap-2 text-sm font-semibold ${
              rule.met ? "text-emerald-700" : touched ? "text-red-700" : "text-stone-500"
            }`}
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-xs font-black ${
                rule.met ? "bg-emerald-100" : "bg-stone-200"
              }`}
            >
              {rule.met ? "✓" : "•"}
            </span>
            {rule.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-saffron-200/80 bg-white/90 p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-saffron-50 text-saffron-700 ring-1 ring-saffron-100">
          {icon}
        </span>
        <h2 className="min-w-0 truncate text-lg font-black tracking-normal text-stone-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function MetricCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-saffron-200/80 bg-white/90 p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold capitalize text-stone-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-saffron-900 sm:text-4xl">{value}</p>
        </div>
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-peacock-400" />
      </div>
      <p className="mt-2 text-sm text-stone-600">{note}</p>
    </div>
  );
}

export function MilestoneGrid({ milestones, limit }: { milestones: Milestone[]; limit?: number }) {
  const visible = typeof limit === "number" ? milestones.slice(0, limit) : milestones;
  const earnedCount = milestones.filter((milestone) => milestone.earned).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-stone-600">
          {earnedCount} of {milestones.length} milestones earned
        </p>
        <span className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900">
          {Math.round((earnedCount / Math.max(1, milestones.length)) * 100)}%
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visible.map((milestone) => {
          const percent = Math.round((milestone.progress / Math.max(1, milestone.target)) * 100);
          return (
            <div
              key={milestone.id}
              className={`rounded-md border px-4 py-3 ${
                milestone.earned
                  ? "border-saffron-200 bg-saffron-50"
                  : "border-stone-200 bg-stone-50"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-stone-900">{milestone.title}</p>
                  <p className="mt-1 text-sm leading-5 text-stone-600">{milestone.description}</p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-black ${
                    milestone.earned ? "bg-peacock-50 text-peacock-900" : "bg-white text-stone-600"
                  }`}
                >
                  {milestone.earned ? "Earned" : `${percent}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={milestone.earned ? "h-full bg-saffron-500" : "h-full bg-peacock-500"}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-stone-500">
                {milestone.progress} / {milestone.target}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PeriodTabs({
  value,
  onChange,
  options
}: {
  value: LeaderboardPeriod;
  onChange: (period: LeaderboardPeriod) => void;
  options: LeaderboardPeriod[];
}) {
  return (
    <div className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-bold capitalize transition ${
            value === option ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
          }`}
          onClick={() => onChange(option)}
        >
          {periodLabel(option)}
        </button>
      ))}
    </div>
  );
}

export function PeriodHistoryControls({
  offset,
  onChange,
  label
}: {
  offset: number;
  onChange: (offset: number) => void;
  label: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 shadow-sm"
        onClick={() => onChange(offset + 1)}
      >
        Previous
      </button>
      <button
        type="button"
        className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 shadow-sm disabled:text-stone-400"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - 1))}
      >
        Next
      </button>
      <button
        type="button"
        className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100"
        onClick={() => onChange(0)}
      >
        Current
      </button>
      <span className="rounded-md border border-peacock-100 bg-peacock-50 px-3 py-2 text-sm font-black text-peacock-900">
        {label}
      </span>
    </div>
  );
}

export function Leaderboard({
  title,
  rows,
  period,
  periodText,
  currentUserId,
  emptyText
}: {
  title: string;
  rows: RankedUser[];
  period: LeaderboardPeriod;
  periodText?: string;
  currentUserId: string;
  emptyText: string;
}) {
  const { setSelectedPublicUserId } = useChanting();
  const activeRows = rows.filter((row) => row.rounds > 0);
  const currentRow = rows.find((row) => row.user.id === currentUserId);
  const visibleRows = rows.filter((row) => row.rounds > 0 || row.hasEntry || row.user.id === currentUserId);
  if (visibleRows.length === 0) return <EmptyState text={emptyText} />;
  const tiedWithCount = currentRow
    ? rows.filter((row) => row.user.id !== currentUserId && row.rounds === currentRow.rounds && row.rank === currentRow.rank).length
    : 0;
  const nextScore = currentRow
    ? [...new Set(rows.filter((row) => row.rounds > currentRow.rounds).map((row) => row.rounds))].sort((a, b) => a - b)[0]
    : undefined;
  const roundsBehind = currentRow && nextScore ? nextScore - currentRow.rounds : 0;

  return (
    <div>
      {title && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-black text-stone-900">{title}</h3>
          <span className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900">
            {periodText || periodLabel(period)}
          </span>
        </div>
      )}
      <div className="mb-4 rounded-md border border-peacock-100 bg-peacock-50/90 px-4 py-3 text-sm leading-6 text-peacock-900">
        Leaderboard totals are self-entered by users. Rows show whether a user logged an entry for this period and when their visible total was last updated.
      </div>
      {activeRows.length === 0 && (
        <div className="mb-4">
          <EmptyState text={emptyText} />
        </div>
      )}
      {currentRow && (
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-saffron-200 bg-saffron-50 px-4 py-3">
            <p className="text-xs font-black uppercase text-stone-500">Your rank</p>
            <p className="mt-1 text-2xl font-black text-saffron-900">{currentRow.rounds > 0 ? `#${currentRow.rank}` : "-"}</p>
            <p className="text-sm text-stone-600">{periodText || periodLabel(period)}</p>
          </div>
          <div className="rounded-md border border-peacock-100 bg-peacock-50 px-4 py-3">
            <p className="text-xs font-black uppercase text-stone-500">Your rounds</p>
            <p className="mt-1 text-2xl font-black text-peacock-900">{currentRow.rounds}</p>
            <p className="text-sm text-stone-600">{entryStatusText(currentRow)}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs font-black uppercase text-stone-500">Next rank</p>
            <p className="mt-1 text-2xl font-black text-stone-900">{roundsBehind || "-"}</p>
            <p className="text-sm text-stone-600">
              {roundsBehind ? `${roundsBehind} rounds behind` : "You are at the top score"}
            </p>
          </div>
          <div className="rounded-md border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase text-stone-500">Status</p>
            <p className="mt-1 text-2xl font-black text-stone-900">
              {tiedWithCount > 0 && currentRow.rounds > 0
                ? "Tied"
                : currentRow.rounds > 0
                  ? "Ranked"
                  : currentRow.hasEntry
                    ? "Zero logged"
                    : "No entry"}
            </p>
            <p className="text-sm text-stone-600">
              {tiedWithCount > 0 && currentRow.rounds > 0
                ? `With ${tiedWithCount} other user${tiedWithCount === 1 ? "" : "s"}`
                : currentRow.rounds > 0
                  ? lastUpdatedText(currentRow)
                  : currentRow.hasEntry
                    ? lastUpdatedText(currentRow)
                    : "Add rounds to appear"}
            </p>
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        {visibleRows.map((row) => {
          const isCurrent = row.user.id === currentUserId;
          const isTied = row.rounds > 0 && activeRows.some((other) => other.user.id !== row.user.id && other.rank === row.rank && other.rounds === row.rounds);
          return (
            <div
              key={row.user.id}
              className={`grid grid-cols-[52px_1fr] items-center gap-3 border-b border-stone-100 px-3 py-3 last:border-b-0 sm:grid-cols-[70px_1fr_92px] sm:px-4 ${
                isCurrent ? "bg-saffron-50/90 shadow-[inset_4px_0_0_#d98f08]" : "bg-white"
              }`}
            >
              <div>
                <p className="inline-flex min-w-10 justify-center rounded-md bg-stone-100 px-2 py-1 text-lg font-black text-stone-900">
                  #{row.rank}
                </p>
                {isTied && <p className="text-xs font-bold text-peacock-700">Tied</p>}
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={row.user.avatarUrl} label={row.user.displayName || row.user.username} />
                <div className="min-w-0">
                  <button
                    type="button"
                    className="max-w-full truncate text-left font-bold text-stone-900 hover:text-saffron-800"
                    onClick={() => setSelectedPublicUserId(row.user.id)}
                  >
                    {row.user.displayName || row.user.username}
                    {isCurrent && <span className="ml-2 text-xs font-black text-saffron-700">You</span>}
                  </button>
                  <p className="truncate text-sm text-stone-500">@{row.user.username}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-black ${row.hasEntry ? "bg-peacock-50 text-peacock-900" : "bg-stone-100 text-stone-600"}`}>
                      {entryStatusText(row)}
                    </span>
                    <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600">
                      {lastUpdatedText(row)}
                    </span>
                    {row.lastUpdatedAt && (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                        {freshnessText(row)}
                      </span>
                    )}
                    <span className="rounded-md bg-saffron-50 px-2 py-1 text-xs font-bold text-saffron-900">
                      Self-entered
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-right sm:col-span-1">
                <div className={`rounded-md px-3 py-2 font-black ring-1 ${
                  row.rounds > 0 ? "bg-peacock-50 text-peacock-900 ring-peacock-100" : row.hasEntry ? "bg-stone-100 text-stone-700 ring-stone-200" : "bg-stone-50 text-stone-500 ring-stone-100"
                }`}>
                  {row.rounds}
                </div>
                <p className="mt-1 text-xs text-stone-500">rounds</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function entryStatusText(row: RankedUser) {
  if (!row.hasEntry) return "No entry";
  if (row.rounds === 0) return "0 logged";
  if (row.entryCount === 1) return "1 entry";
  return `${row.entryCount} entries`;
}

function lastUpdatedText(row: RankedUser) {
  if (!row.lastUpdatedAt) return "Not updated";
  return `Updated ${new Date(row.lastUpdatedAt).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function freshnessText(row: RankedUser) {
  if (!row.lastUpdatedAt) return "";
  const updated = new Date(row.lastUpdatedAt);
  const now = new Date();
  if (updated.toDateString() === now.toDateString()) return "Updated today";
  const ageMs = now.getTime() - updated.getTime();
  if (ageMs >= 0 && ageMs < 7 * 24 * 60 * 60 * 1000) return "Updated this week";
  return "Older update";
}

export function Avatar({ src, label }: { src: string; label: string }) {
  if (src) {
    return <img src={src} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-stone-200" />;
  }
  return (
    <div className="lotus-mark grid h-11 w-11 shrink-0 place-items-center rounded-md text-sm font-black text-white">
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-stone-200 bg-stone-50/80 px-4 py-5 text-sm text-stone-600">{text}</p>;
}
