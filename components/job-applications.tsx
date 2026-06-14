"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, ExternalLink, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const sources = [
  {
    name: "LinkedIn",
    color: "bg-sky-300",
    getUrl: (query: string, location: string) =>
      `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${location}`,
  },
  {
    name: "Handshake",
    color: "bg-fuchsia-300",
    getUrl: (query: string, location: string) =>
      `https://app.joinhandshake.com/stu/postings?query=${query}&location=${location}`,
  },
  {
    name: "Indeed",
    color: "bg-emerald-300",
    getUrl: (query: string, location: string) =>
      `https://www.indeed.com/jobs?q=${query}&l=${location}`,
  },
  {
    name: "Google Jobs",
    color: "bg-amber-300",
    getUrl: (query: string, location: string) =>
      `https://www.google.com/search?q=${query}+jobs+${location}`,
  },
  {
    name: "Simplify",
    color: "bg-indigo-300",
    getUrl: (query: string, location: string) =>
      `https://simplify.jobs/jobs?query=${query}&location=${location}`,
  },
  {
    name: "Wellfound",
    color: "bg-rose-300",
    getUrl: (query: string, location: string) =>
      `https://wellfound.com/jobs?keyword=${query}&location=${location}`,
  },
];

export function JobApplications() {
  const [role, setRole] = useState("software engineering intern");
  const [location, setLocation] = useState("United States");
  const encodedRole = useMemo(() => encodeURIComponent(role), [role]);
  const encodedLocation = useMemo(
    () => encodeURIComponent(location),
    [location]
  );

  return (
    <section className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
      <div className="pixel-panel grid content-start gap-4 p-4">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="size-5 text-amber-300" />
          <div>
            <h2 className="font-mono text-sm font-black uppercase text-slate-50">
              Job applications
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Search major boards and collect applications in one workflow.
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm text-slate-300">
          Role
          <Input
            className="pixel-input h-11"
            onChange={(event) => setRole(event.target.value)}
            value={role}
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-300">
          Location
          <Input
            className="pixel-input h-11"
            onChange={(event) => setLocation(event.target.value)}
            value={location}
          />
        </label>

        <div className="border-2 border-slate-950 bg-slate-950/70 p-3 text-sm leading-6 text-slate-400 shadow-[3px_3px_0_#020617]">
          Public job boards can open from here now. Logged-in feeds like
          Handshake and LinkedIn need approved APIs, user-side imports, or
          browser extension style access before listings can be pulled directly.
        </div>
      </div>

      <div className="pixel-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b-2 border-slate-950 bg-slate-800 px-4 py-3 font-mono text-sm font-black uppercase text-slate-50">
          <Search className="size-4 text-emerald-200" />
          Source board
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {sources.map((source) => (
            <a
              className="border-2 border-slate-950 bg-slate-900 p-4 text-slate-200 shadow-[4px_4px_0_#020617] transition hover:-translate-y-0.5 hover:bg-slate-800"
              href={source.getUrl(encodedRole, encodedLocation)}
              key={source.name}
              rel="noreferrer"
              target="_blank"
            >
              <div
                className={`mb-4 grid size-10 place-items-center border-2 border-slate-950 text-slate-950 ${source.color}`}
              >
                <ExternalLink className="size-5" />
              </div>
              <div className="font-mono text-sm font-black uppercase">
                {source.name}
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-500">
                {role || "Any role"} in {location || "anywhere"}
              </div>
            </a>
          ))}
        </div>
        <div className="border-t-2 border-slate-950 p-4">
          <Button className="pixel-button h-11" type="button">
            <Search className="size-4" />
            Application tracker coming next
          </Button>
        </div>
      </div>
    </section>
  );
}
