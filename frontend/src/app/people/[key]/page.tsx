import { PersonView } from "@/components/PersonView";

export default async function PersonPage({ params }: PageProps<"/people/[key]">) {
  const { key } = await params;
  return <PersonView personKey={decodeURIComponent(key)} />;
}
