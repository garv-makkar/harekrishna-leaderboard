"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Award, BarChart3, CalendarDays, CheckCircle2, ChevronRight, Download, Flame, ListChecks, Users } from "lucide-react";
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
  { label: "30 days", value: 30 }
];

type ActivityFilter = "all" | "rounds" | "milestones" | "social";

const activityFilterOptions: { label: string; value: ActivityFilter }[] = [
  { label: "All", value: "all" },
  { label: "Rounds", value: "rounds" },
  { label: "Milestones", value: "milestones" },
  { label: "Groups/friends", value: "social" }
];

export function ActivityPage() {
  const { state, currentUser, todayKey, editableDates, setSelectedDate, showMessage, refreshRemoteState } = useChanting();
  const [days, setDays] = useState(30);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
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
  const averageOnActiveDays = activeDays ? Math.round((totalRounds / activeDays) * 10) / 10 : 0;
  const allEntries = state.chantTotals
    .filter((total) => total.userId === currentUser.id && total.rounds > 0)
    .sort((a, b) => b.localDate.localeCompare(a.localDate));
  const weeklyHistory = recentChantingHistory(state.chantTotals, currentUser.id, todayKey, 7);
  const weeklyActiveDays = weeklyHistory.filter((item) => item.rounds > 0).length;
  const weeklyRounds = weeklyHistory.reduce((sum, item) => sum + item.rounds, 0);
  const personalBests = computePersonalBests(state.chantTotals, currentUser.id);
  const recoveryInsight = buildRecoveryInsight(weeklyHistory);
  const feedItems = buildActivityFeed(state, currentUser.id, todayKey)
    .filter((item) => activityFeedMatchesFilter(item, activityFilter))
    .slice(0, 10);
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
      <Panel title="Activity overview" icon={<BarChart3 size={18} />}>
        <div className="mb-3 rounded-lg border border-stone-200 bg-stone-50 p-2 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm sm:flex">
              {rangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-sm font-black transition ${
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-peacock-600 px-3 py-2 text-sm font-black text-white shadow-sm sm:w-fit"
              onClick={exportHistory}
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <ActivityMetric label="Rounds" value={totalRounds} note={`last ${days} days`} tone="saffron" />
          <ActivityMetric label="Active days" value={activeDays} note={`${days - activeDays} blank day${days - activeDays === 1 ? "" : "s"}`} tone="peacock" />
          <ActivityMetric label="Active average" value={averageOnActiveDays} note="rounds per chanting day" tone="stone" />
          <ActivityMetric
            label="Current streak"
            value={currentStreak(state.chantTotals, currentUser.id, todayKey)}
            note={`best ${bestStreak(state.chantTotals, currentUser.id)}`}
            tone="peacock"
          />
        </div>
        <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-peacock-100 bg-peacock-50/75 px-3 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase text-stone-500">Weekly consistency</p>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-peacock-900 ring-1 ring-peacock-100">
                {weeklyActiveDays} of 7 days active
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-peacock-900">{weeklyRounds}</p>
            <p className="text-sm leading-5 text-stone-600">rounds in the last 7 days</p>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {weeklyHistory.map((item) => (
                <span
                  key={item.dateKey}
                  className={`h-2 rounded-full ${item.rounds > 0 ? "bg-peacock-500" : "bg-stone-200"}`}
                  title={`${formatDate(item.dateKey)}: ${item.rounds} rounds`}
                />
              ))}
            </div>
            <p className="mt-3 text-sm leading-5 text-stone-700">{recoveryInsight}</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white px-3 py-3 shadow-sm">
            <p className="mb-2 text-xs font-black uppercase text-stone-500">Personal bests</p>
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
              <BestStat label="Best day" value={personalBests.bestDayRounds} note={personalBests.bestDayDate ? formatDate(personalBests.bestDayDate) : "No entries yet"} />
              <BestStat label="Best week" value={personalBests.bestWeekRounds} note={personalBests.bestWeekStart ? `Week of ${formatDate(personalBests.bestWeekStart)}` : "No entries yet"} />
              <BestStat label="Best month" value={personalBests.bestMonthRounds} note={personalBests.bestMonthStart ? formatMonth(personalBests.bestMonthStart) : "No entries yet"} />
              <BestStat label="Longest streak" value={bestStreak(state.chantTotals, currentUser.id)} note="days in a row" />
            </div>
          </div>
        </div>
      </Panel>

      <div>
        <Panel title="Recent activity" icon={<ListChecks size={18} />}>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1 shadow-sm sm:flex sm:flex-wrap">
            {activityFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-black transition ${
                  activityFilter === option.value ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
                }`}
                onClick={() => setActivityFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {feedItems.length === 0 ? (
            <EmptyState text={activityFilter === "all" ? "No recent activity yet." : "No activity matches this filter yet."} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
              {feedItems.slice(0, 6).map((item) => (
                <div key={item.id} className="border-b border-stone-100 px-3 py-2.5 last:border-b-0">
                  <div className="flex min-w-0 gap-3">
                    <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md ${feedIconClass(item.tone)}`}>
                      {feedIcon(item)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-black text-stone-900">{item.title}</p>
                      <p className="text-sm leading-5 text-stone-600">{item.body}</p>
                      <p className="mt-1 text-xs font-bold text-stone-500">{formatFeedTime(item.at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <ActivityDetailsSection
        title="This month calendar"
        icon={<CalendarDays size={18} />}
        summary={`${activeDays} active day${activeDays === 1 ? "" : "s"} in the selected range`}
      >
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
      </ActivityDetailsSection>

      <ActivityDetailsSection
        title="Logged days"
        icon={<ListChecks size={18} />}
        summary={`${allEntries.length} saved chanting day${allEntries.length === 1 ? "" : "s"}`}
      >
        {allEntries.length === 0 ? (
          <EmptyState text="No logged days yet. Add rounds on Home." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            {allEntries.slice(0, 60).map((entry) => {
              const previousDate = addDays(entry.localDate, -1);
              const previousRounds = roundsForDate(state.chantTotals, currentUser.id, previousDate);
              const delta = entry.rounds - previousRounds;
              const isEditable = editableDates.includes(entry.localDate);
              return (
                <div key={entry.localDate} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-stone-100 bg-white px-3 py-2.5 last:border-b-0 sm:grid-cols-[1fr_88px_88px_90px] sm:px-4 sm:py-3">
                  <div>
                    <p className="font-black text-stone-900">{formatDate(entry.localDate)}</p>
                    <p className="text-sm text-stone-500">Updated {new Date(entry.updatedAt).toLocaleString()}</p>
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
                  <div className="col-span-2 text-right text-sm font-bold text-stone-600 sm:col-span-1">
                    {isEditable ? "Editable" : "Locked"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ActivityDetailsSection>
    </div>
  );
}

function ActivityMetric({
  label,
  value,
  note,
  tone
}: {
  label: string;
  value: number;
  note: string;
  tone: "saffron" | "peacock" | "stone";
}) {
  const toneClass =
    tone === "saffron"
      ? "border-saffron-200 bg-saffron-50/80 text-saffron-900"
      : tone === "peacock"
        ? "border-peacock-100 bg-peacock-50/80 text-peacock-900"
        : "border-stone-200 bg-white text-stone-900";
  return (
    <div className={`rounded-lg border px-3 py-2.5 shadow-sm ${toneClass}`}>
      <p className="truncate text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="text-sm leading-5 text-stone-600">{note}</p>
    </div>
  );
}

function BestStat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="truncate text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-black text-stone-950">{value}</p>
      <p className="truncate text-xs font-bold text-stone-500">{note}</p>
    </div>
  );
}

function ActivityDetailsSection({
  title,
  icon,
  summary,
  children
}: {
  title: string;
  icon: ReactNode;
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-lg border border-saffron-200/80 bg-white/92 shadow-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-saffron-50 text-saffron-700 ring-1 ring-saffron-100">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-black text-stone-950">{title}</span>
            <span className="block truncate text-xs font-bold text-stone-500">{summary}</span>
          </span>
        </span>
        <ChevronRight className="shrink-0 text-stone-400 transition group-open:rotate-90" size={18} />
      </summary>
      <div className="border-t border-saffron-100 p-3 sm:p-4">{children}</div>
    </details>
  );
}

function activityFeedMatchesFilter(item: ActivityFeedItem, filter: ActivityFilter) {
  if (filter === "all") return true;
  if (filter === "rounds") {
    return item.id.startsWith("rounds") || item.id.startsWith("goal") || item.id.startsWith("streak");
  }
  if (filter === "milestones") return item.id.startsWith("milestone");
  return item.id.startsWith("group") || item.id.startsWith("friend");
}

function buildRecoveryInsight(history: { dateKey: string; rounds: number }[]) {
  const missedDays = history.filter((item) => item.rounds === 0).length;
  let trailingMissedDays = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].rounds > 0) break;
    trailingMissedDays += 1;
  }

  if (trailingMissedDays >= 2) {
    return "A quieter stretch is okay. Restart with one small honest entry, then build from there.";
  }
  if (trailingMissedDays === 1) {
    return "One quiet day does not erase the rhythm. A simple entry today gets the thread moving again.";
  }
  if (missedDays === 0) {
    return "Clean week. Keep the pace steady and protect the time that is already working.";
  }
  return "There were a few gaps, but the week is still active. Notice what helped on the chanting days and repeat that.";
}

function computePersonalBests(
  totals: { userId: string; localDate: string; rounds: number }[],
  userId: string
) {
  const entries = totals.filter((total) => total.userId === userId && total.rounds > 0);
  const bestDay = entries.reduce(
    (best, entry) => (entry.rounds > best.rounds ? entry : best),
    { userId, localDate: "", rounds: 0 }
  );
  const weekTotals = new Map<string, number>();
  const monthTotals = new Map<string, number>();
  entries.forEach((entry) => {
    const weekStart = mondayStart(entry.localDate);
    weekTotals.set(weekStart, (weekTotals.get(weekStart) || 0) + entry.rounds);
    const monthStart = `${entry.localDate.slice(0, 7)}-01`;
    monthTotals.set(monthStart, (monthTotals.get(monthStart) || 0) + entry.rounds);
  });
  const bestWeek = Array.from(weekTotals.entries()).reduce(
    (best, [weekStart, rounds]) => (rounds > best.rounds ? { weekStart, rounds } : best),
    { weekStart: "", rounds: 0 }
  );
  const bestMonth = Array.from(monthTotals.entries()).reduce(
    (best, [monthStart, rounds]) => (rounds > best.rounds ? { monthStart, rounds } : best),
    { monthStart: "", rounds: 0 }
  );

  return {
    bestDayDate: bestDay.localDate,
    bestDayRounds: bestDay.rounds,
    bestWeekStart: bestWeek.weekStart,
    bestWeekRounds: bestWeek.rounds,
    bestMonthStart: bestMonth.monthStart,
    bestMonthRounds: bestMonth.rounds
  };
}

function mondayStart(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function formatMonth(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
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

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
