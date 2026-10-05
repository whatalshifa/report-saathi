import { PeopleList } from "@/components/PeopleList";
import { ReportList } from "@/components/ReportList";
import { UploadCard } from "@/components/UploadCard";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Understand your lab reports.</h1>
        <p className="max-w-xl text-slate-600 dark:text-slate-400">
          Upload reports from any lab. ReportSaathi reads every value, flags the ones outside the normal range,
          explains them in English, Hindi or Marathi, and lines up reports from different labs into one timeline.
        </p>
      </section>
      <UploadCard />
      <PeopleList />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Your reports</h2>
        <ReportList />
      </section>
    </div>
  );
}
