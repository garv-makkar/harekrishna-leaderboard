"use client";

import { useEffect, useRef, useState } from "react";
import { Globe2, Trophy, Users } from "lucide-react";
import { useChanting } from "../ChantingContext";
import { latestChantUpdate, latestUpdateLabel, leaderboardRange, rankUsersInRange } from "../domain";
import { Leaderboard, PageHeader, Panel, PeriodHistoryControls, PeriodTabs, StatCard, StatGrid } from "../ui";

export function GlobalPage() {
  const { state, currentUser, period, setPeriod, todayKey, isBusy, refreshRemoteState } = useChanting();
  const [periodOffset, setPeriodOffset] = useState(0);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const refreshedUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    void refreshRemoteState(currentUser.id, "core");
  }, [currentUser, refreshRemoteState]);

  useEffect(() => setPeriodOffset(0), [period]);
  if (!currentUser) return null;
  const range = leaderboardRange(period, todayKey, periodOffset);
  const lastUpdated = latestUpdateLabel(latestChantUpdate(state.chantTotals, state.users.map((user) => user.id), range.start, range.end));
  const activeUserCount = state.users.filter((user) =>
    state.chantTotals.some((total) => total.userId === user.id && total.localDate >= range.start && total.localDate <= range.end && total.rounds > 0)
  ).length;
  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={range.label}
        icon={<Globe2 size={16} />}
        title="Global leaderboard"
        description="Daily, weekly, and monthly community rankings."
        stats={
          <StatGrid columns={2}>
            <StatCard icon={<Users size={17} />} label="Active users" value={activeUserCount} tone="peacock" />
            <StatCard icon={<Trophy size={17} />} label="Total users" value={state.users.length} tone="saffron" />
          </StatGrid>
        }
      />
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
          emptyText="No global rounds saved for this period yet."
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
    <div className="mb-3 grid max-w-full grid-cols-2 gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm sm:mb-4 sm:inline-flex sm:flex-wrap">
      <button
        type="button"
        className={`rounded-md px-3 py-1.5 text-sm font-black transition sm:py-2 ${!showAll ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"}`}
        onClick={() => onChange(false)}
      >
        Active only
      </button>
      <button
        type="button"
        className={`rounded-md px-3 py-1.5 text-sm font-black transition sm:py-2 ${showAll ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"}`}
        onClick={() => onChange(true)}
      >
        {allLabel}
      </button>
    </div>
  );
}
