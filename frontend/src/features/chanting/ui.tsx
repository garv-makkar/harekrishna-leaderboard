"use client";

import { useRef, useState } from "react";
import type { LeaderboardPeriod, ProfilePrivacy, UserProfile } from "@/lib/types";
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
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
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
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
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
    <div className={`rounded-md border px-3 py-2.5 text-sm font-semibold leading-5 shadow-sm sm:px-4 ${toneClass}`}>
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
    <div className="rounded-md border border-stone-200 bg-stone-50/90 px-3 py-2.5 sm:px-4 sm:py-3">
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
    <section className="rounded-lg border border-saffron-200/80 bg-white/92 p-3 shadow-soft sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-saffron-50 text-saffron-700 ring-1 ring-saffron-100">
          {icon}
        </span>
        <h2 className="min-w-0 truncate text-base font-black tracking-normal text-stone-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function Card({
  children,
  level = "section",
  className = ""
}: {
  children: React.ReactNode;
  level?: "primary" | "section" | "list";
  className?: string;
}) {
  const levelClass =
    level === "primary"
      ? "border-saffron-200 bg-saffron-50/75 shadow-soft"
      : level === "list"
        ? "border-stone-200 bg-white shadow-sm"
        : "border-stone-200 bg-stone-50/70 shadow-sm";
  return <div className={`rounded-lg border p-3 sm:p-4 ${levelClass} ${className}`}>{children}</div>;
}

