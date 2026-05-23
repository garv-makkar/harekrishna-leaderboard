"use client";

import { useState } from "react";
import { Award, CalendarDays, Flame } from "lucide-react";
import type { LeaderboardPeriod } from "@/lib/types";
import { useChanting } from "../ChantingContext";
import {
  bestStreak,
  computeMilestones,
  currentStreak,
  daysChantedThisMonth,
  formatDate,
  localDayBoundaryText,
  MAX_DAILY_ROUNDS,
  rankUsers,
  recentChantingHistory,
  sumRounds
} from "../domain";
import { Field, Leaderboard, MetricCard, MilestoneGrid, Panel } from "../ui";

export function HomePage() {
  const {
    state,
    currentUser,
    todayKey,
    selectedDate,
    setSelectedDate,
    editableDates,
    currentRounds,
    roundInput,
    setRoundInput,
    draftRounds,
    draftDelta,
    adjustDraftRounds,
    setDailyRounds,
    isBusy
  } = useChanting();
  const [previousDraft, setPreviousDraft] = useState<number | null>(null);

  if (!currentUser) return null;

  const history = recentChantingHistory(state.chantTotals, currentUser.id, todayKey, 7);
  const highestHistoryRounds = Math.max(1, ...history.map((item) => item.rounds));
  const streakNow = currentStreak(state.chantTotals, currentUser.id, todayKey);
  const streakBest = bestStreak(state.chantTotals, currentUser.id);
  const monthDays = daysChantedThisMonth(state.chantTotals, currentUser.id, todayKey);
  const milestones = computeMilestones(state, currentUser, todayKey);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["daily", "weekly", "monthly", "allTime"] as LeaderboardPeriod[]).map((item) => (
          <MetricCard
            key={item}
            label={item === "allTime" ? "All time" : item}
            value={sumRounds(state.chantTotals, currentUser.id, item, todayKey)}
            note={item === "allTime" ? `Since ${formatDate(currentUser.joinedAt.slice(0, 10))}` : "Rounds"}
          />
        ))}
      </div>
      <Panel title="Milestones" icon={<Award size={18} />}>
        <MilestoneGrid milestones={milestones} limit={4} />
      </Panel>
      <Panel title="Chanting consistency" icon={<Flame size={18} />}>
        <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-md border border-saffron-200 bg-saffron-50 px-4 py-3 shadow-sm">
              <p className="text-sm font-bold text-stone-600">Current streak</p>
              <p className="mt-1 text-3xl font-black text-saffron-900">{streakNow}</p>
              <p className="text-sm text-stone-600">day{streakNow === 1 ? "" : "s"}</p>
            </div>
            <div className="rounded-md border border-peacock-100 bg-peacock-50 px-4 py-3 shadow-sm">
              <p className="text-sm font-bold text-stone-600">Best streak</p>
              <p className="mt-1 text-3xl font-black text-peacock-900">{streakBest}</p>
              <p className="text-sm text-stone-600">day{streakBest === 1 ? "" : "s"}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 shadow-sm">
              <p className="text-sm font-bold text-stone-600">Days this month</p>
              <p className="mt-1 text-3xl font-black text-stone-900">{monthDays}</p>
              <p className="text-sm text-stone-600">with rounds logged</p>
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-stone-900">Last 7 days</p>
                <p className="text-sm text-stone-600">Tap an editable date below in the rounds form to update it.</p>
              </div>
              <span className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900">
                {history.reduce((sum, item) => sum + item.rounds, 0)} rounds
              </span>
            </div>
            <div className="grid gap-2 [grid-template-columns:repeat(7,minmax(42px,1fr))]">
              {history.map((item) => {
                const barHeight = Math.max(10, Math.round((item.rounds / highestHistoryRounds) * 96));
                const isToday = item.dateKey === todayKey;
                return (
                  <div key={item.dateKey} className="flex min-w-0 flex-col items-center gap-2">
                    <div className="flex h-28 w-full items-end rounded-md bg-stone-50 px-1 py-1">
                      <div
                        className={`w-full rounded-sm ${item.rounds > 0 ? "bg-peacock-500" : "bg-stone-200"}`}
                        style={{ height: `${item.rounds > 0 ? barHeight : 8}px` }}
                      />
                    </div>
                    <p className="text-sm font-black text-stone-900">{item.rounds}</p>
                    <p className={`truncate text-xs ${isToday ? "font-black text-saffron-800" : "text-stone-500"}`}>
                      {isToday ? "Today" : formatDate(item.dateKey).replace(/,.*$/, "")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>
      <Panel title="Add or edit rounds" icon={<CalendarDays size={18} />}>
        <div className="grid gap-5 xl:grid-cols-[240px_1fr]">
          <div className="rounded-lg border border-saffron-200 bg-saffron-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-stone-600">Saved for selected date</p>
            <p className="mt-2 text-5xl font-black text-saffron-900">{currentRounds}</p>
            <p className="mt-2 text-sm text-stone-600">{formatDate(selectedDate || todayKey)}</p>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-bold text-stone-700">Editable date</span>
                <select
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
                  value={selectedDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setSelectedDate(nextDate);
                    setPreviousDraft(null);
                    const total =
                      state.chantTotals.find(
                        (item) => item.userId === currentUser.id && item.localDate === nextDate
                      )?.rounds || 0;
                    setRoundInput(String(total));
                  }}
                >
                  {editableDates.map((dateKey) => (
                    <option key={dateKey} value={dateKey}>
                      {formatDate(dateKey)}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Exact total to save"
                value={roundInput}
                onChange={(value) => {
                  setPreviousDraft(draftRounds);
                  setRoundInput(value);
                }}
                type="number"
                min={0}
                max={999}
                helper="This saves the total rounds for the selected date, not an additional amount."
              />
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[-1, 1, 4, 8, 16].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`rounded-md px-3 py-3 font-black ring-1 transition ${
                      amount < 0 ? "bg-stone-100 text-stone-800 ring-stone-200 hover:bg-stone-200" : "bg-peacock-50 text-peacock-900 ring-peacock-100 hover:bg-peacock-100"
                    }`}
                    onClick={() => {
                      setPreviousDraft(draftRounds);
                      adjustDraftRounds(amount);
                    }}
                    disabled={isBusy}
                  >
                    {amount > 0 ? `+${amount}` : amount}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-md bg-stone-100 px-3 py-3 font-black text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-200"
                  onClick={() => {
                    if (previousDraft === null) return;
                    setRoundInput(String(previousDraft));
                    setPreviousDraft(null);
                  }}
                  disabled={isBusy || previousDraft === null}
                >
                  Undo
                </button>
              </div>
              <button
                type="button"
                className="rounded-md bg-saffron-500 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-saffron-600"
                onClick={() => {
                  setPreviousDraft(null);
                  setDailyRounds(selectedDate, draftRounds);
                }}
                disabled={isBusy || draftRounds === currentRounds}
              >
                Save exact total
              </button>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Draft total: <b className="text-stone-900">{draftRounds}</b>
              {draftDelta !== 0 && <span> ({draftDelta > 0 ? `+${draftDelta}` : draftDelta} from saved)</span>}
              <span> Daily maximum is {MAX_DAILY_ROUNDS}.</span>
              <span className="block">{localDayBoundaryText(currentUser.timezone)}</span>
            </div>
          </div>
        </div>
      </Panel>
      <Leaderboard
        title="Global leaderboard"
        period="daily"
        currentUserId={currentUser.id}
        emptyText="No global chanting entries for today yet."
        rows={rankUsers(state.users, state.chantTotals, "daily", todayKey)}
      />
    </div>
  );
}
