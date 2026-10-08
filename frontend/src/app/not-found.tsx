import Link from "next/link";

import { StatusPanel } from "@/components/StatusPanel";

export default function NotFound() {
  return (
    <StatusPanel
      tone="missing"
      title="This page doesn't exist"
      heading="h1"
      bare
      actions={
        <Link href="/" className="btn btn-primary">
          Go to your reports
        </Link>
      }
    >
      The link may be old, or the report may have been deleted. Your other reports are safe.
    </StatusPanel>
  );
}