export function SectionHeading({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-base font-black text-stone-950 sm:text-lg">{title}</h3>
        {description && <p className="mt-0.5 text-sm leading-6 text-stone-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  icon,
  title,
  description,
  actions,
  stats,
  children
}: {
  eyebrow?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-saffron-200/80 bg-white/92 shadow-soft">
      <div className={stats ? "grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(310px,360px)]" : ""}>
        <div className="p-4 sm:p-5">
          {(eyebrow || icon) && (
            <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-md bg-saffron-50 px-3 py-1.5 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
              {icon}
              {eyebrow && <span className="truncate">{eyebrow}</span>}
            </div>
          )}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-normal text-stone-950 sm:text-2xl">{title}</h2>
              {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">{actions}</div>}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>
        {stats && (
          <aside className="border-t border-saffron-100 bg-saffron-50/70 p-3 sm:p-4 xl:border-l xl:border-t-0">
            {stats}
          </aside>
        )}
      </div>
    </section>
  );
}

export function StatGrid({ children, columns = 3 }: { children: React.ReactNode; columns?: 2 | 3 | 4 }) {
  const columnClass =
    columns === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  return <div className={`grid gap-2 sm:gap-3 ${columnClass}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  note,
  icon,
  tone = "stone"
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  icon?: React.ReactNode;
  tone?: "saffron" | "peacock" | "stone" | "emerald";
}) {
  const toneClass =
    tone === "saffron"
      ? "border-saffron-200 bg-saffron-50/80 text-saffron-900"
      : tone === "peacock"
        ? "border-peacock-100 bg-peacock-50/80 text-peacock-900"
        : tone === "emerald"
          ? "border-emerald-100 bg-emerald-50/80 text-emerald-800"
          : "border-stone-200 bg-white text-stone-900";
  return (
    <div className={`rounded-lg border px-3 py-2.5 shadow-sm ${toneClass}`}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="truncate text-xs font-black uppercase text-stone-500">{label}</p>
        {icon && <span className="shrink-0 text-stone-500">{icon}</span>}
      </div>
      <p className="mt-0.5 truncate text-xl font-black">{value}</p>
      {note && <p className="text-xs leading-5 text-stone-600 sm:text-sm">{note}</p>}
    </div>
  );
}

export function FilterBar({
  label,
  children,
  meta
}: {
  label?: React.ReactNode;
  children: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:mb-4">
      {label && <span className="shrink-0 px-1 text-xs font-black uppercase text-stone-500">{label}</span>}
      {children}
      {meta && <span className="ml-auto rounded-md bg-stone-50 px-3 py-1.5 text-sm font-bold text-stone-600">{meta}</span>}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-stone-200/80 ${className}`} />;
}

export function PanelSkeleton({
  rows = 3,
  title = true
}: {
  rows?: number;
  title?: boolean;
}) {
  return (
    <section className="rounded-lg border border-saffron-200/80 bg-white/90 p-3 shadow-soft sm:p-4">
      {title && (
        <div className="mb-4 flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 shrink-0" />
          <SkeletonBlock className="h-5 w-44 max-w-[70%]" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="rounded-lg border border-stone-100 bg-stone-50/70 p-3">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-11 w-11 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
              <SkeletonBlock className="hidden h-9 w-20 sm:block" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MetricSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-stone-200 bg-white/90 p-3 shadow-soft sm:p-4">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-3 h-9 w-16" />
        </div>
      ))}
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-10 w-20" />
        <SkeletonBlock className="h-10 w-24" />
        <SkeletonBlock className="h-10 w-24" />
      </div>
      <SkeletonBlock className="h-11 w-full" />
      <div className="grid gap-3 lg:grid-cols-3">
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-36" />
      </div>
      <PanelSkeleton rows={4} title={false} />
    </div>
  );
}

export function MetricCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-saffron-200/80 bg-white/90 p-3 shadow-soft sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold capitalize text-stone-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-saffron-900 sm:text-3xl">{value}</p>
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
      <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
        {visible.map((milestone) => {
          const percent = Math.round((milestone.progress / Math.max(1, milestone.target)) * 100);
          return (
            <div
              key={milestone.id}
              className={`rounded-md border px-3 py-2.5 sm:px-4 sm:py-3 ${
                milestone.earned
                  ? "border-saffron-200 bg-saffron-50 shadow-sm"
                  : "border-stone-200 bg-stone-50/80"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-stone-900">{milestone.title}</p>
                  <p className="mt-1 text-sm leading-5 text-stone-600">{milestone.description}</p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-black ${
                    milestone.earned ? "bg-peacock-50 text-peacock-900" : "bg-white text-stone-600 ring-1 ring-stone-200"
                  }`}
                >
                  {milestone.earned ? "Unlocked" : `${percent}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={milestone.earned ? "h-full bg-saffron-500" : "h-full bg-peacock-500"}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-stone-500">
                {milestone.earned ? "Achievement earned" : `Locked: ${milestone.progress} / ${milestone.target}`}
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
    <div className="mb-3 inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm sm:mb-4">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm font-bold capitalize transition sm:py-2 ${
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
    <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
      <button
        type="button"
        className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 shadow-sm sm:py-2"
        onClick={() => onChange(offset + 1)}
      >
        Previous
      </button>
      <button
        type="button"
        className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 shadow-sm disabled:text-stone-400 sm:py-2"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - 1))}
      >
        Next
      </button>
      <button
        type="button"
        className="rounded-md bg-saffron-50 px-3 py-1.5 text-sm font-black text-saffron-900 ring-1 ring-saffron-100 sm:py-2"
        onClick={() => onChange(0)}
      >
        Current
      </button>
      <span className="rounded-md border border-peacock-100 bg-peacock-50 px-3 py-1.5 text-sm font-black text-peacock-900 sm:py-2">
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
  emptyText,
  visibility = "logged",
  lastUpdated,
  isRefreshing = false,
  onRefresh
}: {
  title: string;
  rows: RankedUser[];
  period: LeaderboardPeriod;
  periodText?: string;
  currentUserId: string;
  emptyText: string;
  visibility?: "active" | "logged" | "all";
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
}) {
  const { setSelectedPublicUserId } = useChanting();
  const currentRowRef = useRef<HTMLDivElement | null>(null);
  const [onlyUpdatedToday, setOnlyUpdatedToday] = useState(false);
  const [showZeroEntries, setShowZeroEntries] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [searchText, setSearchText] = useState("");
  const todayText = new Date().toDateString();
  const currentRow = rows.find((row) => row.user.id === currentUserId);
  const cleanSearch = searchText.trim().toLowerCase();
  const baseRows = rows.filter((row) => {
    if (row.user.id === currentUserId) return true;
    if (visibility === "all") return true;
    if (showZeroEntries && row.hasEntry) return true;
    if (visibility === "active") return row.rounds > 0;
    return row.rounds > 0 || row.hasEntry;
  });
  const filteredRows = baseRows.filter((row) => {
    const matchesSearch =
      !cleanSearch ||
      row.user.username.toLowerCase().includes(cleanSearch) ||
      (row.user.displayName || "").toLowerCase().includes(cleanSearch) ||
      String(row.rounds).includes(cleanSearch);
    if (!matchesSearch) return false;
    if (!onlyUpdatedToday) return true;
    if (!row.lastUpdatedAt) return false;
    return new Date(row.lastUpdatedAt).toDateString() === todayText;
  });
  const limitedRows = showAllRows ? filteredRows : filteredRows.slice(0, 10);
  const visibleRows =
    !cleanSearch && !showAllRows && currentRow && !limitedRows.some((row) => row.user.id === currentUserId) && filteredRows.some((row) => row.user.id === currentUserId)
      ? [...limitedRows, currentRow]
      : limitedRows;
  if (baseRows.length === 0) return <EmptyState text={emptyText} />;
  const activeRows = filteredRows.filter((row) => row.rounds > 0);
  const leaderRows = activeRows.slice(0, 3);
  const currentRowIndex = visibleRows.findIndex((row) => row.user.id === currentUserId);
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
          <LeaderboardRefreshMeta periodText={periodText || periodLabel(period)} lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={onRefresh} />
        </div>
      )}
      {!title && (lastUpdated || onRefresh) && (
        <div className="mb-3 flex justify-end">
          <LeaderboardRefreshMeta periodText={periodText || periodLabel(period)} lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={onRefresh} />
        </div>
      )}
      <div className="mb-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-bold leading-5 text-stone-600 sm:mb-4">
        Status guide: <b>0 saved</b> means the user intentionally saved zero rounds. <b>No entry</b> means no total has been saved for this period.
      </div>
      {activeRows.length === 0 && (
        <div className="mb-4">
          <EmptyState text={emptyText} />
        </div>
      )}
      <div className="mb-4 grid gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:flex sm:flex-wrap sm:items-center">
        <label className="min-w-0 sm:min-w-[220px] sm:flex-1">
          <span className="sr-only">Search leaderboard</span>
          <input
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-900 outline-none transition focus:border-saffron-500 focus:bg-white focus:ring-2 focus:ring-saffron-100"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search name, username, or rounds"
            type="search"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-black transition ${onlyUpdatedToday ? "bg-saffron-500 text-white" : "bg-stone-100 text-stone-700 hover:bg-saffron-50"}`}
            onClick={() => setOnlyUpdatedToday((value) => !value)}
          >
            Updated today
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-black transition ${showZeroEntries ? "bg-saffron-500 text-white" : "bg-stone-100 text-stone-700 hover:bg-saffron-50"}`}
            onClick={() => setShowZeroEntries((value) => !value)}
          >
            Show 0 saved
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-black transition ${showAllRows ? "bg-peacock-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-peacock-50"}`}
            onClick={() => setShowAllRows((value) => !value)}
          >
            {showAllRows ? "Top 10" : "All rows"}
          </button>
          <span className="rounded-md bg-stone-50 px-3 py-2 text-center text-sm font-bold text-stone-600 sm:ml-auto">
            {visibleRows.length} / {filteredRows.length}
          </span>
        </div>
        {(searchText || onlyUpdatedToday || showZeroEntries || showAllRows) && (
          <button
            type="button"
            className="rounded-md bg-white px-3 py-2 text-sm font-black text-stone-800 ring-1 ring-stone-200"
            onClick={() => {
              setSearchText("");
              setOnlyUpdatedToday(false);
              setShowZeroEntries(false);
              setShowAllRows(false);
            }}
          >
            Clear
          </button>
        )}
      </div>
      {filteredRows.length === 0 && (
        <div className="mb-4">
          <EmptyState text={cleanSearch ? `No rows match "${searchText.trim()}".` : "No rows match the current leaderboard filters."} />
        </div>
      )}
      {leaderRows.length > 0 && (
        <div className="mb-4 hidden gap-3 sm:grid lg:grid-cols-3">
          {leaderRows.map((row) => {
            const isCurrent = row.user.id === currentUserId;
            return (
              <button
                key={`leader-${row.user.id}`}
                type="button"
                className={`min-w-0 rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
                  topRankCardClass(row.rank, isCurrent)
                }`}
                onClick={() => setSelectedPublicUserId(row.user.id)}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className={`rounded-md px-3 py-2 text-sm font-black ${rankBadgeClass(row.rank)}`}>
                    {rankLabel(row.rank)}
                  </span>
                  {isCurrent && (
                    <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-black text-saffron-900 ring-1 ring-saffron-200">
                      You
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={row.user.avatarUrl} label={row.user.displayName || row.user.username} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-stone-950">{row.user.displayName || row.user.username}</p>
                    <p className="truncate text-sm text-stone-600">@{row.user.username}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-black text-stone-950">{row.rounds}</p>
                    <p className="text-sm font-bold text-stone-600">rounds</p>
                  </div>
                  <span className="rounded-md bg-white/75 px-2 py-1 text-xs font-black text-stone-700 ring-1 ring-white">
                    {entryStatusText(row)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {currentRow && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 sm:gap-3 md:grid-cols-4">
          <div className="rounded-md border border-saffron-200 bg-saffron-50 px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-xs font-black uppercase text-stone-500">Your rank</p>
            <p className="mt-1 text-xl font-black text-saffron-900 sm:text-2xl">{currentRow.rounds > 0 ? `#${currentRow.rank}` : "-"}</p>
            <p className="text-sm text-stone-600">{periodText || periodLabel(period)}</p>
          </div>
          <div className="rounded-md border border-peacock-100 bg-peacock-50 px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-xs font-black uppercase text-stone-500">Your rounds</p>
            <p className="mt-1 text-xl font-black text-peacock-900 sm:text-2xl">{currentRow.rounds}</p>
            <p className="text-sm text-stone-600">{entryStatusText(currentRow)}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-xs font-black uppercase text-stone-500">Next rank</p>
            <p className="mt-1 text-xl font-black text-stone-900 sm:text-2xl">{roundsBehind || "-"}</p>
            <p className="text-sm text-stone-600">
              {roundsBehind ? `${roundsBehind} rounds behind` : "You are at the top score"}
            </p>
          </div>
          <div className="rounded-md border border-stone-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-xs font-black uppercase text-stone-500">Status</p>
            <p className="mt-1 text-xl font-black text-stone-900 sm:text-2xl">
              {tiedWithCount > 0 && currentRow.rounds > 0
                ? "Tied"
                : currentRow.rounds > 0
                  ? "Ranked"
                  : currentRow.hasEntry
                    ? "0 saved"
                    : "No entry"}
            </p>
            <p className="text-sm text-stone-600">
              {tiedWithCount > 0 && currentRow.rounds > 0
                ? `With ${tiedWithCount} other user${tiedWithCount === 1 ? "" : "s"}`
                : currentRow.rounds > 0
                  ? lastUpdatedText(currentRow)
                  : currentRow.hasEntry
                    ? "You saved zero rounds"
                    : "Add rounds to appear"}
            </p>
          </div>
        </div>
      )}
      {currentRow && currentRowIndex > 3 && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-saffron-200 bg-saffron-50/80 px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
          <div>
            <p className="font-black text-saffron-950">Your row is lower in this leaderboard.</p>
            <p className="text-sm text-stone-600">Jump directly to your highlighted row.</p>
          </div>
          <button
            type="button"
            className="rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-saffron-600"
            onClick={() => currentRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          >
            Jump to me
          </button>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        {visibleRows.map((row) => {
          const isCurrent = row.user.id === currentUserId;
          const rowTieCount = row.rounds > 0
            ? activeRows.filter((other) => other.user.id !== row.user.id && other.rank === row.rank && other.rounds === row.rounds).length
            : 0;
          const isTied = rowTieCount > 0;
          const isTopRank = row.rounds > 0 && row.rank <= 3;
          return (
            <div
              key={row.user.id}
              ref={isCurrent ? currentRowRef : undefined}
              className={`grid grid-cols-[44px_minmax(0,1fr)_72px] items-center gap-2 border-b border-stone-100 px-2 py-2.5 last:border-b-0 sm:grid-cols-[76px_1fr_112px] sm:gap-3 sm:px-4 sm:py-3 ${
                isCurrent
                  ? "bg-saffron-50/90 shadow-[inset_3px_0_0_#d98f08]"
                  : isTopRank
                    ? "bg-white"
                    : "bg-white"
              }`}
            >
              <div>
                <p className={`inline-flex min-w-10 justify-center rounded-md px-2 py-1 text-base font-black sm:min-w-11 sm:text-lg ${rankBadgeClass(row.rank)}`}>
                  {rankLabel(row.rank)}
                </p>
                {isTied && <p className="mt-1 text-[11px] font-bold text-peacock-700 sm:text-xs">Tied with {rowTieCount}</p>}
              </div>
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Avatar src={row.user.avatarUrl} label={row.user.displayName || row.user.username} />
                <div className="min-w-0">
                  <button
                    type="button"
                    className="max-w-full truncate text-left font-bold text-stone-900 hover:text-saffron-800"
                    onClick={() => setSelectedPublicUserId(row.user.id)}
                  >
                    {row.user.displayName || row.user.username}
                    {isCurrent && <span className="ml-2 rounded-sm bg-saffron-500 px-1.5 py-0.5 text-xs font-black text-white">You</span>}
                  </button>
                  <p className="truncate text-sm text-stone-500">@{row.user.username}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-black ${row.hasEntry ? "bg-peacock-50 text-peacock-900" : "bg-stone-100 text-stone-600"}`}>
                      {entryStatusText(row)}
                    </span>
                    <span className="hidden rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600 sm:inline-flex">
                      {lastUpdatedText(row)}
                    </span>
                    {row.lastUpdatedAt && (
                      <span className="hidden rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 sm:inline-flex">
                        {freshnessText(row)}
                      </span>
                    )}
                    <span className="hidden rounded-md bg-saffron-50 px-2 py-1 text-xs font-bold text-saffron-900 sm:inline-flex">
                      Self-entered
                    </span>
                    {isTied && (
                      <span className="rounded-md bg-peacock-50 px-2 py-1 text-xs font-bold text-peacock-900">
                        Same rank
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex min-w-14 justify-center rounded-md px-3 py-2 font-black ring-1 ${
                  row.rounds > 0 ? "bg-peacock-50 text-peacock-900 ring-peacock-100" : row.hasEntry ? "bg-stone-100 text-stone-700 ring-stone-200" : "bg-stone-50 text-stone-500 ring-stone-100"
                }`}>
                  {row.rounds}
                </div>
                <p className="mt-1 hidden text-xs text-stone-500 sm:block">rounds</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderboardRefreshMeta({
  periodText,
  lastUpdated,
  isRefreshing,
  onRefresh
}: {
  periodText: string;
  lastUpdated?: string;
  isRefreshing: boolean;
  onRefresh?: () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {lastUpdated && (
        <span className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600">
          Last update {lastUpdated}
        </span>
      )}
      <span className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900">
        {periodText}
      </span>
      {onRefresh && (
        <button
          type="button"
          className="rounded-md bg-peacock-600 px-3 py-2 text-sm font-black text-white shadow-sm disabled:bg-peacock-200"
          disabled={isRefreshing}
          onClick={() => void onRefresh()}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      )}
    </div>
  );
}

function entryStatusText(row: RankedUser) {
  if (!row.hasEntry) return "No entry";
  if (row.rounds === 0) return "0 saved";
  if (row.entryCount === 1) return "1 entry";
  return `${row.entryCount} entries`;
}

function rankLabel(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `#${rank}`;
}

function rankBadgeClass(rank: number) {
  if (rank === 1) return "bg-saffron-500 text-white";
  if (rank === 2) return "bg-peacock-600 text-white";
  if (rank === 3) return "bg-saffron-50 text-saffron-900 ring-1 ring-saffron-200";
  return "bg-stone-100 text-stone-900";
}

function topRankCardClass(rank: number, isCurrent: boolean) {
  if (isCurrent) return "border-saffron-400 bg-saffron-50";
  if (rank === 1) return "border-saffron-300 bg-saffron-50";
  if (rank === 2) return "border-peacock-200 bg-peacock-50";
  if (rank === 3) return "border-saffron-200 bg-white";
  return "border-stone-200 bg-white";
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

export function PublicUserCard({
  user,
  currentUserId = "",
  meta,
  badges = [],
  stats,
  onOpenProfile,
  actions,
  compact = false,
  showCountry = true
}: {
  user: Pick<UserProfile, "id" | "username" | "displayName" | "avatarUrl" | "country">;
  currentUserId?: string;
  meta?: string;
  badges?: string[];
  stats?: { label: string; value: string | number; tone?: "saffron" | "peacock" | "stone" }[];
  onOpenProfile?: () => void;
  actions?: React.ReactNode;
  compact?: boolean;
  showCountry?: boolean;
}) {
  const displayName = user.displayName || user.username;
  return (
    <div className={`rounded-lg border border-stone-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={user.avatarUrl} label={displayName} />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {onOpenProfile ? (
                <button
                  type="button"
                  className="max-w-full truncate text-left font-black text-stone-950 hover:text-saffron-800"
                  onClick={onOpenProfile}
                >
                  {displayName}
                </button>
              ) : (
                <span className="max-w-full truncate font-black text-stone-950">{displayName}</span>
              )}
              {user.id === currentUserId && (
                <span className="rounded-sm bg-saffron-500 px-1.5 py-0.5 text-xs font-black text-white">You</span>
              )}
            </div>
            <p className="truncate text-sm font-bold text-stone-600">@{user.username}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {meta && (
                <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">
                  {meta}
                </span>
              )}
              {badges.map((badge) => (
                <span key={badge} className="rounded-md bg-peacock-50 px-2 py-1 text-xs font-black text-peacock-900">
                  {badge}
                </span>
              ))}
              {showCountry && user.country && (
                <span className="rounded-md bg-saffron-50 px-2 py-1 text-xs font-bold text-saffron-900">
                  {user.country}
                </span>
              )}
            </div>
          </div>
        </div>
        {(stats?.length || actions) && (
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            {stats?.map((stat) => (
              <span key={stat.label} className={`rounded-md px-2.5 py-1.5 text-sm font-black ${publicUserStatClass(stat.tone || "stone")}`}>
                {stat.value} <span className="font-bold">{stat.label}</span>
              </span>
            ))}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function PrivacyVisibilitySummary({ privacy }: { privacy: ProfilePrivacy }) {
  const visible = [
    privacy.showCountry ? "country" : "",
    privacy.showGroups ? "groups" : "",
    privacy.showStreak ? "streak" : "",
    privacy.showRecentHistory ? "recent history" : "",
    privacy.showMilestones ? "milestones" : ""
  ].filter(Boolean);
  const hidden = [
    !privacy.showCountry ? "country" : "",
    !privacy.showGroups ? "groups" : "",
    !privacy.showStreak ? "streak" : "",
    !privacy.showRecentHistory ? "recent history" : "",
    !privacy.showMilestones ? "milestones" : ""
  ].filter(Boolean);

  return (
    <div className="grid gap-3 rounded-lg border border-peacock-100 bg-peacock-50 px-3 py-2.5 text-sm leading-6 text-peacock-950 sm:px-4 sm:py-3 lg:grid-cols-[1fr_1fr]">
      <div>
        <p className="font-black">Always visible</p>
        <p>Username, display name, avatar, leaderboard rows, and public round totals.</p>
      </div>
      <div>
        <p className="font-black">Optional sections</p>
        <p>{visible.length ? `Visible: ${visible.join(", ")}.` : "No optional sections visible."}</p>
        {hidden.length > 0 && <p className="text-stone-700">Hidden: {hidden.join(", ")}.</p>}
      </div>
    </div>
  );
}

function publicUserStatClass(tone: "saffron" | "peacock" | "stone") {
  if (tone === "saffron") return "bg-saffron-50 text-saffron-900 ring-1 ring-saffron-100";
  if (tone === "peacock") return "bg-peacock-50 text-peacock-900 ring-1 ring-peacock-100";
  return "bg-stone-100 text-stone-700 ring-1 ring-stone-200";
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50/80 px-4 py-5 text-center">
      <p className="mx-auto max-w-lg text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}

export function ActionEmptyState({
  icon,
  title,
  text,
  children
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-saffron-200 bg-white/90 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-saffron-50 text-saffron-700 ring-1 ring-saffron-100">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="font-black text-stone-950">{title}</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
          </div>
        </div>
        {children && <div className="grid shrink-0 gap-2 sm:flex sm:flex-wrap sm:justify-end">{children}</div>}
      </div>
    </div>
  );
}
