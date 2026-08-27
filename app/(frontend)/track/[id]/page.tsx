import { redirect } from 'next/navigation';

export default async function TrackRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  redirect('/tracking/' + resolvedParams.id);
}
