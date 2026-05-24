"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, Home, Loader2, ShieldCheck, Target, Users } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createSeedState, formatDate, loadState, normalizeGroupCode, readableError } from "../domain";
import { Avatar, EmptyState, Panel } from "../ui";

type PublicGroupInvitePayload = {
  group: {
    name: string;
    code: string;
    imageUrl: string;
    announcement: string;
    targetDaily: number;
    targetWeekly: number;
    createdAt: string;
  };
  owner: {
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  memberCount: number;
};

export function PublicGroupInvitePage({ code }: { code: string }) {
  const cleanCode = normalizeGroupCode(decodeURIComponent(code));
  const [payload, setPayload] = useState<PublicGroupInvitePayload | null>(null);
  const [status, setStatus] = useState("Loading group invite...");
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setStatus("Loading group invite...");
      try {
        const data = supabase ? await loadRemoteInvite(cleanCode) : loadDemoInvite(cleanCode);
        if (cancelled) return;
        if (!data) {
          setPayload(null);
          setStatus("No group was found for this invite code.");
          return;
        }
        setPayload(data);
        setStatus("");
      } catch (error) {
        if (cancelled) return;
        const message = readableError(error);
        setPayload(null);
        setStatus(
          message.toLowerCase().includes("get_public_group_invite")
            ? "Run migration 014_public_group_invite_rpc.sql in Supabase to enable public group invite links."
            : message
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [cleanCode]);

  const continueHref = `/?group=${encodeURIComponent(cleanCode)}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7ed,transparent_32%),linear-gradient(135deg,#fffaf0,#f5fffb_48%,#fff7ed)] px-3 py-3 text-stone-900 sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-black text-stone-800 shadow-sm ring-1 ring-saffron-200 sm:w-fit"
          >
            <Home size={17} /> Hare Krishna Leaderboard
          </Link>
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-peacock-50 px-3 py-2 text-sm font-black text-peacock-900 ring-1 ring-peacock-100 sm:w-fit">
            <ShieldCheck size={16} /> Group invite
          </span>
        </div>

        {isLoading && (
          <div className="rounded-lg border border-saffron-200 bg-white/90 p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-3 text-saffron-900">
              <Loader2 className="animate-spin" size={20} />
              <p className="font-black">{status}</p>
            </div>
          </div>
        )}

        {!isLoading && !payload && (
          <Panel title="Invite unavailable" icon={<Users size={18} />}>
            <EmptyState text={status || "This group invite could not be loaded."} />
            <Link
              href="/"
              className="mt-4 inline-flex rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white shadow-sm"
            >
              Open app
            </Link>
          </Panel>
        )}

        {payload && (
          <div className="space-y-4 sm:space-y-5">
            <section className="overflow-hidden rounded-lg border border-saffron-200 bg-white/94 text-center shadow-soft">
              <div className="border-b border-saffron-100 bg-saffron-50/80 px-3 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-lg ring-1 ring-saffron-200 sm:h-20 sm:w-20">
                  {payload.group.imageUrl ? (
                    <img src={payload.group.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="lotus-mark grid h-full w-full place-items-center text-xl font-black text-white">
                      {payload.group.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="mx-auto mb-2 inline-flex rounded-md bg-white px-3 py-1.5 text-sm font-black text-saffron-900 ring-1 ring-saffron-100 sm:mb-3 sm:py-2">
                  Code {payload.group.code}
                </p>
                <h1 className="text-xl font-black tracking-normal text-stone-950 sm:text-3xl">{payload.group.name}</h1>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-stone-600 sm:leading-6">
                  Invited by {payload.owner.displayName || payload.owner.username}.
                </p>
                {copyStatus && <p className="mx-auto mt-3 w-fit rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">{copyStatus}</p>}
                <div className="mx-auto mt-3 grid max-w-sm gap-2 sm:mt-4 sm:flex sm:max-w-none sm:justify-center">
                  <Link
                    href={continueHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-5 py-2.5 text-sm font-black text-white shadow-sm sm:w-auto sm:py-3"
                  >
                    <ExternalLink size={17} /> Continue to join
                  </Link>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-black text-saffron-900 ring-1 ring-saffron-200 sm:w-auto sm:py-3"
                    onClick={() => {
                      navigator.clipboard.writeText(payload.group.code).then(
                        () => {
                          setCopyStatus("Group code copied.");
                          window.setTimeout(() => setCopyStatus(""), 2500);
                        },
                        () => setCopyStatus(`Code: ${payload.group.code}`)
                      );
                    }}
                  >
                    Copy code
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0">
                <InviteHeroMetric label="Members" value={payload.memberCount} />
                <InviteHeroMetric label="Daily target" value={payload.group.targetDaily || 0} />
                <InviteHeroMetric label="Weekly target" value={payload.group.targetWeekly || 0} />
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Panel title="Join this group" icon={<Users size={18} />}>
                <p className="text-sm leading-5 text-stone-600 sm:leading-6">
                  Sign in or create an account. The code will open on the Groups page.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <InviteTrustPill title="Private account" text="Email and phone are not shown here." />
                  <InviteTrustPill title="Self-entered rounds" text="Leaderboards use members' saved totals." />
                  <InviteTrustPill title="Join by code" text="Only this group code is needed." />
                </div>
                <div className="mt-3 rounded-lg border border-peacock-100 bg-peacock-50 px-3 py-2.5 text-sm leading-5 text-peacock-950 sm:mt-4 sm:px-4 sm:leading-6">
                  <p className="font-black">What happens after joining</p>
                  <p>Your saved rounds will count in this group&apos;s leaderboards.</p>
                </div>
                <Link
                  href={continueHref}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white shadow-sm"
                >
                  <ExternalLink size={17} /> Continue to join
                </Link>
              </Panel>

              <Panel title="Owner" icon={<CalendarDays size={18} />}>
                <div className="flex min-w-0 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
                  <Avatar src={payload.owner.avatarUrl} label={payload.owner.displayName || payload.owner.username} />
                  <div className="min-w-0 text-left">
                    <p className="truncate font-black text-stone-950">{payload.owner.displayName || payload.owner.username}</p>
                    <p className="truncate text-sm text-stone-600">@{payload.owner.username}</p>
                  </div>
                </div>
              </Panel>
            </div>

            {payload.group.announcement && (
              <Panel title="Pinned announcement" icon={<Target size={18} />}>
                <p className="text-sm font-bold leading-6 text-stone-700">{payload.group.announcement}</p>
              </Panel>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

async function loadRemoteInvite(code: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_public_group_invite", { group_code: code });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data as PublicGroupInvitePayload | null;
}

function loadDemoInvite(code: string) {
  const state = typeof window === "undefined" ? createSeedState() : loadState();
  const group = state.groups.find((item) => item.code.toUpperCase() === code.toUpperCase());
  if (!group) return null;
  const owner = state.users.find((user) => user.id === group.ownerId);
  return {
    group: {
      name: group.name,
      code: group.code,
      imageUrl: group.imageUrl,
      announcement: group.announcement,
      targetDaily: group.targetDaily,
      targetWeekly: group.targetWeekly,
      createdAt: group.createdAt
    },
    owner: {
      username: owner?.username || "owner",
      displayName: owner?.displayName || owner?.username || "Group owner",
      avatarUrl: owner?.avatarUrl || ""
    },
    memberCount: state.groupMembers.filter((member) => member.groupId === group.id).length
  } satisfies PublicGroupInvitePayload;
}

function InviteTrustPill({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-left shadow-sm">
      <p className="text-sm font-black text-stone-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-stone-600">{text}</p>
    </div>
  );
}

function InviteHeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-t border-saffron-100 px-2 py-2.5 last:border-r-0 sm:px-3 sm:py-3">
      <p className="text-xl font-black text-saffron-900 sm:text-3xl">{value || "-"}</p>
      <p className="mt-0.5 text-xs font-black uppercase text-stone-500">{label}</p>
    </div>
  );
}
