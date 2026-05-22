"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { useChanting } from "../ChantingContext";
import { leaderboardRange, rankUsersInRange } from "../domain";
import { Leaderboard, Panel, PeriodHistoryControls, PeriodTabs } from "../ui";

export function GlobalPage() {
  const { state, currentUser, period, setPeriod, todayKey } = useChanting();
  const [periodOffset, setPeriodOffset] = useState(0);
  useEffect(() => setPeriodOffset(0), [period]);
  if (!currentUser) return null;
  const range = leaderboardRange(period, todayKey, periodOffset);
  return (
    <Panel title="Global leaderboard" icon={<Globe2 size={18} />}>
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
  );
}
