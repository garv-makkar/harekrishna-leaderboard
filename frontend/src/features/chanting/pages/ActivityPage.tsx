"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Award, BarChart3, CalendarDays, CheckCircle2, Download, Flame, ListChecks, ShieldCheck, Users } from "lucide-react";
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
import { DataFreshness, EmptyState, FilterBar, PageHeader, Panel, StatCard, StatGrid } from "../ui";

const rangeOptions = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 }
];

export function ActivityPage() {
  const { state, currentUser, todayKey, editableDates, setSelectedDate, showMessage, refreshRemoteState, isBusy, loadingRemoteSlices, lastRemoteRefresh, remoteRefreshErrors } = useChanting();
  const [days, setDays] = useState(30);
  const refreshedUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    void refreshRemoteState(currentUser.id, "core");
  }, [currentUser, refreshRemoteState]);

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
  const monthCalendar = buildMonthCalendar(todayKey, currentUser.joinedAt.slice(0, 10), state.chantTotals, currentUser.id);
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
  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={`${days}-day view`}
        icon={<BarChart3 size={16} />}
        title="Activity summary"
        description="History, recent activity, and CSV export."
        actions={
          <>
            <DataFreshness
              label="Activity"
              lastUpdatedAt={lastRemoteRefresh.core}
              error={remoteRefreshErrors.core}
              isRefreshing={loadingRemoteSlices.core}
              onRefresh={() => refreshRemoteState(currentUser.id, "core")}
            />
            <button
              type="button"
              className="inline-flex w-fit items-center gap-2 rounded-md bg-peacock-600 px-3 py-2 text-sm font-black text-white shadow-sm"
              onClick={exportHistory}
            >
              <Download size={16} /> Export CSV
            </button>
          </>
        }
      >
        <FilterBar label="Range">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-black transition sm:py-2 ${
                  days === option.value ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
                }`}
                onClick={() => setDays(option.value)}
              >
                {option.label}
              </button>
            ))}
        </FilterBar>
        <StatGrid columns={4}>
          <StatCard label="Rounds" value={totalRounds} note={`last ${days} days`} tone="saffron" />
          <StatCard label="Active days" value={activeDays} note={`${days - activeDays} blank day${days - activeDays === 1 ? "" : "s"}`} tone="peacock" />
          <StatCard label="Average" value={averageOnActiveDays} note="on active days" tone="stone" />
          <StatCard label="Current streak" value={currentStreak(state.chantTotals, currentUser.id, todayKey)} note={`best ${bestStreak(state.chantTotals, currentUser.id)}`} tone="peacock" />
        </StatGrid>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <Panel title={`${days}-day history`} icon={<CalendarDays size={18} />}>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="grid auto-cols-[64px] grid-flow-col gap-2 sm:auto-cols-[72px] xl:auto-cols-fr xl:grid-flow-row xl:[grid-template-columns:repeat(auto-fit,minmax(62px,1fr))]">
              {history.map((item) => {
                const isToday = item.dateKey === todayKey;
                const barHeight = Math.max(8, Math.round((item.rounds / highestRounds) * 76));
                return (
                  <button
                    key={item.dateKey}
                    type="button"
                    className={`flex min-w-0 flex-col items-center gap-2 rounded-md border px-2 py-2 text-center ${
                      isToday ? "border-saffron-400 bg-saffron-50 shadow-sm" : "border-stone-200 bg-white shadow-sm hover:border-saffron-200"
                    }`}
                    onClick={() => {
                      setSelectedDate(item.dateKey);
                      showMessage(`Selected ${formatDate(item.dateKey)} in the rounds editor.`);
                    }}
                    title={`${formatDate(item.dateKey)}: ${item.rounds} rounds`}
                  >
                    <div className="flex h-16 w-full items-end rounded bg-stone-50 px-1 py-1 sm:h-20">
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
          </div>
        </Panel>

        <Panel title="Recent activity" icon={<ListChecks size={18} />}>
          {feedItems.length === 0 ? (
            <EmptyState text="No recent activity yet." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
              {feedItems.slice(0, 8).map((item) => (
                <div key={item.id} className="grid gap-2 border-b border-stone-100 px-3 py-2.5 last:border-b-0">
                  <div className="flex min-w-0 gap-3">
                    <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md ${feedIconClass(item.tone)}`}>
                      {feedIcon(item)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-black text-stone-900">{item.title}</p>
                      <p className="text-sm leading-5 text-stone-600">{item.body}</p>
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
      </div>

      <Panel title="This month calendar" icon={<CalendarDays size={18} />}>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="px-1 text-center text-[11px] font-black uppercase text-stone-500 sm:text-xs">
              {day}
            </div>
          ))}
          {monthCalendar.map((item) =>
            item.dateKey ? (
              <button
                key={item.dateKey}
                type="button"
                className={`min-h-[64px] rounded-md border px-1.5 py-2 text-left shadow-sm transition sm:min-h-[78px] sm:px-2 ${
                  item.isToday
                    ? "border-saffron-400 bg-saffron-50"
                    : item.isBeforeJoin
                      ? "border-stone-100 bg-stone-50 text-stone-400"
                      : item.rounds > 0
                        ? "border-peacock-100 bg-peacock-50"
                        : "border-stone-200 bg-white hover:border-saffron-200"
                }`}
                disabled={item.isBeforeJoin}
                onClick={() => {
                  setSelectedDate(item.dateKey);
                  showMessage(`Selected ${formatDate(item.dateKey)} in the rounds editor.`);
                }}
              >
                <p className="text-xs font-black text-stone-500">{Number(item.dateKey.slice(-2))}</p>
                <p className="mt-2 text-lg font-black text-stone-950">{item.rounds}</p>
                <p className="text-[11px] font-bold text-stone-500">rounds</p>
              </button>
            ) : (
              <div key={item.key} className="min-h-[64px] rounded-md bg-transparent sm:min-h-[78px]" />
            )
          )}
        </div>
      </Panel>

      <Panel title="Logged days" icon={<ListChecks size={18} />}>
        <div className="mb-3 rounded-md border border-peacock-100 bg-peacock-50 px-3 py-2 text-sm leading-5 text-peacock-900 sm:mb-4 sm:px-4 sm:py-2.5 sm:leading-6">
          <div className="flex items-center gap-2 font-black">
            <ShieldCheck size={16} />
            Data confidence
          </div>
          <p>Rounds are self-entered and can be corrected from Home.</p>
        </div>
        {allEntries.length === 0 ? (
          <EmptyState text="No logged days yet. Add rounds on Home." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            {allEntries.slice(0, 60).map((entry) => {
              const previousDate = addDays(entry.localDate, -1);
              const previousRounds = roundsForDate(state.chantTotals, currentUser.id, previousDate);
              const delta = entry.rounds - previousRounds;
              const isEditable = editableDates.includes(entry.localDate);
              const freshness = freshnessLabel(entry.updatedAt);
              return (
                <div key={entry.localDate} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-stone-100 bg-white px-3 py-2.5 last:border-b-0 sm:grid-cols-[1fr_90px_90px] sm:px-4 sm:py-3">
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

function buildMonthCalendar(todayKey: string, joinedDateKey: string, totals: { userId: string; localDate: string; rounds: number }[], userId: string) {
  const monthStart = `${todayKey.slice(0, 8)}01`;
  const startDate = new Date(`${monthStart}T00:00:00Z`);
  const firstDay = startDate.getUTCDay();
  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
  const lastDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0)).getUTCDate();
  const blanks = Array.from({ length: mondayOffset }, (_, index) => ({ key: `blank-${index}`, dateKey: "", rounds: 0, isToday: false, isBeforeJoin: false }));
  const days = Array.from({ length: lastDate }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    const dateKey = `${todayKey.slice(0, 8)}${day}`;
    return {
      key: dateKey,
      dateKey,
      rounds: totals.filter((total) => total.userId === userId && total.localDate === dateKey).reduce((sum, total) => sum + total.rounds, 0),
      isToday: dateKey === todayKey,
      isBeforeJoin: dateKey < joinedDateKey
    };
  });
  return [...blanks, ...days];
}

function shortDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short"
  });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
