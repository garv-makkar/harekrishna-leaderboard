"use client";

import { useEffect, useState } from "react";
import { Globe2, Trophy, Users } from "lucide-react";
import { useChanting } from "../ChantingContext";
import { leaderboardRange, rankUsersInRange } from "../domain";
import { Leaderboard, Panel, PeriodHistoryControls, PeriodTabs } from "../ui";

export function GlobalPage() {
  const { state, currentUser, period, setPeriod, todayKey } = useChanting();
  const [periodOffset, setPeriodOffset] = useState(0);
  useEffect(() => setPeriodOffset(0), [period]);
  if (!currentUser) return null;
  const range = leaderboardRange(period, todayKey, periodOffset);
  const activeUserCount = state.users.filter((user) =>
    state.chantTotals.some((total) => total.userId === user.id && total.localDate >= range.start && total.localDate <= range.end && total.rounds > 0)
  ).length;
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-saffron-200/80 bg-white/92 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
              <Globe2 size={16} /> {range.label}
            </div>
            <h2 className="text-2xl font-black tracking-normal text-stone-950">Global leaderboard</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">See how the wider chanting community is doing for the selected period.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
            <GlobalMetric icon={<Users size={17} />} label="Active users" value={activeUserCount} />
            <GlobalMetric icon={<Trophy size={17} />} label="Total users" value={state.users.length} />
          </div>
        </div>
      </section>
      <Panel title="Rankings" icon={<Globe2 size={18} />}>
        <PeriodTabs value={period} onChange={setPeriod} options={["daily", "weekly", "monthly"]} />
        <PeriodHistoryControls offset={periodOffset} onChange={setPeriodOffset} label={range.label} />
        <Leaderboard
          title=""
          period={period}
          periodText={range.label}
          currentUserId={currentUser.id}
          emptyText="No global entries for this period yet."
          rows={rankUsersInRange(state.users, state.chantTotals, range.start, range.end)}
        />
      </Panel>
    </div>
  );
}

function GlobalMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-stone-500">
        {icon}
        <p className="text-xs font-black uppercase">{label}</p>
      </div>
      <p className="text-3xl font-black text-stone-950">{value}</p>
    </div>
  );
}
