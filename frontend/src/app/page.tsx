import { ReportList } from "@/components/ReportList";
import { UploadCard } from "@/components/UploadCard";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Understand your lab reports.</h1>
        <p className="max-w-xl text-slate-600 dark:text-slate-400">
          Upload a report from any lab. ReportSaathi reads every value and shows you which ones are outside
          the normal range.
        </p>
      </section>
      <UploadCard />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Your reports</h2>
        <ReportList />
      </section>
    </div>
  );
}
