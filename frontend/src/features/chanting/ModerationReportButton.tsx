"use client";

import { FormEvent, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useChanting } from "./ChantingContext";
import { Field, InlineNotice } from "./ui";

const reportReasons = [
  "Inappropriate name or picture",
  "Suspicious leaderboard activity",
  "Harassment or spam",
  "Other"
];

export function ModerationReportButton({ userId, username }: { userId: string; username: string }) {
  const { currentUser, isBusy, submitUserReport } = useChanting();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(reportReasons[0]);
  const [details, setDetails] = useState("");

  if (!currentUser || currentUser.id === userId) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await submitUserReport(userId, reason, details);
    setIsOpen(false);
    setDetails("");
    setReason(reportReasons[0]);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-700"
        onClick={() => setIsOpen(true)}
      >
        <ShieldAlert size={15} /> Report
      </button>
    );
  }

  return (
    <form className="mt-3 space-y-3 rounded-md border border-red-200 bg-red-50 p-3" onSubmit={submit}>
      <InlineNotice tone="error">Report @{username} for moderator review.</InlineNotice>
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-red-900">Reason</span>
        <select
          className="w-full rounded-md border border-red-200 bg-white px-3 py-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {reportReasons.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <Field label="Details" value={details} onChange={setDetails} placeholder="Optional context for review" />
      <div className="flex flex-wrap gap-2">
        <button className="rounded-md bg-red-700 px-3 py-2 text-sm font-bold text-white" disabled={isBusy}>
          Submit report
        </button>
        <button
          type="button"
          className="rounded-md bg-white px-3 py-2 text-sm font-bold text-stone-700"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
