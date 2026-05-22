"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { ModerationReport } from "@/lib/types";
import { useChanting } from "../ChantingContext";
import { addDays, formatDate, roundsForDate } from "../domain";
import { Avatar, EmptyState, InlineNotice, Panel } from "../ui";

const statusOptions: Array<ModerationReport["status"] | "all"> = ["open", "reviewed", "dismissed", "all"];

export function AdminPage() {
  const {
    state,
    currentUser,
    isAdmin,
    isBusy,
    ensureAdminData,
    updateModerationReportStatus
  } = useChanting();
  const [statusFilter, setStatusFilter] = useState<ModerationReport["status"] | "all">("open");

  useEffect(() => {
    ensureAdminData();
  }, [ensureAdminData]);

  const reports = useMemo(() => {
    return (state.moderationReports || [])
      .filter((report) => statusFilter === "all" || report.status === statusFilter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.moderationReports, statusFilter]);
  const qualitySignals = useMemo(() => buildQualitySignals(state), [state]);

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

  return (
    <div className="space-y-6">
      <Panel title="Data quality signals" icon={<AlertTriangle size={18} />}>
        <div className="mb-4 rounded-md border border-peacock-100 bg-peacock-50 px-4 py-3 text-sm text-peacock-900">
          These are review hints only. Chanting totals are still honesty-based, and this panel does not change user data.
        </div>
        {qualitySignals.length === 0 ? (
          <EmptyState text="No unusual entries found right now." />
        ) : (
          <div className="space-y-3">
            {qualitySignals.slice(0, 30).map((signal) => (
              <div key={signal.id} className="rounded-md border border-stone-200 bg-white p-4">
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
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <AdminMetric label="Open" value={openCount} />
          <AdminMetric label="Reviewed" value={reviewedCount} />
          <AdminMetric label="Dismissed" value={dismissedCount} />
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-black capitalize ${
                statusFilter === status ? "bg-saffron-500 text-white" : "bg-stone-100 text-stone-700"
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        {reports.length === 0 ? (
          <EmptyState text="No moderation reports match this filter." />
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const reporter = state.users.find((user) => user.id === report.reporterId);
              const reported = state.users.find((user) => user.id === report.reportedUserId);
              return (
                <div key={report.id} className="rounded-md border border-stone-200 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                      <div className="rounded-md bg-stone-50 px-4 py-3">
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
    <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <p className="mt-1 text-3xl font-black text-stone-900">{value}</p>
    </div>
  );
}

function ReportPerson({ title, user, fallback }: { title: string; user: { avatarUrl: string; displayName: string; username: string; email: string } | undefined; fallback: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border border-stone-100 bg-white px-3 py-2">
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
