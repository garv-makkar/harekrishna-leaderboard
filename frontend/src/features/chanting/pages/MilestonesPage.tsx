"use client";

import { useEffect, useRef, useState } from "react";
import { Award, CheckCircle2, Circle, Loader2, Star, Trophy, X } from "lucide-react";
import { useChanting } from "../ChantingContext";
import { computeMilestones } from "../domain";
import type { Milestone } from "../domain";
import { EmptyState, PageHeader, Panel, StatCard, StatGrid } from "../ui";

const milestoneCategories: Milestone["category"][] = ["Chanting", "Consistency", "Community", "Leaderboards"];

export function MilestonesPage() {
  const { state, currentUser, todayKey, isBusy, updateFeaturedMilestones, refreshRemoteState } = useChanting();
  const refreshedUserRef = useRef("");
  const [savingFeatured, setSavingFeatured] = useState(false);

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    void refreshRemoteState(currentUser.id, "all");
  }, [currentUser, refreshRemoteState]);

  if (!currentUser) return null;

  const milestones = computeMilestones(state, currentUser, todayKey);
  const earned = milestones.filter((milestone) => milestone.earned);
  const inProgress = milestones.filter((milestone) => !milestone.earned);
  const featuredIds = currentUser.featuredMilestoneIds.filter((id) => earned.some((milestone) => milestone.id === id)).slice(0, 3);
  const featuredMilestones = featuredIds
    .map((id) => earned.find((milestone) => milestone.id === id))
    .filter(Boolean) as typeof earned;
  const closestNext = [...inProgress].sort((a, b) => b.progress / b.target - a.progress / a.target)[0];
  const categorizedMilestones = milestoneCategories.map((category) => ({
    category,
    milestones: milestones.filter((milestone) => milestone.category === category)
  })).filter((group) => group.milestones.length > 0);

  const toggleFeatured = async (milestoneId: string) => {
    if (savingFeatured) return;
    const isSelected = featuredIds.includes(milestoneId);
    if (!isSelected && featuredIds.length >= 3) return;
    const nextIds = isSelected
      ? featuredIds.filter((id) => id !== milestoneId)
      : [...featuredIds, milestoneId];
    setSavingFeatured(true);
    try {
      await updateFeaturedMilestones(nextIds);
    } finally {
      setSavingFeatured(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Achievements"
        icon={<Award size={16} />}
        title="Milestones"
        description="Track progress and feature up to 3 earned milestones."
        stats={
          <StatGrid columns={3}>
            <StatCard label="Completed" value={`${earned.length}/${milestones.length}`} tone="saffron" />
            <StatCard label="Featured" value={`${featuredIds.length}/3`} tone="peacock" />
            <StatCard label="In progress" value={inProgress.length} tone="stone" />
          </StatGrid>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Featured on profile" icon={<Star size={18} />}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-stone-600">Shown on your public profile</p>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-saffron-50 px-2.5 py-1 text-xs font-black text-saffron-900">
              {savingFeatured && <Loader2 className="animate-spin" size={13} />}
              {featuredIds.length}/3 selected
            </span>
          </div>
          {earned.length === 0 ? (
            <EmptyState text="Complete a milestone to feature it on your profile." />
          ) : featuredMilestones.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-4 text-center">
              <p className="font-black text-stone-900">No featured milestones selected.</p>
              <p className="mt-1 text-sm font-bold text-stone-500">Pick up to 3 earned milestones below.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              {featuredMilestones.map((milestone, index) => (
                <div key={milestone.id} className="rounded-lg border border-saffron-200 bg-saffron-50 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-stone-950">{milestone.title}</p>
                      <p className="mt-1 text-xs font-bold text-saffron-900">Slot {index + 1} - {milestone.category}</p>
                    </div>
                    <button
                      type="button"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-stone-500 ring-1 ring-saffron-100 transition hover:text-stone-900 disabled:opacity-60"
                      onClick={() => toggleFeatured(milestone.id)}
                      disabled={isBusy || savingFeatured}
                      aria-label={`Remove ${milestone.title} from featured milestones`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Next closest" icon={<Trophy size={18} />}>
          {closestNext ? (
            <div className="rounded-lg border border-peacock-100 bg-peacock-50 px-3 py-2.5">
              <p className="font-black text-stone-950">{closestNext.title}</p>
              <p className="mt-1 text-xs font-bold text-peacock-900">{closestNext.category}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full bg-peacock-500" style={{ width: `${Math.round((closestNext.progress / Math.max(1, closestNext.target)) * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs font-bold text-stone-600">{closestNext.progress} / {closestNext.target}</p>
            </div>
          ) : (
            <EmptyState text="All current milestones are complete." />
          )}
        </Panel>
      </div>

      <Panel title="Choose profile milestones" icon={<Star size={18} />}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-5 text-stone-600 sm:leading-6">
            Select up to 3 earned milestones for your profile.
          </p>
          <span className="text-xs font-black uppercase text-stone-500">
            {featuredIds.length === 3 ? "All slots filled" : `${3 - featuredIds.length} slot${3 - featuredIds.length === 1 ? "" : "s"} open`}
          </span>
        </div>
        {earned.length === 0 ? (
          <EmptyState text="No earned milestones yet. Log rounds to unlock the first one." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {earned.map((milestone) => {
              const selectedIndex = featuredIds.indexOf(milestone.id);
              const selected = selectedIndex >= 0;
              const disabled = !selected && featuredIds.length >= 3;
              return (
                <button
                  key={milestone.id}
                  type="button"
                  className={`rounded-lg border px-3 py-2.5 text-left shadow-sm transition ${
                    selected
                      ? "border-saffron-300 bg-saffron-50 ring-2 ring-saffron-100"
                      : disabled
                        ? "border-stone-200 bg-stone-50 opacity-75"
                        : "border-stone-200 bg-white hover:border-saffron-200"
                  }`}
                  disabled={isBusy || savingFeatured || disabled}
                  onClick={() => toggleFeatured(milestone.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md ${selected ? "bg-saffron-500 text-white" : "bg-stone-100 text-stone-500"}`}>
                      {selected ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-black text-stone-950">{milestone.title}</span>
                      <span className="mt-1 block text-xs font-bold text-stone-500">
                        {selected ? `Featured ${selectedIndex + 1}` : milestone.category}
                      </span>
                      {disabled && <span className="mt-2 block text-xs font-bold text-stone-500">Remove one featured milestone first.</span>}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="All milestones" icon={<Award size={18} />}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-stone-600">
              {earned.length} of {milestones.length} milestones earned
            </p>
            <span className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900">
              {Math.round((earned.length / Math.max(1, milestones.length)) * 100)}%
            </span>
          </div>
          {categorizedMilestones.map((group) => {
            const groupEarned = group.milestones.filter((milestone) => milestone.earned).length;
            return (
              <section key={group.category} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black uppercase text-stone-600">{group.category}</h3>
                  <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-black text-stone-600">
                    {groupEarned}/{group.milestones.length}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {group.milestones.map((milestone) => (
                    <CompactMilestoneCard key={milestone.id} milestone={milestone} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function CompactMilestoneCard({ milestone }: { milestone: Milestone }) {
  const percent = Math.round((milestone.progress / Math.max(1, milestone.target)) * 100);
  return (
    <div
      className={`rounded-md border px-3 py-2.5 shadow-sm ${
        milestone.earned ? "border-saffron-200 bg-saffron-50" : "border-stone-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-black text-stone-950">{milestone.title}</p>
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${
            milestone.earned ? "bg-peacock-50 text-peacock-900" : "bg-stone-100 text-stone-600"
          }`}
        >
          {milestone.earned ? "Done" : `${percent}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className={milestone.earned ? "h-full bg-saffron-500" : "h-full bg-peacock-500"}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-bold text-stone-500">
        {milestone.progress} / {milestone.target}
      </p>
    </div>
  );
}
