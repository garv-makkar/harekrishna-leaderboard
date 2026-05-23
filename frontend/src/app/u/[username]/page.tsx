import { PublicProfileRoutePage } from "@/features/chanting/pages/PublicProfileRoutePage";

export default async function PublicUserPage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PublicProfileRoutePage username={username} />;
}
