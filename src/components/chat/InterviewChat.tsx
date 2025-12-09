'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Send, Loader2, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder'; // Import du recorder
import Link from 'next/link';

type Message = { id: string; role: 'user' | 'assistant'; content: string; };

export function InterviewChat({ sessionId, initialMessages = [] }: { sessionId: string, initialMessages?: any[] }) {
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [history, setHistory] = useState<Message[]>(initialMessages);
  const [draftText, setDraftText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // 1. AUTO-START : Si l'historique est vide, l'IA commence
  useEffect(() => {
    if (history.length === 0 && !isThinking) {
      triggerAIResponse("START_SESSION_HIDDEN_PROMPT");
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isThinking]);

  // Fonction centrale pour parler à l'IA
  const triggerAIResponse = async (userMessage: string) => {
    setIsThinking(true);
    try {
      const response = await fetch('/api/agents/interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userMessage }),
      });
      if (!response.ok) throw new Error('Erreur IA');
      const data = await response.json();
      setHistory(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.reply }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSend = async () => {
    if (!draftText.trim() || isThinking) return;
    const userText = draftText;
    setDraftText('');
    setHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userText }]);
    
    // Sauvegarde user message
    await supabase.from('messages').insert({ session_id: sessionId, role: 'user', content: userText });
    
    // Appel IA
    await triggerAIResponse(userText);
  };

  // Gestion Audio
  const handleAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm'); // Whisper aime le .webm ou .mp3
    
    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) {
        // On ajoute le texte au brouillon pour laisser l'user éditer
        setDraftText(prev => prev ? `${prev} ${data.text}` : data.text);
      }
    } catch (e) {
      alert("Erreur de transcription audio");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-[#FDF6E3] text-[#2C3E50] font-sans transition-all duration-300 ${
      !isMaximized ? 'md:relative md:h-[85vh] md:rounded-3xl md:border-4 md:border-white md:shadow-2xl' : ''
    }`}>
      
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur border-b border-[#2C3E50]/10 px-6 py-4 flex items-center justify-between shadow-sm rounded-t-[20px] z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-[#47627D] hover:text-[#E76F51] transition font-bold text-sm">
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Sauvegarder et Quitter</span>
        </Link>
        <div className="flex gap-2">
          <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 text-[#47627D] hover:bg-[#FDF6E3] rounded-full transition-colors" title="Agrandir/Réduire">
              {isMaximized ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
          </button>
        </div>
      </header>

      {/* ZONE DE CHAT */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-[#FDF6E3]">
        <div className="max-w-3xl mx-auto space-y-8 pb-4">
          
          {history.length === 0 && isThinking && (
            <div className="text-center p-8">
              <Loader2 size={32} className="animate-spin text-[#E76F51] mx-auto mb-2" />
              <p className="text-[#47627D] text-sm">Le biographe prépare sa première question...</p>
            </div>
          )}

          {history.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[75%] p-6 rounded-3xl text-lg leading-relaxed shadow-sm relative group ${
                msg.role === 'user' 
                  ? 'bg-[#E76F51] text-white rounded-br-none shadow-[#E76F51]/20' 
                  : 'bg-white text-[#2C3E50] border border-white shadow-[#2C3E50]/5 rounded-bl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {isThinking && history.length > 0 && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-white/50 p-4 rounded-3xl rounded-bl-none flex items-center gap-3 text-[#47627D] text-sm italic">
                <span className="w-2 h-2 bg-[#47627D] rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-[#47627D] rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-[#47627D] rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
          
          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT ZONE */}
      <div className="bg-white p-4 md:p-6 border-t border-[#2C3E50]/5 rounded-b-[20px] shadow-[0_-5px_20px_rgba(0,0,0,0.02)] z-20">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          
          {/* Audio Button */}
          <AudioRecorder onAudioReady={handleAudio} />

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={isTranscribing ? "Transcription en cours..." : "Écrivez votre réponse (ou utilisez le micro)..."}
              className={`w-full p-4 pr-12 bg-[#FDF6E3]/50 border border-[#2C3E50]/10 rounded-2xl focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white outline-none resize-none text-[#2C3E50] transition-all ${
                isTranscribing ? 'animate-pulse cursor-wait' : ''
              }`}
              style={{ minHeight: '60px', maxHeight: '150px' }}
              rows={1}
              disabled={isThinking || isTranscribing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {/* Bouton Envoyer (Dans le champ) */}
            <button 
              onClick={handleSend} 
              disabled={!draftText.trim() || isThinking || isTranscribing}
              className="absolute right-2 bottom-2 p-2.5 bg-[#2A9D8F] text-white rounded-xl hover:bg-[#1F7A6F] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}