"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Award, CalendarDays, CheckCircle2, ChevronRight, Circle, Download, ExternalLink, Flame, History, Moon, PlusCircle, Target, Users } from "lucide-react";
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
  VAISHNAVA_CALENDAR_REFERENCE
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
    refreshRemoteState
  } = useChanting();
  const [previousDraft, setPreviousDraft] = useState<number | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const [goalDraft, setGoalDraft] = useState("16");
  const [highRoundConfirmed, setHighRoundConfirmed] = useState(false);
  const refreshedUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    void refreshRemoteState(currentUser.id, "core");
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
  const isFirstRun = !hasStartedChanting && joinedGroups.length === 0 && friends.length === 0;
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
      complete: joinedGroups.length > 0,
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
      complete: friends.length > 0,
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
  const setPresetTotal = (value: number) => {
    setPreviousDraft(draftRounds);
    setRoundInput(String(Math.max(0, Math.min(MAX_DAILY_ROUNDS, value))));
  };
  const saveDraftRounds = () => {
    setPreviousDraft(null);
    setDailyRounds(selectedDate, draftRounds);
  };
  const saveDailyGoal = async () => {
    await updateUserPreferences({ dailyGoal: Math.max(0, Math.min(MAX_DAILY_ROUNDS, Math.floor(Number(goalDraft) || 0))) });
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
      <PageHeader
        eyebrow={selectedDateLabel}
        icon={<CalendarDays size={16} />}
        title="Add chanting rounds"
        description="Save the exact total for today or any date since you created your account."
        stats={
          <>
            <p className="mb-3 text-sm font-black uppercase text-stone-500">Practice totals</p>
            <StatGrid columns={2}>
              <StatCard label="Today" value={currentRounds} note="saved rounds" tone="saffron" />
              <StatCard label="This week" value={weeklyRounds} note="Monday onward" tone="peacock" />
              <StatCard label="This month" value={monthlyRounds} note={`${monthDays} active day${monthDays === 1 ? "" : "s"}`} tone="stone" />
              <StatCard label="All time" value={allTimeRounds} note={`Since ${formatDate(currentUser.joinedAt.slice(0, 10))}`} tone="saffron" />
            </StatGrid>
          </>
        }
      >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px]">
              <label>
                <span className="mb-1 block text-sm font-bold text-stone-700">Editable date</span>
                <input
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
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
              <StatCard label="Saved total" value={currentRounds} note="rounds" tone="saffron" />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-bold text-stone-700">Quick totals</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[1, 4, 8, 16, 32, 64].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-md px-2 py-2.5 text-sm font-black ring-1 transition sm:px-3 ${
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
                    className={`rounded-md px-2 py-2.5 text-sm font-black ring-1 transition sm:px-3 ${
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
                  className="rounded-md bg-stone-100 px-2 py-2.5 text-sm font-black text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-200 sm:px-3"
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
                className="rounded-md bg-saffron-500 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-saffron-600"
                onClick={saveDraftRounds}
                disabled={!canSaveDraft}
              >
                Save total
              </button>
            </div>

            <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-600 sm:px-4">
              Draft total: <b className="text-stone-900">{draftRounds}</b>
              {draftDelta !== 0 && <span> ({draftDelta > 0 ? `+${draftDelta}` : draftDelta} from saved)</span>}
              <span> Daily maximum is {MAX_DAILY_ROUNDS}.</span>
              <span className="block font-bold text-stone-700">All round totals are self-entered.</span>
              <span className="block">{localDayBoundaryText(currentUser.timezone)}</span>
            </div>

            {hasUnsavedDraft && (
              <div className="mt-3 flex flex-col gap-3 rounded-lg border border-saffron-300 bg-saffron-50 px-4 py-3 text-sm text-saffron-950 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="font-black">Unsaved changes</p>
                    <p className="leading-6">
                      You changed {selectedDateLabel} from {currentRounds} to {draftRounds}. Save before switching dates or leaving this entry.
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
              changeEditableDate(todayKey, 1);
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

      <OnboardingChecklist items={onboardingItems} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Panel title="Daily focus" icon={<Target size={18} />}>
          <div className="grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)]">
            <Card level="primary" className="text-center">
              <p className="text-xs font-black uppercase text-stone-500">Goal progress</p>
              <p className="mt-1 text-2xl font-black text-saffron-900 sm:text-3xl">{goalPercent}%</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                <div className="h-full bg-saffron-500" style={{ width: `${goalPercent}%` }} />
              </div>
              <p className="mt-3 text-sm font-bold text-stone-700">
                {remainingGoalRounds === 0 ? "Goal complete today" : `${remainingGoalRounds} left today`}
              </p>
            </Card>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <DailyFocusTile label="Current streak" value={streakNow} note={`Best streak ${streakBest}`} />
              <DailyFocusTile label="Last 7 days" value={sevenDayRounds} note={`${history.filter((item) => item.rounds > 0).length} active days`} />
              <DailyFocusTile label="Yesterday" value={yesterdayRounds} note={canEditYesterday ? "Still editable" : "Edit window closed"} />
              <DailyFocusTile label="Groups joined" value={joinedGroups.length} note={joinedGroups.length ? "Active group shortcuts below" : "Join or create your first group"} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canEditYesterday && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2.5 text-sm font-black text-stone-800 ring-1 ring-stone-200"
                disabled={isBusy}
                onClick={() => {
                  changeEditableDate(yesterdayKey, yesterdayRounds);
                }}
              >
                <History size={16} /> Edit yesterday
              </button>
            )}
            {remainingGoalRounds > 0 && (
              <button
                type="button"
                className="rounded-md bg-peacock-600 px-3 py-2.5 text-sm font-black text-white"
                disabled={isBusy}
                onClick={() => setPresetTotal(dailyGoal)}
              >
                Set draft to goal
              </button>
            )}
          </div>
          <div id="daily-goal-panel" className="mt-4 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
              <div>
                <p className="font-black text-stone-900">Daily goal</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {currentRounds >= dailyGoal ? "Goal complete today." : `${remainingGoalRounds} rounds left today.`}
                </p>
              </div>
              <Field label="Goal rounds" value={goalDraft} onChange={setGoalDraft} type="number" min={0} max={999} />
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
        </Panel>

        <Panel title="Active groups" icon={<Users size={18} />}>
          {activeGroupCards.length === 0 ? (
            <ActionEmptyState
              icon={<Users size={20} />}
              title="No groups yet"
              text="Create a group or join one with a code to make your daily rounds visible in group leaderboards."
            >
              <button
                type="button"
                className="rounded-md bg-peacock-600 px-4 py-3 text-sm font-black text-white"
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
            <div className="grid gap-2">
              {activeGroupCards.map(({ group, memberCount, todayTotal, latestUpdate }) => (
                <button
                  key={group.id}
                  type="button"
                  className="rounded-lg border border-stone-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-saffron-300"
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
                      <p className="mt-1 text-sm text-stone-600">{memberCount} member{memberCount === 1 ? "" : "s"}</p>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-stone-400" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <DailyFocusTile label="Today total" value={todayTotal} note="group rounds" compact />
                    <div className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2">
                      <p className="text-xs font-black uppercase text-stone-500">Last update</p>
                      <p className="mt-1 text-sm font-black text-stone-900">
                        {latestUpdate ? latestUpdateLabel(latestUpdate) : "No update"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {isFirstRun && (
        <Panel title="Start in three steps" icon={<PlusCircle size={18} />}>
            <div className="grid gap-2 sm:gap-3 md:grid-cols-3">
            <StartStep
              title="Log rounds"
              text="Save your first round total for today."
              action="Set draft to 1"
              onClick={() => {
                setSelectedDate(todayKey);
                setRoundInput("1");
              }}
            />
            <StartStep
              title="Join a group"
              text="Create a group or join one with a code."
              action="Open groups"
              onClick={() =>
                showActionFeedback({
                  title: "Open Groups",
                  body: "Use the button below to create or join a chanting group.",
                  action: { label: "Go to Groups", tab: "groups" }
                })
              }
            />
            <StartStep
              title="Add a friend"
              text="Search by username to build a private leaderboard."
              action="Open friends"
              onClick={() =>
                showActionFeedback({
                  title: "Open Friends",
                  body: "Use the button below to search usernames and send friend requests.",
                  action: { label: "Go to Friends", tab: "friends" }
                })
              }
            />
          </div>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
        <Panel title="Chanting consistency" icon={<Flame size={18} />}>
          <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-stone-900">Last 7 days</p>
                <p className="text-sm text-stone-600">Your recent rhythm. Click a day to edit it on Home.</p>
              </div>
              <span className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900">
                {sevenDayRounds} rounds
              </span>
            </div>
            <div className="grid gap-1 [grid-template-columns:repeat(7,minmax(0,1fr))] sm:gap-2">
              {history.map((item) => {
                const barHeight = Math.max(10, Math.round((item.rounds / highestHistoryRounds) * 104));
                const isToday = item.dateKey === todayKey;
                return (
                  <button
                    key={item.dateKey}
                    type="button"
                    className={`flex min-w-0 flex-col items-center gap-1 rounded-md border px-0.5 py-2 transition sm:gap-2 sm:px-1 ${
                      isToday ? "border-saffron-300 bg-saffron-50" : "border-transparent hover:border-stone-200 hover:bg-stone-50"
                    }`}
                    onClick={() => {
                      changeEditableDate(item.dateKey, item.rounds);
                    }}
                  >
                    <div className="flex h-20 w-full items-end rounded-md bg-stone-50 px-0.5 py-1 sm:h-28 sm:px-1">
                      <div
                        className={`w-full rounded-sm ${item.rounds > 0 ? "bg-peacock-500" : "bg-stone-200"}`}
                        style={{ height: `${item.rounds > 0 ? barHeight : 8}px` }}
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
        </Panel>

        <Panel title="Milestone progress" icon={<Award size={18} />}>
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

      <Panel title="Extras" icon={<Moon size={18} />}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
            <div className="rounded-lg border border-saffron-200 bg-saffron-50 px-3 py-2.5">
              <p className="text-xs font-black uppercase text-stone-500">Approximate tithi</p>
              <p className="mt-1 text-xl font-black text-saffron-900">{hinduDay.name}</p>
              <p className="text-sm font-bold text-stone-700">{hinduDay.paksha}</p>
            </div>
            <div className="rounded-lg border border-peacock-100 bg-peacock-50 px-3 py-2.5 text-sm leading-6 text-peacock-950">
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
              <a
                href={VAISHNAVA_CALENDAR_REFERENCE.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-black text-peacock-900 ring-1 ring-peacock-100"
              >
                <ExternalLink size={16} /> Official calendar
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
            <p className="font-black text-stone-900">Share progress</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">Download today&apos;s simple progress card.</p>
            {shareStatus && <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{shareStatus}</p>}
            <button
              type="button"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-2.5 font-black text-white"
              onClick={downloadShareCard}
            >
              <Download size={18} /> Download
            </button>
          </div>
        </div>
      </Panel>

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

function StartStep({
  title,
  text,
  action,
  onClick
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="font-black text-stone-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
      <button
        type="button"
        className="mt-3 w-full rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white"
        onClick={onClick}
      >
        {action}
      </button>
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
