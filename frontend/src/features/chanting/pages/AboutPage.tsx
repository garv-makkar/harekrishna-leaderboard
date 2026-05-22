"use client";

import { Flame, Sparkles } from "lucide-react";
import { Panel } from "../ui";

export function AboutPage() {
  return (
    <div className="space-y-6">
      <Panel title="About the website" icon={<Flame size={18} />}>
        <p className="max-w-3xl leading-7 text-stone-700">
          Hare Krishna Leaderboard is a simple chanting companion for tracking daily rounds with friends, groups,
          and the wider community. It is designed around trust: devotees enter their own rounds, and leaderboards
          make consistency visible without making the practice feel complicated.
        </p>
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
