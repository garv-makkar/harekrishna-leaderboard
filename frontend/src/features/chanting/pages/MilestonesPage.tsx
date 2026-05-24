"use client";

import { useEffect, useRef } from "react";
import { Award, CheckCircle2, Circle, Star, Trophy } from "lucide-react";
import { useChanting } from "../ChantingContext";
import { computeMilestones } from "../domain";
import { DataFreshness, EmptyState, MilestoneGrid, PageHeader, Panel, StatCard, StatGrid } from "../ui";

export function MilestonesPage() {
  const { state, currentUser, todayKey, isBusy, updateFeaturedMilestones, refreshRemoteState, loadingRemoteSlices, lastRemoteRefresh, remoteRefreshErrors } = useChanting();
  const refreshedUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    void refreshRemoteState(currentUser.id, "core");
  }, [currentUser, refreshRemoteState]);

  if (!currentUser) return null;

  const milestones = computeMilestones(state, currentUser, todayKey);
  const earned = milestones.filter((milestone) => milestone.earned);
  const inProgress = milestones.filter((milestone) => !milestone.earned);
  const featuredIds = currentUser.featuredMilestoneIds.filter((id) => earned.some((milestone) => milestone.id === id)).slice(0, 3);
  const featuredMilestones = featuredIds
    .map((id) => earned.find((milestone) => milestone.id === id))
    .filter(Boolean) as typeof earned;
  const fallbackFeatured = featuredMilestones.length ? featuredMilestones : earned.slice(-3).reverse();
  const closestNext = [...inProgress].sort((a, b) => b.progress / b.target - a.progress / a.target)[0];

  const toggleFeatured = (milestoneId: string) => {
    const isSelected = featuredIds.includes(milestoneId);
    const nextIds = isSelected
      ? featuredIds.filter((id) => id !== milestoneId)
      : [...featuredIds, milestoneId].slice(0, 3);
    void updateFeaturedMilestones(nextIds);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Achievements"
        icon={<Award size={16} />}
        title="Milestones"
        description="Track progress and feature up to 3 earned milestones."
        actions={
          <DataFreshness
            label="Milestones"
            lastUpdatedAt={lastRemoteRefresh.core}
            error={remoteRefreshErrors.core}
            isRefreshing={loadingRemoteSlices.core}
            onRefresh={() => refreshRemoteState(currentUser.id, "core")}
          />
        }
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
          {fallbackFeatured.length === 0 ? (
            <EmptyState text="Complete a milestone to feature it on your profile." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              {fallbackFeatured.map((milestone) => (
                <div key={milestone.id} className="rounded-lg border border-saffron-200 bg-saffron-50 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-stone-950">{milestone.title}</p>
                      <p className="mt-1 text-sm leading-5 text-stone-600">{milestone.description}</p>
                    </div>
                    <CheckCircle2 className="shrink-0 text-saffron-700" size={18} />
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
              <p className="mt-1 text-sm leading-5 text-stone-700 sm:leading-6">{closestNext.description}</p>
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
        <p className="mb-3 text-sm leading-5 text-stone-600 sm:leading-6">
          Select up to 3 earned milestones for your profile.
        </p>
        {earned.length === 0 ? (
          <EmptyState text="No earned milestones yet. Log rounds to unlock the first one." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {earned.map((milestone) => {
              const selected = featuredIds.includes(milestone.id);
              const disabled = !selected && featuredIds.length >= 3;
              return (
                <button
                  key={milestone.id}
                  type="button"
                  className={`rounded-lg border px-3 py-2.5 text-left shadow-sm transition ${
                    selected ? "border-saffron-300 bg-saffron-50" : "border-stone-200 bg-white hover:border-saffron-200"
                  }`}
                  disabled={isBusy || disabled}
                  onClick={() => toggleFeatured(milestone.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md ${selected ? "bg-saffron-500 text-white" : "bg-stone-100 text-stone-500"}`}>
                      {selected ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-black text-stone-950">{milestone.title}</span>
                      <span className="mt-1 block text-sm leading-5 text-stone-600">{milestone.description}</span>
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
        <MilestoneGrid milestones={milestones} />
      </Panel>
    </div>
  );
}
