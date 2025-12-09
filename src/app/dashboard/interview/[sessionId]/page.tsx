import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { InterviewChat } from "@/components/chat/InterviewChat";

export default async function InterviewPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = await params; // Next.js 15 await params
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Charger l'historique existant
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl h-full">
        <InterviewChat sessionId={sessionId} initialMessages={messages || []} />
      </div>
    </div>
  );
}