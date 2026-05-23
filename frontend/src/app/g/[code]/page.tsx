import { PublicGroupInvitePage } from "@/features/chanting/pages/PublicGroupInvitePage";

export default async function PublicGroupPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PublicGroupInvitePage code={code} />;
}
