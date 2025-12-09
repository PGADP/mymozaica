import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { InterviewChat } from "@/components/chat/InterviewChat";

// ⚠️ CORRECTION TYPE NEXT.JS 15 : params est une Promise
interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function InterviewPage({ params }: PageProps) {
  // ⚠️ CORRECTION : On await les params
  const { sessionId } = await params;
  
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