"use client";

import { Flame, HeartHandshake, Sparkles, Trophy } from "lucide-react";
import { Panel } from "../ui";

export function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-saffron-200/80 bg-white/92 p-5 shadow-soft lg:p-6">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
            <Flame size={16} /> Hare Krishna Leaderboard
          </div>
          <h2 className="text-3xl font-black tracking-normal text-stone-950">A simple place for honest chanting consistency.</h2>
          <p className="mt-3 leading-7 text-stone-700">
            Track daily rounds, keep gentle accountability with friends and groups, and make progress visible without making the practice complicated.
          </p>
        </div>
      </section>
      <Panel title="About the website" icon={<Flame size={18} />}>
        <div className="grid gap-3 md:grid-cols-3">
          <AboutTile icon={<Flame size={18} />} title="Daily practice" text="Enter rounds for today and recent editable days." />
          <AboutTile icon={<HeartHandshake size={18} />} title="Friends and groups" text="Build small accountability circles with people you know." />
          <AboutTile icon={<Trophy size={18} />} title="Leaderboards" text="View daily, weekly, and monthly ranking with tied ranks." />
        </div>
      </Panel>
      <Panel title="About the developer" icon={<Sparkles size={18} />}>
        <p className="max-w-3xl leading-7 text-stone-700">
          This space is ready for your story, contact links, project purpose, and future updates. You can add your
          name, temple/community details, GitHub, Instagram, or any personal note later.
        </p>
      </Panel>
    </div>
  );
}

function AboutTile({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-peacock-50 text-peacock-900 ring-1 ring-peacock-100">
        {icon}
      </div>
      <p className="font-black text-stone-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}
