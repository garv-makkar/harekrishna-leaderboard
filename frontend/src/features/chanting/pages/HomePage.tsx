"use client";

import { useState } from "react";
import { Award, CalendarDays, Download, Flame, Medal, Moon, PlusCircle, Target } from "lucide-react";
import { useChanting } from "../ChantingContext";
import {
  approximateHinduCalendar,
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
import { ActionEmptyState, Field, Leaderboard, MetricCard, MilestoneGrid, Panel } from "../ui";

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
  const [shareStatus, setShareStatus] = useState("");

  if (!currentUser) return null;

  const history = recentChantingHistory(state.chantTotals, currentUser.id, todayKey, 7);
  const highestHistoryRounds = Math.max(1, ...history.map((item) => item.rounds));
  const streakNow = currentStreak(state.chantTotals, currentUser.id, todayKey);
  const streakBest = bestStreak(state.chantTotals, currentUser.id);
  const monthDays = daysChantedThisMonth(state.chantTotals, currentUser.id, todayKey);
  const milestones = computeMilestones(state, currentUser, todayKey);
  const weeklyRounds = sumRounds(state.chantTotals, currentUser.id, "weekly", todayKey);
  const monthlyRounds = sumRounds(state.chantTotals, currentUser.id, "monthly", todayKey);
  const allTimeRounds = sumRounds(state.chantTotals, currentUser.id, "allTime", todayKey);
  const sevenDayRounds = history.reduce((sum, item) => sum + item.rounds, 0);
  const selectedDateLabel = selectedDate === todayKey ? "Today" : formatDate(selectedDate || todayKey);
  const hasStartedChanting = allTimeRounds > 0;
  const hinduDay = approximateHinduCalendar(todayKey);
  const nextMilestone = milestones
    .filter((milestone) => !milestone.earned)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];
  const latestEarnedMilestone = [...milestones].reverse().find((milestone) => milestone.earned);
  const earnedMilestoneCount = milestones.filter((milestone) => milestone.earned).length;
  const setPresetTotal = (value: number) => {
    setPreviousDraft(draftRounds);
    setRoundInput(String(Math.max(0, Math.min(MAX_DAILY_ROUNDS, value))));
  };
  const downloadShareCard = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, "#fff7ed");
    gradient.addColorStop(1, "#e0f2f1");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#d98f08";
    ctx.fillRect(0, 0, 1200, 18);
    ctx.fillStyle = "#1c1917";
    ctx.font = "900 54px Arial";
    ctx.fillText("Hare Krishna Leaderboard", 72, 110);
    ctx.font = "700 28px Arial";
    ctx.fillStyle = "#57534e";
    ctx.fillText(`${currentUser.displayName || currentUser.username} • ${formatDate(todayKey)}`, 72, 156);
    ctx.fillStyle = "#0f766e";
    ctx.font = "900 150px Arial";
    ctx.fillText(String(currentRounds), 72, 330);
    ctx.font = "900 42px Arial";
    ctx.fillStyle = "#1c1917";
    ctx.fillText("rounds today", 72, 382);
    ctx.font = "700 30px Arial";
    ctx.fillStyle = "#57534e";
    ctx.fillText(`${weeklyRounds} this week • ${streakNow} day streak • ${allTimeRounds} all time`, 72, 450);
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(72, 500, 700, 58);
    ctx.fillStyle = "#92400e";
    ctx.font = "800 24px Arial";
    ctx.fillText(`${hinduDay.paksha} ${hinduDay.name}${hinduDay.isEkadashi ? " • Ekadashi" : ""}`, 96, 538);
    ctx.fillStyle = "#0f766e";
    ctx.font = "900 88px Arial";
    ctx.fillText("HK", 930, 330);
    ctx.font = "700 24px Arial";
    ctx.fillStyle = "#57534e";
    ctx.fillText("Self-entered chanting log", 838, 374);
    const link = document.createElement("a");
    link.download = `chanting-share-${currentUser.username}-${todayKey}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setShareStatus("Share card downloaded.");
    window.setTimeout(() => setShareStatus(""), 2500);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-saffron-200/80 bg-white/92 shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-4 sm:p-5 lg:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
                  <CalendarDays size={16} /> {selectedDateLabel}
                </div>
                <h2 className="text-2xl font-black tracking-normal text-stone-950">Add chanting rounds</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Save the exact total for today or any of the last 7 editable days.
                </p>
              </div>
              <div className="rounded-lg border border-saffron-200 bg-saffron-50 px-5 py-4 text-right shadow-sm">
                <p className="text-xs font-black uppercase text-stone-500">Saved total</p>
                <p className="mt-1 text-5xl font-black text-saffron-900">{currentRounds}</p>
                <p className="text-sm text-stone-600">rounds</p>
              </div>
            </div>

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
                helper="This is the full total for the selected date."
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-bold text-stone-700">Quick totals</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[1, 4, 8, 16, 32, 64].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-md px-3 py-3 text-sm font-black ring-1 transition ${
                      draftRounds === value
                        ? "bg-saffron-500 text-white ring-saffron-500"
                        : "bg-white text-stone-800 ring-stone-200 hover:bg-saffron-50"
                    }`}
                    onClick={() => setPresetTotal(value)}
                    disabled={isBusy}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[-1, 1, 4, 8, 16].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`rounded-md px-3 py-3 font-black ring-1 transition ${
                      amount < 0
                        ? "bg-stone-100 text-stone-800 ring-stone-200 hover:bg-stone-200"
                        : "bg-peacock-50 text-peacock-900 ring-peacock-100 hover:bg-peacock-100"
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
                Save total
              </button>
            </div>

            <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Draft total: <b className="text-stone-900">{draftRounds}</b>
              {draftDelta !== 0 && <span> ({draftDelta > 0 ? `+${draftDelta}` : draftDelta} from saved)</span>}
              <span> Daily maximum is {MAX_DAILY_ROUNDS}.</span>
              <span className="block">{localDayBoundaryText(currentUser.timezone)}</span>
            </div>
          </div>

          <aside className="border-t border-saffron-100 bg-saffron-50/70 p-4 sm:p-5 xl:border-l xl:border-t-0">
            <p className="text-sm font-black uppercase text-stone-500">Today at a glance</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <DashboardPill label="Today" value={currentRounds} note="saved rounds" tone="saffron" />
              <DashboardPill label="This week" value={weeklyRounds} note="Monday onward" tone="peacock" />
              <DashboardPill label="Current streak" value={streakNow} note={`best ${streakBest}`} tone="stone" />
            </div>
          </aside>
        </div>
      </section>

      {!hasStartedChanting && (
        <ActionEmptyState
          icon={<PlusCircle size={20} />}
          title="Start your leaderboard with today's first entry"
          text="Save even 1 round to unlock your streak, milestones, global ranking, and weekly totals."
        >
          <button
            type="button"
            className="rounded-md bg-saffron-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-saffron-600"
            disabled={isBusy}
            onClick={() => {
              setSelectedDate(todayKey);
              setRoundInput("1");
            }}
          >
            Set draft to 1
          </button>
          <button
            type="button"
            className="rounded-md bg-white px-4 py-3 text-sm font-black text-stone-800 ring-1 ring-saffron-200"
            disabled={isBusy}
            onClick={() => setDailyRounds(todayKey, 1)}
          >
            Save 1 round
          </button>
        </ActionEmptyState>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today" value={currentRounds} note="Saved rounds" />
        <MetricCard label="This week" value={weeklyRounds} note="Weeks start Monday" />
        <MetricCard label="This month" value={monthlyRounds} note={`${monthDays} active day${monthDays === 1 ? "" : "s"}`} />
        <MetricCard label="All time" value={allTimeRounds} note={`Since ${formatDate(currentUser.joinedAt.slice(0, 10))}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Vaishnava day note" icon={<Moon size={18} />}>
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-lg border border-saffron-200 bg-saffron-50 px-4 py-3">
              <p className="text-xs font-black uppercase text-stone-500">Approximate tithi</p>
              <p className="mt-1 text-2xl font-black text-saffron-900">{hinduDay.name}</p>
              <p className="text-sm font-bold text-stone-700">{hinduDay.paksha}</p>
            </div>
            <div className="rounded-lg border border-peacock-100 bg-peacock-50 px-4 py-3 text-sm leading-6 text-peacock-950">
              <p className="font-black">
                {hinduDay.isEkadashi
                  ? "Approximate Ekadashi today"
                  : hinduDay.isDashami
                    ? "Dashami: Ekadashi may be near"
                    : hinduDay.isDwadashi
                      ? "Dwadashi: check parana timings locally"
                      : "Panchang reminder"}
              </p>
              <p>{hinduDay.note}</p>
            </div>
          </div>
        </Panel>
        <Panel title="Share progress" icon={<Download size={18} />}>
          <div className="space-y-3">
            <p className="text-sm leading-6 text-stone-600">
              Download a simple image card with today&apos;s rounds, streak, and weekly total.
            </p>
            {shareStatus && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{shareStatus}</p>}
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-3 font-black text-white"
              onClick={downloadShareCard}
            >
              <Download size={18} /> Download share card
            </button>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Panel title="Chanting consistency" icon={<Flame size={18} />}>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-stone-900">Last 7 days</p>
                <p className="text-sm text-stone-600">Your recent rhythm and editable day window.</p>
              </div>
              <span className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900">
                {sevenDayRounds} rounds
              </span>
            </div>
            <div className="grid gap-2 [grid-template-columns:repeat(7,minmax(42px,1fr))]">
              {history.map((item) => {
                const barHeight = Math.max(10, Math.round((item.rounds / highestHistoryRounds) * 104));
                const isToday = item.dateKey === todayKey;
                return (
                  <button
                    key={item.dateKey}
                    type="button"
                    className={`flex min-w-0 flex-col items-center gap-2 rounded-md border px-1 py-2 transition ${
                      isToday ? "border-saffron-300 bg-saffron-50" : "border-transparent hover:border-stone-200 hover:bg-stone-50"
                    }`}
                    onClick={() => {
                      setSelectedDate(item.dateKey);
                      setPreviousDraft(null);
                      setRoundInput(String(item.rounds));
                    }}
                  >
                    <div className="flex h-28 w-full items-end rounded-md bg-stone-50 px-1 py-1">
                      <div
                        className={`w-full rounded-sm ${item.rounds > 0 ? "bg-peacock-500" : "bg-stone-200"}`}
                        style={{ height: `${item.rounds > 0 ? barHeight : 8}px` }}
                      />
                    </div>
                    <p className="text-sm font-black text-stone-900">{item.rounds}</p>
                    <p className={`max-w-full truncate text-xs ${isToday ? "font-black text-saffron-800" : "text-stone-500"}`}>
                      {isToday ? "Today" : formatDate(item.dateKey).replace(/,.*$/, "")}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel title="Milestones" icon={<Award size={18} />}>
          <AchievementSpotlight
            earnedCount={earnedMilestoneCount}
            totalCount={milestones.length}
            latestEarned={latestEarnedMilestone}
            nextMilestone={nextMilestone}
          />
          <MilestoneGrid milestones={milestones} limit={4} />
        </Panel>
      </div>

      <Leaderboard
        title="Global leaderboard"
        period="daily"
        currentUserId={currentUser.id}
        emptyText="No global chanting entries for today yet. Save your rounds and your row will appear here."
        rows={rankUsers(state.users, state.chantTotals, "daily", todayKey)}
      />
    </div>
  );
}

function AchievementSpotlight({
  earnedCount,
  totalCount,
  latestEarned,
  nextMilestone
}: {
  earnedCount: number;
  totalCount: number;
  latestEarned: ReturnType<typeof computeMilestones>[number] | undefined;
  nextMilestone: ReturnType<typeof computeMilestones>[number] | undefined;
}) {
  const nextPercent = nextMilestone
    ? Math.round((nextMilestone.progress / Math.max(1, nextMilestone.target)) * 100)
    : 100;
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-saffron-200 bg-saffron-50 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-saffron-900">
          <Medal size={18} />
          <p className="font-black">Achievement progress</p>
        </div>
        <p className="text-sm leading-6 text-stone-700">
          {earnedCount} of {totalCount} unlocked
          {latestEarned ? `, latest: ${latestEarned.title}.` : "."}
        </p>
      </div>
      <div className="rounded-lg border border-peacock-100 bg-peacock-50 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-peacock-900">
          <Target size={18} />
          <p className="font-black">{nextMilestone ? "Next milestone" : "All milestones earned"}</p>
        </div>
        {nextMilestone ? (
          <>
            <p className="text-sm font-black text-stone-900">{nextMilestone.title}</p>
            <p className="text-sm leading-6 text-stone-700">{nextMilestone.description}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full bg-peacock-500" style={{ width: `${nextPercent}%` }} />
            </div>
            <p className="mt-1 text-xs font-bold text-stone-600">
              {nextMilestone.progress} / {nextMilestone.target}
            </p>
          </>
        ) : (
          <p className="text-sm leading-6 text-stone-700">Beautiful. You have completed every milestone currently available.</p>
        )}
      </div>
    </div>
  );
}

function DashboardPill({
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
      ? "border-saffron-200 bg-white text-saffron-900"
      : tone === "peacock"
        ? "border-peacock-100 bg-white text-peacock-900"
        : "border-stone-200 bg-white text-stone-900";
  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      <p className="text-sm text-stone-600">{note}</p>
    </div>
  );
}
