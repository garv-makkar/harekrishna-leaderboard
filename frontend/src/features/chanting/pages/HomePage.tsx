"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BookOpen, CalendarDays, PlusCircle } from "lucide-react";
import { useChanting } from "../ChantingContext";
import quotes from "../data/prabhupada-quotes.json";
import {
  formatDate,
  MAX_DAILY_ROUNDS,
  sumRounds,
} from "../domain";
import { Field, PageHeader, Panel } from "../ui";

type TithiState = {
  status: "loading" | "ready" | "unavailable";
  name: string;
  paksha: string;
  lunarDate: string;
  note: string;
};

type DailyQuote = {
  id: number;
  date: string;
  month: string;
  day: number;
  quote: string;
  source: string;
};

const prabhupadaQuotes = quotes as DailyQuote[];

export function HomePage() {
  const {
    state,
    currentUser,
    todayKey,
    selectedDate,
    setSelectedDate,
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
    emailVerified,
    friends,
    showActionFeedback,
    refreshRemoteState,
    loadingRemoteSlices
  } = useChanting();
  const [previousDraft, setPreviousDraft] = useState<number | null>(null);
  const [goalDraft, setGoalDraft] = useState("16");
  const [highRoundConfirmed, setHighRoundConfirmed] = useState(false);
  const [tithiState, setTithiState] = useState<TithiState>({
    status: "loading",
    name: "Loading",
    paksha: "Fetching Drik Panchang",
    lunarDate: "",
    note: ""
  });
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

  useEffect(() => {
    let cancelled = false;
    setTithiState({
      status: "loading",
      name: "Loading",
      paksha: "Fetching Drik Panchang",
      lunarDate: "",
      note: ""
    });
    fetch("/api/tithi")
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.note || "Drik Panchang tithi service is unavailable.");
        }
        if (!cancelled) {
          setTithiState({
            status: "ready",
            name: String(payload.name || "Unavailable"),
            paksha: String(payload.paksha || ""),
            lunarDate: String(payload.lunarDate || ""),
            note: String(payload.note || "Fetched from Drik Panchang.")
          });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setTithiState({
            status: "unavailable",
            name: "Unavailable",
            paksha: "Drik Panchang service is down",
            lunarDate: "",
            note: error.message || "We cannot tell the tithi reliably right now."
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [todayKey]);

  if (!currentUser) return null;

  const weeklyRounds = sumRounds(state.chantTotals, currentUser.id, "weekly", todayKey);
  const allTimeRounds = sumRounds(state.chantTotals, currentUser.id, "allTime", todayKey);
  const selectedDateLabel = selectedDate === todayKey ? "Today" : formatDate(selectedDate || todayKey);
  const hasStartedChanting = allTimeRounds > 0;
  const isLoadingRelationships = loadingRemoteSlices.friends || loadingRemoteSlices.groups;
  const isFirstRun = !isLoadingRelationships && !hasStartedChanting && joinedGroups.length === 0 && friends.length === 0;
  const dailyGoal = currentUser.dailyGoal || 16;
  const remainingGoalRounds = Math.max(0, dailyGoal - currentRounds);
  const goalPercent = Math.min(100, Math.round((currentRounds / Math.max(1, dailyGoal)) * 100));
  const prabhupadaQuote = prabhupadaQuotes.find((quote) => quote.date === todayKey.slice(5));
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
  const setupRemainingCount = [
    allTimeRounds > 0,
    currentUser.dailyGoal > 0,
    Boolean(currentUser.avatarUrl),
    loadingRemoteSlices.groups || joinedGroups.length > 0,
    loadingRemoteSlices.friends || friends.length > 0,
    emailVerified !== false
  ].filter((complete) => !complete).length;
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
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-lg border border-saffron-200/80 bg-white/92 px-3 py-3 shadow-soft sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xl font-black text-stone-950 sm:text-2xl">Hare Krishna, {currentUser.displayName || currentUser.username}</p>
            <p className="mt-1 text-sm font-bold text-stone-600">{formatDate(todayKey)}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <TopCompactStat
              label="Tithi"
              value={tithiState.name}
              note={tithiState.status === "ready" ? `${tithiState.paksha} - Drik Panchang` : tithiState.paksha}
              tone="saffron"
            />
            <TopCompactStat label="Today" value={currentRounds} note="saved rounds" tone="peacock" />
            <TopCompactStat label="Week" value={weeklyRounds} note="Mon onward" tone="stone" />
          </div>
        </div>
      </section>
      {tithiState.status === "unavailable" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-900">
          <AlertTriangle className="mt-0.5 shrink-0" size={17} />
          <p>{tithiState.note}</p>
        </div>
      )}
      {prabhupadaQuote && (
        <section className="rounded-lg border border-peacock-100 bg-peacock-50/80 px-3 py-3 shadow-sm sm:px-4">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-peacock-800 ring-1 ring-peacock-100">
              <BookOpen size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-black text-stone-950">Srila Prabhupada quote</p>
                <p className="text-xs font-black uppercase text-peacock-900">
                  {prabhupadaQuote.month} {prabhupadaQuote.day}
                </p>
              </div>
              <blockquote className="mt-2 text-sm leading-6 text-stone-800 sm:text-base">
                "{prabhupadaQuote.quote}"
              </blockquote>
              <p className="mt-2 text-xs font-bold text-stone-500">{prabhupadaQuote.source}</p>
            </div>
          </div>
        </section>
      )}
      <PageHeader
        eyebrow={selectedDateLabel}
        icon={<CalendarDays size={16} />}
        title="Today's rounds"
        description="Enter your total rounds for the selected day."
      >
            <div className="grid gap-3 lg:grid-cols-[330px_minmax(320px,1fr)_224px] lg:items-end">
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

            <div id="daily-goal-panel" className="mt-4 rounded-lg border border-peacock-100 bg-peacock-50/70 px-3 py-3 sm:px-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_120px] lg:items-end">
                <div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="font-black text-stone-900">Daily goal</p>
                      <p className="text-sm text-stone-600">
                        {dailyGoal} rounds target. {remainingGoalRounds === 0 ? "Goal complete." : `${remainingGoalRounds} rounds left.`}
                      </p>
                    </div>
                    <p className="text-2xl font-black text-peacock-900">{goalPercent}%</p>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-white ring-1 ring-peacock-100">
                    <div className="h-full rounded-full bg-peacock-600 transition-all" style={{ width: `${goalPercent}%` }} />
                  </div>
                </div>
                <Field label="Goal" value={goalDraft} onChange={setGoalDraft} type="number" min={0} max={MAX_DAILY_ROUNDS} />
                <button
                  type="button"
                  className="h-[46px] rounded-md bg-peacock-600 px-4 text-sm font-black text-white disabled:bg-peacock-200"
                  disabled={isBusy || Number(goalDraft) === dailyGoal}
                  onClick={saveDailyGoal}
                >
                  Save goal
                </button>
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
