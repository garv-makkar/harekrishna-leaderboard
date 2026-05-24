"use client";

import { useEffect, useState } from "react";
import { Globe2, Trophy, Users } from "lucide-react";
import { useChanting } from "../ChantingContext";
import { latestChantUpdate, latestUpdateLabel, leaderboardRange, rankUsersInRange } from "../domain";
import { Leaderboard, Panel, PeriodHistoryControls, PeriodTabs } from "../ui";

export function GlobalPage() {
  const { state, currentUser, period, setPeriod, todayKey, isBusy, refreshRemoteState } = useChanting();
  const [periodOffset, setPeriodOffset] = useState(0);
  const [showAllUsers, setShowAllUsers] = useState(false);
  useEffect(() => setPeriodOffset(0), [period]);
  if (!currentUser) return null;
  const range = leaderboardRange(period, todayKey, periodOffset);
  const lastUpdated = latestUpdateLabel(latestChantUpdate(state.chantTotals, state.users.map((user) => user.id), range.start, range.end));
  const activeUserCount = state.users.filter((user) =>
    state.chantTotals.some((total) => total.userId === user.id && total.localDate >= range.start && total.localDate <= range.end && total.rounds > 0)
  ).length;
  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-lg border border-saffron-200/80 bg-white/92 p-3 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
              <Globe2 size={16} /> {range.label}
            </div>
            <h2 className="text-xl font-black tracking-normal text-stone-950 sm:text-2xl">Global leaderboard</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">See how the wider chanting community is doing for the selected period.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:w-[360px]">
            <GlobalMetric icon={<Users size={17} />} label="Active users" value={activeUserCount} />
            <GlobalMetric icon={<Trophy size={17} />} label="Total users" value={state.users.length} />
          </div>
        </div>
      </section>
      <Panel title="Rankings" icon={<Globe2 size={18} />}>
        <PeriodTabs value={period} onChange={setPeriod} options={["daily", "weekly", "monthly"]} />
        <PeriodHistoryControls offset={periodOffset} onChange={setPeriodOffset} label={range.label} />
        <LeaderboardVisibilityToggle
          showAll={showAllUsers}
          onChange={setShowAllUsers}
          allLabel="All users"
        />
        <Leaderboard
          title=""
          period={period}
          periodText={range.label}
          currentUserId={currentUser.id}
          emptyText="No global entries for this period yet."
          visibility={showAllUsers ? "all" : "active"}
          rows={rankUsersInRange(state.users, state.chantTotals, range.start, range.end)}
          lastUpdated={lastUpdated}
          isRefreshing={isBusy}
          onRefresh={() => refreshRemoteState(currentUser.id)}
        />
      </Panel>
    </div>
  );
}

function LeaderboardVisibilityToggle({
  showAll,
  onChange,
  allLabel
}: {
  showAll: boolean;
  onChange: (value: boolean) => void;
  allLabel: string;
}) {
  return (
    <div className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        className={`rounded-md px-3 py-2 text-sm font-black transition ${!showAll ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"}`}
        onClick={() => onChange(false)}
      >
        Active only
      </button>
      <button
        type="button"
        className={`rounded-md px-3 py-2 text-sm font-black transition ${showAll ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"}`}
        onClick={() => onChange(true)}
      >
        {allLabel}
      </button>
    </div>
  );
}

function GlobalMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
      <div className="mb-2 flex items-center gap-2 text-stone-500">
        {icon}
        <p className="text-xs font-black uppercase">{label}</p>
      </div>
      <p className="text-2xl font-black text-stone-950 sm:text-3xl">{value}</p>
    </div>
  );
}
