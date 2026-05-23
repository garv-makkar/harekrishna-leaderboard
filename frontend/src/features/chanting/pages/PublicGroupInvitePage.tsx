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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7ed,transparent_32%),linear-gradient(135deg,#fffaf0,#f5fffb_48%,#fff7ed)] px-4 py-5 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-black text-stone-800 shadow-sm ring-1 ring-saffron-200"
          >
            <Home size={17} /> Hare Krishna Leaderboard
          </Link>
          <span className="inline-flex w-fit items-center gap-2 rounded-md bg-peacock-50 px-3 py-2 text-sm font-black text-peacock-900 ring-1 ring-peacock-100">
            <ShieldCheck size={16} /> Group invite
          </span>
        </div>

        {isLoading && (
          <div className="rounded-lg border border-saffron-200 bg-white/90 p-6 shadow-soft">
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
              className="mt-4 inline-flex rounded-md bg-saffron-500 px-4 py-3 text-sm font-black text-white shadow-sm"
            >
              Open app
            </Link>
          </Panel>
        )}

        {payload && (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-lg border border-saffron-200 bg-white/92 shadow-soft">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="p-5 sm:p-6">
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                    <Avatar src={payload.group.imageUrl} label={payload.group.name} />
                    <div className="min-w-0">
                      <p className="mb-2 inline-flex rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
                        Code {payload.group.code}
                      </p>
                      <h1 className="truncate text-3xl font-black tracking-normal text-stone-950">{payload.group.name}</h1>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        Invited by {payload.owner.displayName || payload.owner.username}. Created {formatDate(payload.group.createdAt.slice(0, 10))}.
                      </p>
                    </div>
                  </div>
                  {payload.group.announcement && (
                    <div className="mt-5 rounded-lg border border-peacock-100 bg-peacock-50 px-4 py-3 text-sm leading-6 text-peacock-950">
                      <p className="font-black">Pinned announcement</p>
                      <p>{payload.group.announcement}</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-saffron-100 bg-saffron-50/80 p-5 lg:border-l lg:border-t-0">
                  <p className="text-sm font-black uppercase text-stone-500">Members</p>
                  <p className="mt-2 text-6xl font-black text-saffron-900">{payload.memberCount}</p>
                  <p className="text-sm font-bold text-stone-600">currently joined</p>
                </div>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Panel title="Join this group" icon={<Users size={18} />}>
                <p className="text-sm leading-6 text-stone-600">
                  Sign in or create an account to join this group. After login, the invite code will be ready on the Groups page.
                </p>
                <Link
                  href={continueHref}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-3 text-sm font-black text-white shadow-sm"
                >
                  <ExternalLink size={17} /> Continue to join
                </Link>
              </Panel>

              <Panel title="Group targets" icon={<Target size={18} />}>
                <div className="grid gap-3">
                  <InviteMetric label="Daily target" value={payload.group.targetDaily || 0} note={payload.group.targetDaily ? "rounds per day" : "not set"} />
                  <InviteMetric label="Weekly target" value={payload.group.targetWeekly || 0} note={payload.group.targetWeekly ? "rounds per week" : "not set"} />
                </div>
              </Panel>
            </div>

            <Panel title="Owner" icon={<CalendarDays size={18} />}>
              <div className="flex min-w-0 items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
                <Avatar src={payload.owner.avatarUrl} label={payload.owner.displayName || payload.owner.username} />
                <div className="min-w-0">
                  <p className="truncate font-black text-stone-950">{payload.owner.displayName || payload.owner.username}</p>
                  <p className="truncate text-sm text-stone-600">@{payload.owner.username}</p>
                </div>
              </div>
            </Panel>
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

function InviteMetric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <p className="mt-1 text-3xl font-black text-saffron-900">{value || "-"}</p>
      <p className="text-sm text-stone-600">{note}</p>
    </div>
  );
}
