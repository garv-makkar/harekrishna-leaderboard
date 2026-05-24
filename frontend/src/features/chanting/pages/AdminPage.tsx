"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { ModerationReport } from "@/lib/types";
import { publicSupabaseConfig, runtimeLabel } from "@/lib/config";
import { useChanting } from "../ChantingContext";
import { addDays, formatDate, roundsForDate } from "../domain";
import { Avatar, EmptyState, InlineNotice, MetricSkeletonGrid, Panel, PanelSkeleton } from "../ui";

const statusOptions: Array<ModerationReport["status"] | "all"> = ["open", "reviewed", "dismissed", "all"];
const signalFilters = [
  { label: "All signals", value: "all" },
  { label: "Max 999", value: "max" },
  { label: "Big jumps", value: "jump" },
  { label: "Recent high", value: "recent" }
] as const;
type SignalFilter = typeof signalFilters[number]["value"];

export function AdminPage() {
  const {
    state,
    currentUser,
    isAdmin,
    isBusy,
    emailVerified,
    loadedRemoteSlices,
    ensureAdminData,
    loadingRemoteSlices,
    updateModerationReportStatus
  } = useChanting();
  const [statusFilter, setStatusFilter] = useState<ModerationReport["status"] | "all">("open");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");
  const refreshedUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    ensureAdminData(true);
  }, [currentUser, ensureAdminData]);

  const reports = useMemo(() => {
    return (state.moderationReports || [])
      .filter((report) => statusFilter === "all" || report.status === statusFilter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.moderationReports, statusFilter]);
  const qualitySignals = useMemo(() => buildQualitySignals(state), [state]);
  const filteredQualitySignals = qualitySignals.filter((signal) => signalFilter === "all" || signal.type === signalFilter);

  if (!currentUser) return null;

  if (!isAdmin) {
    return (
      <Panel title="Admin review" icon={<ShieldCheck size={18} />}>
        <InlineNotice tone="info">
          Admin access is not enabled for this account. Add your user id to the app_admins table in Supabase to unlock this page.
        </InlineNotice>
      </Panel>
    );
  }

  const openCount = state.moderationReports.filter((report) => report.status === "open").length;
  const reviewedCount = state.moderationReports.filter((report) => report.status === "reviewed").length;
  const dismissedCount = state.moderationReports.filter((report) => report.status === "dismissed").length;
  const isLoadingAdmin = loadingRemoteSlices.admin && state.moderationReports.length === 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <ProductionReadinessPanel
        emailVerified={emailVerified}
        loadedRemoteSlices={loadedRemoteSlices}
        userCount={state.users.length}
        groupCount={state.groups.length}
      />
      <Panel title="Data quality signals" icon={<AlertTriangle size={18} />}>
        <div className="mb-4 rounded-md border border-peacock-100 bg-peacock-50 px-3 py-2.5 text-sm text-peacock-900 sm:px-4">
          These are review hints only. Chanting totals are still honesty-based, and this panel does not change user data.
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <AdminMetric label="Max entries" value={qualitySignals.filter((signal) => signal.type === "max").length} />
          <AdminMetric label="Big jumps" value={qualitySignals.filter((signal) => signal.type === "jump").length} />
          <AdminMetric label="Recent high" value={qualitySignals.filter((signal) => signal.type === "recent").length} />
        </div>
        <div className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
          {signalFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-black transition sm:py-2 ${
                signalFilter === filter.value ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
              }`}
              onClick={() => setSignalFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {filteredQualitySignals.length === 0 ? (
          <EmptyState text="No unusual entries found right now." />
        ) : (
          <div className="space-y-3">
            {filteredQualitySignals.slice(0, 30).map((signal) => (
              <div key={signal.id} className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <ReportPerson title={signal.label} user={signal.user} fallback={signal.userId} />
                  <div className="rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-700 sm:max-w-sm">
                    <p className="font-black text-stone-900">{signal.reason}</p>
                    <p>{signal.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel title="Admin review" icon={<ShieldCheck size={18} />}>
        {isLoadingAdmin ? (
          <div className="mb-5">
            <MetricSkeletonGrid />
          </div>
        ) : (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <AdminMetric label="Open" value={openCount} />
            <AdminMetric label="Reviewed" value={reviewedCount} />
            <AdminMetric label="Dismissed" value={dismissedCount} />
          </div>
        )}
        <div className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-black capitalize transition sm:py-2 ${
                statusFilter === status ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        {isLoadingAdmin ? (
          <div className="-m-4 sm:-m-5">
            <PanelSkeleton rows={3} title={false} />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState text="No moderation reports match this filter." />
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const reporter = state.users.find((user) => user.id === report.reporterId);
              const reported = state.users.find((user) => user.id === report.reportedUserId);
              return (
                <div key={report.id} className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-black uppercase ${statusClass(report.status)}`}>
                          {report.status}
                        </span>
                        <span className="text-sm text-stone-500">{new Date(report.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <ReportPerson title="Reported user" user={reported} fallback={report.reportedUserId} />
                        <ReportPerson title="Reporter" user={reporter} fallback={report.reporterId} />
                      </div>
                      <div className="rounded-md bg-stone-50 px-3 py-2.5 sm:px-4 sm:py-3">
                        <p className="text-sm font-black text-stone-900">Reason</p>
                        <p className="text-sm text-stone-700">{report.reason}</p>
                        {report.details && (
                          <>
                            <p className="mt-3 text-sm font-black text-stone-900">Details</p>
                            <p className="whitespace-pre-wrap text-sm text-stone-700">{report.details}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:w-48 lg:flex-col">
                      <button
                        type="button"
                        className="rounded-md bg-peacock-600 px-3 py-2 text-sm font-bold text-white disabled:bg-peacock-300"
                        disabled={isBusy || report.status === "reviewed"}
                        onClick={() => updateModerationReportStatus(report.id, "reviewed")}
                      >
                        Mark reviewed
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-stone-900 px-3 py-2 text-sm font-bold text-white disabled:bg-stone-300"
                        disabled={isBusy || report.status === "dismissed"}
                        onClick={() => updateModerationReportStatus(report.id, "dismissed")}
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-saffron-500 px-3 py-2 text-sm font-bold text-white disabled:bg-saffron-200"
                        disabled={isBusy || report.status === "open"}
                        onClick={() => updateModerationReportStatus(report.id, "open")}
                      >
                        Reopen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ProductionReadinessPanel({
  emailVerified,
  loadedRemoteSlices,
  userCount,
  groupCount
}: {
  emailVerified: boolean | null;
  loadedRemoteSlices: { groups: boolean; friends: boolean; admin: boolean };
  userCount: number;
  groupCount: number;
}) {
  const checks = [
    {
      label: "Runtime",
      ok: publicSupabaseConfig.mode === "supabase",
      detail: runtimeLabel(publicSupabaseConfig.mode)
    },
    {
      label: "Public env",
      ok: publicSupabaseConfig.issues.length === 0,
      detail: publicSupabaseConfig.issues[0] || publicSupabaseConfig.warnings[0] || "Supabase public env is usable."
    },
    {
      label: "Core data",
      ok: userCount > 0,
      detail: `${userCount} user profile${userCount === 1 ? "" : "s"} loaded.`
    },
    {
      label: "Groups data",
      ok: loadedRemoteSlices.groups,
      detail: loadedRemoteSlices.groups ? `${groupCount} group${groupCount === 1 ? "" : "s"} loaded.` : "Open Groups once to load group slices."
    },
    {
      label: "Friends data",
      ok: loadedRemoteSlices.friends,
      detail: loadedRemoteSlices.friends ? "Friend request slice loaded." : "Open Friends once to load friend slices."
    },
    {
      label: "Admin data",
      ok: loadedRemoteSlices.admin,
      detail: loadedRemoteSlices.admin ? "Admin review slice loaded." : "Admin slice has not loaded yet."
    },
    {
      label: "Email status",
      ok: emailVerified === true,
      detail: emailVerified ? "Current admin email is verified." : "Verify email before production testing."
    },
    {
      label: "Latest migration",
      ok: true,
      detail: "Code expects migration 011 for goals, reminders, and group announcements."
    }
  ];

  return (
    <Panel title="Production readiness" icon={<ShieldCheck size={18} />}>
      <div className="mb-4 rounded-md border border-peacock-100 bg-peacock-50 px-3 py-2.5 text-sm leading-6 text-peacock-900 sm:px-4">
        This checklist is a quick app-side view. Before deployment, still confirm Supabase SQL migrations, storage buckets, SMTP, and environment variables in the Supabase/Vercel dashboards.
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => (
          <div key={check.label} className={`rounded-lg border px-3 py-2.5 shadow-sm sm:px-4 sm:py-3 ${check.ok ? "border-emerald-100 bg-emerald-50" : "border-saffron-200 bg-saffron-50"}`}>
            <p className={`text-sm font-black ${check.ok ? "text-emerald-800" : "text-saffron-900"}`}>
              {check.ok ? "Ready" : "Check"}: {check.label}
            </p>
            <p className="mt-1 text-sm leading-5 text-stone-700">{check.detail}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function buildQualitySignals(state: ReturnType<typeof useChanting>["state"]) {
  return state.chantTotals.flatMap((entry) => {
    const user = state.users.find((item) => item.id === entry.userId);
    const previousDate = addDays(entry.localDate, -1);
    const previousRounds = roundsForDate(state.chantTotals, entry.userId, previousDate);
    const jump = entry.rounds - previousRounds;
    const recentUpdate =
      entry.updatedAt && Date.now() - new Date(entry.updatedAt).getTime() < 10 * 60 * 1000;
    const signals = [];
    if (entry.rounds >= 999) {
      signals.push({
        id: `${entry.userId}-${entry.localDate}-cap`,
        type: "max" as const,
        label: "Max entry",
        user,
        userId: entry.userId,
        reason: "Daily cap reached",
        detail: `${formatDate(entry.localDate)} has ${entry.rounds} rounds.`
      });
    }
    if (jump >= 108) {
      signals.push({
        id: `${entry.userId}-${entry.localDate}-jump`,
        type: "jump" as const,
        label: "Large jump",
        user,
        userId: entry.userId,
        reason: `Jumped by ${jump} rounds`,
        detail: `${formatDate(previousDate)} had ${previousRounds}; ${formatDate(entry.localDate)} has ${entry.rounds}.`
      });
    }
    if (recentUpdate && entry.rounds >= 64) {
      signals.push({
        id: `${entry.userId}-${entry.localDate}-recent`,
        type: "recent" as const,
        label: "Recent high edit",
        user,
        userId: entry.userId,
        reason: "High total updated recently",
        detail: `${entry.rounds} rounds updated at ${new Date(entry.updatedAt).toLocaleString()}.`
      });
    }
    return signals;
  });
}

function AdminMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <p className="mt-0.5 text-xl font-black text-stone-900 sm:text-2xl">{value}</p>
    </div>
  );
}

function ReportPerson({ title, user, fallback }: { title: string; user: { avatarUrl: string; displayName: string; username: string; email: string } | undefined; fallback: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-stone-100 bg-white px-3 py-2 shadow-sm">
      <Avatar src={user?.avatarUrl || ""} label={user?.displayName || user?.username || "User"} />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase text-stone-500">{title}</p>
        <p className="truncate font-black text-stone-900">{user?.displayName || user?.username || "Unknown user"}</p>
        <p className="truncate text-sm text-stone-500">{user ? `@${user.username}` : fallback}</p>
        {user?.email && <p className="truncate text-xs text-stone-400">{user.email}</p>}
      </div>
    </div>
  );
}

function statusClass(status: ModerationReport["status"]) {
  if (status === "open") return "bg-saffron-50 text-saffron-900";
  if (status === "reviewed") return "bg-peacock-50 text-peacock-900";
  return "bg-stone-100 text-stone-700";
}
