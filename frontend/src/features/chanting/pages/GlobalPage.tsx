"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { useChanting } from "../ChantingContext";
import { latestChantUpdate, latestUpdateLabel, leaderboardRange, rankUsersInRange } from "../domain";
import { Leaderboard, Panel } from "../ui";

export function GlobalPage() {
  const { state, currentUser, period, setPeriod, todayKey, refreshRemoteState } = useChanting();
  const [periodOffset, setPeriodOffset] = useState(0);
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
      <Panel title="Global leaderboard" icon={<Trophy size={18} />}>
        <LeaderboardControlBar
          period={period}
          setPeriod={setPeriod}
          periodOffset={periodOffset}
          setPeriodOffset={setPeriodOffset}
          rangeLabel={range.label}
          chips={[
            `${state.users.length} user${state.users.length === 1 ? "" : "s"}`,
            `${activeUserCount} active`,
            lastUpdated ? `Updated ${lastUpdated}` : "No updates yet"
          ]}
        />
        <Leaderboard
          compact
          title=""
          period={period}
          periodText={range.label}
          currentUserId={currentUser.id}
          emptyText="No global rounds saved for this period yet."
          visibility="all"
          rows={rankUsersInRange(state.users, state.chantTotals, range.start, range.end)}
        />
      </Panel>
    </div>
  );
}

function LeaderboardControlBar({
  period,
  setPeriod,
  periodOffset,
  setPeriodOffset,
  rangeLabel,
  chips
}: {
  period: "daily" | "weekly" | "monthly" | "allTime";
  setPeriod: (period: "daily" | "weekly" | "monthly" | "allTime") => void;
  periodOffset: number;
  setPeriodOffset: (offset: number) => void;
  rangeLabel: string;
  chips: string[];
}) {
  return (
    <div className="mb-3 rounded-lg border border-stone-200 bg-stone-50 p-2 shadow-sm">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm sm:flex">
          {(["daily", "weekly", "monthly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-black transition ${
                period === option ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
              }`}
              onClick={() => setPeriod(option)}
            >
              {option === "daily" ? "Today" : option === "weekly" ? "Week" : "Month"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 sm:flex xl:shrink-0">
          <button
            type="button"
            className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 shadow-sm"
            onClick={() => setPeriodOffset(periodOffset + 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 shadow-sm disabled:text-stone-400"
            disabled={periodOffset === 0}
            onClick={() => setPeriodOffset(Math.max(0, periodOffset - 1))}
          >
            Next
          </button>
          <button
            type="button"
            className="rounded-md bg-saffron-50 px-3 py-1.5 text-sm font-black text-saffron-900 ring-1 ring-saffron-100"
            onClick={() => setPeriodOffset(0)}
          >
            {rangeLabel}
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <span key={chip} className="rounded-md bg-peacock-50 px-2.5 py-1.5 text-xs font-black text-peacock-900 ring-1 ring-peacock-100">
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
