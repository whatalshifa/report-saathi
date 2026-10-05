"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listPeople, type PersonSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";

export function PeopleList() {
  const [people, setPeople] = useState<PersonSummary[] | null>(null);

  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, []);

  if (!people || people.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Health timelines</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {people.map((person) => (
          <li key={person.key}>
            <Link
              href={`/people/${encodeURIComponent(person.key)}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-teal-500 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="font-semibold">{person.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {person.report_count} report{person.report_count === 1 ? "" : "s"} · latest{" "}
                {formatDate(person.last_date)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
