import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="mt-3 text-muted">
        The link may be old, or the report may have been deleted. Your other reports are safe.
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        Go to your reports
      </Link>
    </div>
  );
}
