"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Award, CalendarDays, CheckCircle2, ChevronRight, Circle, Download, Flame, History, PlusCircle, Target, Users } from "lucide-react";
import { useChanting } from "../ChantingContext";
import {
  approximateHinduCalendar,
  addDays,
  bestStreak,
  computeMilestones,
  currentStreak,
  daysChantedThisMonth,
  formatDate,
  latestChantUpdate,
  latestUpdateLabel,
  localDayBoundaryText,
  MAX_DAILY_ROUNDS,
  recentChantingHistory,
  sumRounds,
} from "../domain";
import { ActionEmptyState, Card, Field, PageHeader, Panel, StatCard, StatGrid } from "../ui";

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
    isBusy,
    updateUserPreferences,
    joinedGroups,
    groupMemberCount,
    setSelectedGroupId,
    emailVerified,
    friends,
    showActionFeedback,
    refreshRemoteState,
    loadingRemoteSlices
  } = useChanting();
  const [previousDraft, setPreviousDraft] = useState<number | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const [goalDraft, setGoalDraft] = useState("16");
  const [highRoundConfirmed, setHighRoundConfirmed] = useState(false);
  const refreshedUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    void refreshRemoteState(currentUser.id, "all");
  }, [currentUser, refreshRemoteState]);

  useEffect(() => {
    if (currentUser) setGoalDraft(String(currentUser.dailyGoal || 16));
  }, [currentUser?.dailyGoal, currentUser]);

  useEffect(() => {
    setHighRoundConfirmed(false);
  }, [draftRounds, selectedDate]);

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
  const isLoadingRelationships = loadingRemoteSlices.friends || loadingRemoteSlices.groups;
  const isFirstRun = !isLoadingRelationships && !hasStartedChanting && joinedGroups.length === 0 && friends.length === 0;
  const hinduDay = approximateHinduCalendar(todayKey);
  const dailyGoal = currentUser.dailyGoal || 16;
  const remainingGoalRounds = Math.max(0, dailyGoal - currentRounds);
  const goalPercent = Math.min(100, Math.round((currentRounds / Math.max(1, dailyGoal)) * 100));
  const yesterdayKey = addDays(todayKey, -1);
  const yesterdayRounds = state.chantTotals.find((item) => item.userId === currentUser.id && item.localDate === yesterdayKey)?.rounds || 0;
  const canEditYesterday = editableDates.includes(yesterdayKey);
  const hasUnsavedDraft = draftRounds !== currentRounds;
  const changeEditableDate = (nextDate: string, knownRounds?: number) => {
    if (nextDate !== selectedDate && hasUnsavedDraft) {
      const shouldDiscard = window.confirm(
        `You have an unsaved total of ${draftRounds} rounds for ${selectedDateLabel}. Switch dates and discard this draft?`
      );
      if (!shouldDiscard) return;
    }
    setSelectedDate(nextDate);
    setPreviousDraft(null);
    const total =
      typeof knownRounds === "number"
        ? knownRounds
        : state.chantTotals.find((item) => item.userId === currentUser.id && item.localDate === nextDate)?.rounds || 0;
    setRoundInput(String(total));
  };
  const activeGroupCards = joinedGroups.slice(0, 4).map((group) => {
    const memberIds = state.groupMembers.filter((member) => member.groupId === group.id).map((member) => member.userId);
    const todayTotal = state.chantTotals
      .filter((total) => memberIds.includes(total.userId) && total.localDate === todayKey)
      .reduce((sum, total) => sum + total.rounds, 0);
    const latestUpdate = latestChantUpdate(state.chantTotals, memberIds, todayKey, todayKey);
    return {
      group,
      memberCount: groupMemberCount(group.id),
      todayTotal,
      latestUpdate
    };
  });
  const setupRemainingCount = [
    allTimeRounds > 0,
    currentUser.dailyGoal > 0,
    Boolean(currentUser.avatarUrl),
    loadingRemoteSlices.groups || joinedGroups.length > 0,
    loadingRemoteSlices.friends || friends.length > 0,
    emailVerified !== false
  ].filter((complete) => !complete).length;
  const onboardingItems: OnboardingChecklistItem[] = [
    {
      id: "rounds",
      title: "Log first rounds",
      text: "Save at least one round so your streak and leaderboards begin.",
      complete: allTimeRounds > 0,
      action: "Set draft to 1",
      onClick: () => {
        changeEditableDate(todayKey, todayKey === selectedDate ? draftRounds : 1);
        setRoundInput("1");
      }
    },
    {
      id: "goal",
      title: "Set daily goal",
      text: "Keep a realistic target visible on your daily dashboard.",
      complete: currentUser.dailyGoal > 0,
      action: "Edit goal",
      onClick: () => {
        document.getElementById("daily-goal-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    {
      id: "avatar",
      title: "Add profile picture",
      text: "Make your profile easier to recognize in groups and leaderboards.",
      complete: Boolean(currentUser.avatarUrl),
      action: "Open profile",
      onClick: () =>
        showActionFeedback({
          title: "Open Profile",
          body: "Add or update your profile picture from Profile settings.",
          action: { label: "Go to Profile", tab: "profile" }
        })
    },
    {
      id: "group",
      title: "Join or create group",
      text: "Groups make your daily practice social and easier to follow.",
      complete: loadingRemoteSlices.groups || joinedGroups.length > 0,
      action: "Open groups",
      onClick: () =>
        showActionFeedback({
          title: "Open Groups",
          body: "Create a group or join one with a code.",
          action: { label: "Go to Groups", tab: "groups" }
        })
    },
    {
      id: "friend",
      title: "Add a friend",
      text: "Build a private friends leaderboard.",
      complete: loadingRemoteSlices.friends || friends.length > 0,
      action: "Open friends",
      onClick: () =>
        showActionFeedback({
          title: "Open Friends",
          body: "Search by username and send a friend request.",
          action: { label: "Go to Friends", tab: "friends" }
        })
    },
    {
      id: "email",
      title: "Verify email",
      text: emailVerified === null ? "Check account status from Profile." : "Keep account recovery reliable.",
      complete: emailVerified !== false,
      action: "Open profile",
      onClick: () =>
        showActionFeedback({
          title: "Open Profile",
          body: "Profile shows whether your email is verified.",
          action: { label: "Go to Profile", tab: "profile" }
        })
    }
  ];
  const nextMilestone = milestones
    .filter((milestone) => !milestone.earned)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];
  const latestEarnedMilestone = [...milestones].reverse().find((milestone) => milestone.earned);
  const earnedMilestoneCount = milestones.filter((milestone) => milestone.earned).length;
  const isLargeRoundEntry = draftRounds >= 64;
  const needsHighRoundConfirmation = draftRounds >= 108;
  const canSaveDraft = !isBusy && draftRounds !== currentRounds && (!needsHighRoundConfirmation || highRoundConfirmed);
  const saveDraftRounds = () => {
    setPreviousDraft(null);
    setDailyRounds(selectedDate, draftRounds);
  };
  const saveDailyGoal = async () => {
    const nextGoal = Math.max(0, Math.min(MAX_DAILY_ROUNDS, Math.floor(Number(goalDraft) || 0)));
    const saved = await updateUserPreferences({ dailyGoal: nextGoal }).catch(() => false);
    if (!saved) return;
    showActionFeedback({
      title: "Daily goal saved",
      body: nextGoal > 0 ? `Your daily goal is now ${nextGoal} rounds.` : "Your daily goal is now hidden.",
      action: { label: "View activity", tab: "activity" }
    });
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
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-lg border border-saffron-200/80 bg-white/92 px-3 py-3 shadow-soft sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xl font-black text-stone-950 sm:text-2xl">Hare Krishna, {currentUser.displayName || currentUser.username}</p>
            <p className="mt-1 text-sm font-bold text-stone-600">{formatDate(todayKey)}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <TopCompactStat label="Tithi" value={hinduDay.name} note={hinduDay.paksha} tone="saffron" />
            <TopCompactStat label="Today" value={currentRounds} note="saved rounds" tone="peacock" />
            <TopCompactStat label="Week" value={weeklyRounds} note="Mon onward" tone="stone" />
          </div>
        </div>
      </section>
      <PageHeader
        eyebrow={selectedDateLabel}
        icon={<CalendarDays size={16} />}
        title="Today's rounds"
        description="Enter your total rounds for the selected day."
      >
            <div className="grid gap-3 lg:grid-cols-[220px_minmax(260px,1fr)_150px] lg:items-end">
              <label>
                <span className="mb-1 block text-sm font-bold text-stone-700">Editable date</span>
                <input
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100 sm:py-2.5 sm:text-base"
                  type="date"
                  value={selectedDate}
                  min={currentUser.joinedAt.slice(0, 10)}
                  max={todayKey}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    changeEditableDate(nextDate);
                  }}
                />
              </label>
              <Field
                label="Total rounds"
                value={roundInput}
                onChange={(value) => {
                  setPreviousDraft(draftRounds);
                  setRoundInput(value);
                }}
                type="number"
                min={0}
                max={MAX_DAILY_ROUNDS}
                helper={`Max ${MAX_DAILY_ROUNDS}. Saved: ${currentRounds}.`}
              />
              <button
                type="button"
                className="h-[46px] rounded-md bg-saffron-500 px-5 text-sm font-black text-white shadow-sm transition hover:bg-saffron-600 disabled:bg-saffron-200"
                onClick={saveDraftRounds}
                disabled={!canSaveDraft}
              >
                Save total
              </button>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center sm:mt-4">
              <div>
                <p className="mb-2 text-sm font-bold text-stone-700">Quick adjust</p>
                <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                {[-1, 1, 4, 8, 16].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`rounded-md px-3 py-2.5 text-sm font-black ring-1 transition sm:min-w-16 ${
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
                  className="rounded-md bg-stone-100 px-3 py-2.5 text-sm font-black text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-200 sm:min-w-16"
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
              </div>
              <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                <span className="font-black text-stone-950">Draft {draftRounds}</span>
                {draftDelta !== 0 && <span> ({draftDelta > 0 ? `+${draftDelta}` : draftDelta})</span>}
                <span className="mx-2 text-stone-300">|</span>
                <span>{currentRounds} saved</span>
              </div>
            </div>

            {hasUnsavedDraft && (
              <div className="mt-3 flex flex-col gap-3 rounded-lg border border-saffron-300 bg-saffron-50 px-4 py-3 text-sm text-saffron-950 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="font-black">Unsaved changes</p>
                    <p className="leading-5 sm:leading-6">
                      {selectedDateLabel}: {currentRounds} -&gt; {draftRounds}. Save before switching dates.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white shadow-sm disabled:bg-saffron-200"
                  disabled={!canSaveDraft}
                  onClick={saveDraftRounds}
                >
                  Save now
                </button>
              </div>
            )}

            {isLargeRoundEntry && (
              <HighRoundGuardrail
                confirmed={highRoundConfirmed}
                draftRounds={draftRounds}
                needsConfirmation={needsHighRoundConfirmation}
                selectedDateLabel={selectedDateLabel}
                onChange={setHighRoundConfirmed}
              />
            )}
      </PageHeader>

      {isFirstRun ? (
        <FirstRunPanel
          isBusy={isBusy}
          onDraftOne={() => {
            changeEditableDate(todayKey, 1);
            setRoundInput("1");
          }}
          onSaveOne={() => setDailyRounds(todayKey, 1)}
          onGroups={() =>
            showActionFeedback({
              title: "Open Groups",
              body: "Create a group or join one with a code.",
              action: { label: "Go to Groups", tab: "groups" }
            })
          }
          onFriends={() =>
            showActionFeedback({
              title: "Open Friends",
              body: "Search by username and send a friend request.",
              action: { label: "Go to Friends", tab: "friends" }
            })
          }
        />
      ) : setupRemainingCount > 0 ? (
        <CompactSetupNudge
          remaining={setupRemainingCount}
          onOpenGroups={() =>
            showActionFeedback({
              title: "Open Groups",
              body: "Create a group or join one with a code.",
              action: { label: "Go to Groups", tab: "groups" }
            })
          }
          onOpenFriends={() =>
            showActionFeedback({
              title: "Open Friends",
              body: "Search by username and send a friend request.",
              action: { label: "Go to Friends", tab: "friends" }
            })
          }
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <Panel title="Today at a glance" icon={<Target size={18} />}>
          <div className="grid gap-2 sm:grid-cols-2">
            <CompactMetric label="Goal" value={`${goalPercent}%`} note={remainingGoalRounds === 0 ? "complete" : `${remainingGoalRounds} left`} />
            <CompactMetric label="Streak" value={streakNow} note={`best ${streakBest}`} />
            <CompactMetric label="7 days" value={sevenDayRounds} note={`${history.filter((item) => item.rounds > 0).length} active days`} />
            <CompactMetric label="Yesterday" value={yesterdayRounds} note={canEditYesterday ? "editable" : "locked"} />
          </div>
          <div id="daily-goal-panel" className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto] sm:items-end">
              <div>
                <p className="font-black text-stone-900">Daily goal</p>
                <p className="text-sm text-stone-600">{dailyGoal} rounds target</p>
              </div>
              <Field label="Goal" value={goalDraft} onChange={setGoalDraft} type="number" min={0} max={MAX_DAILY_ROUNDS} />
              <button
                type="button"
                className="rounded-md bg-peacock-600 px-4 py-2.5 text-sm font-black text-white disabled:bg-peacock-200"
                disabled={isBusy || Number(goalDraft) === dailyGoal}
                onClick={saveDailyGoal}
              >
                Save
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canEditYesterday && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-black text-stone-800 ring-1 ring-stone-200"
                disabled={isBusy}
                onClick={() => changeEditableDate(yesterdayKey, yesterdayRounds)}
              >
                <History size={16} /> Edit yesterday
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-black text-peacock-900 ring-1 ring-peacock-100"
              onClick={downloadShareCard}
            >
              <Download size={16} /> Share card
            </button>
          </div>
          {shareStatus && <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{shareStatus}</p>}
        </Panel>

        <Panel title="Active groups" icon={<Users size={18} />}>
          {loadingRemoteSlices.groups ? (
            <div className="rounded-lg border border-peacock-100 bg-peacock-50 px-3 py-3 text-sm font-black text-peacock-900">
              Loading your groups...
            </div>
          ) : activeGroupCards.length === 0 ? (
            <ActionEmptyState
              icon={<Users size={20} />}
              title="No groups yet"
              text="Join or create a group to appear in group leaderboards."
            >
              <button
                type="button"
                className="rounded-md bg-peacock-600 px-4 py-2.5 text-sm font-black text-white"
                onClick={() =>
                  showActionFeedback({
                    title: "Open Groups",
                    body: "Create or join a chanting group from the Groups page.",
                    action: { label: "Go to Groups", tab: "groups" }
                  })
                }
              >
                Open groups
              </button>
            </ActionEmptyState>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {activeGroupCards.map(({ group, memberCount, todayTotal, latestUpdate }) => (
                <button
                  key={group.id}
                  type="button"
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-saffron-300"
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    showActionFeedback({
                      title: group.name,
                      body: "Open Groups to view this group leaderboard, activity, and members.",
                      action: { label: "Open group", tab: "groups" }
                    });
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-stone-950">{group.name}</p>
                      <p className="mt-1 text-sm text-stone-600">{todayTotal} today | {memberCount} member{memberCount === 1 ? "" : "s"}</p>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-stone-400" />
                  </div>
                  <p className="mt-2 text-xs font-bold text-stone-500">
                    {latestUpdate ? `Last update ${latestUpdateLabel(latestUpdate)}` : "No updates today"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <Panel title="7-day rhythm" icon={<Flame size={18} />}>
          <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-stone-900">Last 7 days</p>
                <p className="text-sm text-stone-600">Tap a day to edit.</p>
              </div>
              <span className="rounded-md bg-saffron-50 px-3 py-1.5 text-sm font-black text-saffron-900">
                {sevenDayRounds} rounds
              </span>
            </div>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="grid min-w-[490px] gap-2 [grid-template-columns:repeat(7,minmax(0,1fr))] sm:min-w-0">
                {history.map((item) => {
                  const barHeight = Math.max(10, Math.round((item.rounds / highestHistoryRounds) * 104));
                  const isToday = item.dateKey === todayKey;
                  return (
                    <button
                      key={item.dateKey}
                      type="button"
                      className={`flex min-w-0 flex-col items-center gap-1 rounded-md border px-1 py-2 transition sm:gap-2 ${
                        isToday ? "border-saffron-300 bg-saffron-50" : "border-transparent hover:border-stone-200 hover:bg-stone-50"
                      }`}
                      onClick={() => {
                        changeEditableDate(item.dateKey, item.rounds);
                      }}
                    >
                      <div className="flex h-12 w-full items-end rounded-md bg-stone-50 px-1 py-1 sm:h-16">
                        <div
                          className={`w-full rounded-sm ${item.rounds > 0 ? "bg-peacock-500" : "bg-stone-200"}`}
                          style={{ height: `${item.rounds > 0 ? Math.min(barHeight, 58) : 8}px` }}
                        />
                      </div>
                      <p className="text-xs font-black text-stone-900 sm:text-sm">{item.rounds}</p>
                      <p className={`max-w-full truncate text-xs ${isToday ? "font-black text-saffron-800" : "text-stone-500"}`}>
                        {isToday ? "Today" : formatDate(item.dateKey).replace(/,.*$/, "")}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Milestones" icon={<Award size={18} />}>
          <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div className="rounded-lg border border-saffron-200 bg-saffron-50 px-3 py-2.5 text-center">
              <p className="text-xs font-black uppercase text-stone-500">Completed</p>
              <p className="mt-1 text-2xl font-black text-saffron-900">{earnedMilestoneCount}/{milestones.length}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5">
              <p className="font-black text-stone-950">{nextMilestone ? `Next: ${nextMilestone.title}` : "All current milestones earned"}</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                {nextMilestone ? nextMilestone.description : latestEarnedMilestone ? `Latest: ${latestEarnedMilestone.title}.` : "New milestones can be added later."}
              </p>
              <button
                type="button"
                className="mt-3 rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white"
                onClick={() => window.dispatchEvent(new CustomEvent("chanting-open-tab", { detail: "milestones" }))}
              >
                View milestones
              </button>
            </div>
          </div>
        </Panel>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-saffron-200 bg-white/95 p-3 shadow-soft backdrop-blur md:hidden">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <button
            type="button"
            className="rounded-md bg-peacock-600 px-3 py-3 text-sm font-black text-white"
            disabled={isBusy}
            onClick={() => {
              setPreviousDraft(draftRounds);
              adjustDraftRounds(1);
            }}
          >
            +1
          </button>
          <button
            type="button"
            className="rounded-md bg-saffron-500 px-3 py-3 text-sm font-black text-white disabled:bg-saffron-200"
            disabled={!canSaveDraft}
            onClick={saveDraftRounds}
          >
            Save
          </button>
          <span className="grid min-w-14 place-items-center rounded-md bg-stone-100 px-3 text-sm font-black text-stone-800">
            {hasUnsavedDraft ? `${draftRounds}*` : draftRounds}
          </span>
        </div>
        {hasUnsavedDraft && (
          <p className="mt-2 text-center text-xs font-bold text-saffron-900">Unsaved draft for {selectedDateLabel}</p>
        )}
      </div>
    </div>
  );
}

type OnboardingChecklistItem = {
  id: string;
  title: string;
  text: string;
  complete: boolean;
  action: string;
  onClick: () => void;
};

function TopCompactStat({
  label,
  value,
  note,
  tone
}: {
  label: string;
  value: string | number;
  note: string;
  tone: "saffron" | "peacock" | "stone";
}) {
  const toneClass =
    tone === "saffron"
      ? "border-saffron-200 bg-saffron-50 text-saffron-900"
      : tone === "peacock"
        ? "border-peacock-100 bg-peacock-50 text-peacock-900"
        : "border-stone-200 bg-stone-50 text-stone-900";
  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-0.5 truncate text-lg font-black">{value}</p>
      <p className="truncate text-xs font-bold text-stone-600">{note}</p>
    </div>
  );
}

function CompactMetric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-0.5 text-xl font-black text-stone-950">{value}</p>
      <p className="text-sm text-stone-600">{note}</p>
    </div>
  );
}

function CompactSetupNudge({
  remaining,
  onOpenGroups,
  onOpenFriends
}: {
  remaining: number;
  onOpenGroups: () => void;
  onOpenFriends: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white/92 px-3 py-2.5 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-black text-stone-900">{remaining} setup item{remaining === 1 ? "" : "s"} left</p>
        <p className="text-stone-600">Optional. Your rounds and leaderboards work now.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-md bg-white px-3 py-2 font-black text-stone-800 ring-1 ring-stone-200" onClick={onOpenGroups}>
          Groups
        </button>
        <button type="button" className="rounded-md bg-white px-3 py-2 font-black text-stone-800 ring-1 ring-stone-200" onClick={onOpenFriends}>
          Friends
        </button>
      </div>
    </div>
  );
}

function HighRoundGuardrail({
  confirmed,
  draftRounds,
  needsConfirmation,
  selectedDateLabel,
  onChange
}: {
  confirmed: boolean;
  draftRounds: number;
  needsConfirmation: boolean;
  selectedDateLabel: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={`mt-4 rounded-lg border px-3 py-2.5 text-sm leading-6 sm:px-4 ${
      needsConfirmation
        ? "border-saffron-300 bg-saffron-50 text-saffron-950"
        : "border-peacock-200 bg-peacock-50 text-peacock-950"
    }`}>
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-saffron-800 ring-1 ring-saffron-100">
          <AlertTriangle size={17} />
        </span>
        <div className="min-w-0">
          <p className="font-black">
            {needsConfirmation ? "Please confirm this high entry" : "Large entry, please double-check"}
          </p>
          <p>
            You are saving {draftRounds} rounds for {selectedDateLabel}. This is allowed, but leaderboards are honesty-based and self-entered.
          </p>
          {needsConfirmation && (
            <label className="mt-3 flex items-start gap-2 rounded-md bg-white px-3 py-2 font-bold text-stone-800 ring-1 ring-saffron-100">
              <input
                className="mt-1 h-4 w-4 rounded border-stone-300 text-saffron-600"
                type="checkbox"
                checked={confirmed}
                onChange={(event) => onChange(event.target.checked)}
              />
              <span>I have double-checked this total and want to save it.</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function OnboardingChecklist({ items }: { items: OnboardingChecklistItem[] }) {
  const completed = items.filter((item) => item.complete).length;
  const total = items.length;
  const remainingItems = items.filter((item) => !item.complete);
  const allComplete = completed === total;
  const progress = Math.round((completed / Math.max(1, total)) * 100);

  if (allComplete) {
    return null;
  }

  return (
    <Panel title="Setup checklist" icon={<CheckCircle2 size={18} />}>
      <div className="mb-3 flex flex-col gap-3 rounded-lg border border-saffron-200 bg-saffron-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div>
          <p className="font-black text-stone-950">{completed}/{total} complete</p>
          <p className="mt-1 text-sm leading-6 text-stone-700">Only unfinished setup steps are shown here.</p>
        </div>
        <div className="min-w-[180px]">
          <div className="h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full bg-saffron-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-right text-xs font-black text-saffron-900">{progress}%</p>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {remainingItems.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-stone-100 text-stone-500">
                <Circle size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-stone-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{item.text}</p>
                <button
                  type="button"
                  className="mt-3 rounded-md bg-stone-900 px-3 py-2 text-sm font-black text-white"
                  onClick={item.onClick}
                >
                  {item.action}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FirstRunPanel({
  isBusy,
  onDraftOne,
  onSaveOne,
  onGroups,
  onFriends
}: {
  isBusy: boolean;
  onDraftOne: () => void;
  onSaveOne: () => void;
  onGroups: () => void;
  onFriends: () => void;
}) {
  return (
    <Panel title="Start in three steps" icon={<PlusCircle size={18} />}>
      <div className="mb-3 rounded-lg border border-saffron-200 bg-saffron-50 px-3 py-2.5 text-sm leading-6 text-saffron-950 sm:px-4">
        <p className="font-black">Your leaderboard starts after your first saved round.</p>
        <p>After that, groups, friends, streaks, and milestones begin to feel useful.</p>
      </div>
      <div className="grid gap-2 sm:gap-3 md:grid-cols-3">
        <StartStep
          title="1. Log rounds"
          text="Save your first round total for today."
          action="Set draft to 1"
          disabled={isBusy}
          onClick={onDraftOne}
          secondaryAction="Save 1 now"
          onSecondaryClick={onSaveOne}
        />
        <StartStep
          title="2. Join a group"
          text="Create a group or join one with a code."
          action="Open groups"
          disabled={isBusy}
          onClick={onGroups}
        />
        <StartStep
          title="3. Add a friend"
          text="Search by username to build a private leaderboard."
          action="Open friends"
          disabled={isBusy}
          onClick={onFriends}
        />
      </div>
    </Panel>
  );
}

function StartStep({
  title,
  text,
  action,
  onClick,
  disabled = false,
  secondaryAction,
  onSecondaryClick
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
  disabled?: boolean;
  secondaryAction?: string;
  onSecondaryClick?: () => void;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="font-black text-stone-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
      <button
        type="button"
        className="mt-3 w-full rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white"
        disabled={disabled}
        onClick={onClick}
      >
        {action}
      </button>
      {secondaryAction && onSecondaryClick && (
        <button
          type="button"
          className="mt-2 w-full rounded-md bg-white px-4 py-2.5 text-sm font-black text-stone-800 ring-1 ring-saffron-200"
          disabled={disabled}
          onClick={onSecondaryClick}
        >
          {secondaryAction}
        </button>
      )}
    </div>
  );
}

function DailyFocusTile({
  label,
  value,
  note,
  compact = false
}: {
  label: string;
  value: number;
  note: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-md border border-stone-100 bg-stone-50 px-3 ${compact ? "py-2" : "py-2.5"}`}>
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className={`${compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"} mt-0.5 font-black text-stone-950`}>{value}</p>
      <p className="text-xs leading-5 text-stone-600 sm:text-sm">{note}</p>
    </div>
  );
}
