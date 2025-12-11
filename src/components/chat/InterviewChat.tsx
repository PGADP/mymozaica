'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Send, Loader2, ArrowLeft, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Import dynamique pour éviter les erreurs SSR (Worker is not defined)
const AudioRecorder = dynamic(() => import('@/components/AudioRecorder'), {
  ssr: false,
  loading: () => <div className="w-12 h-12" /> // Placeholder pendant le chargement
});

type Message = { id: string; role: 'user' | 'assistant'; content: string; };

interface SessionContext {
  era_label: string;
  era_description: string;
  start_age: number;
  end_age: number;
}

interface BonusTopic {
  id: string;
  title: string;
  systemPrompt: string;
}

interface InterviewChatProps {
  sessionId: string;
  initialMessages?: any[];
  bonusTopic?: BonusTopic;
}

export function InterviewChat({ sessionId, initialMessages = [], bonusTopic }: InterviewChatProps) {
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  const [history, setHistory] = useState<Message[]>(initialMessages);
  const [draftText, setDraftText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [context, setContext] = useState<SessionContext | null>(null);
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);

  // 1. CHARGER LE CONTEXTE DE LA SESSION (seulement pour les interviews d'ères, pas bonus)
  useEffect(() => {
    if (bonusTopic) return; // Pas besoin de charger le contexte pour un bonus topic

    const loadContext = async () => {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select(`eras!inner (label, description, start_age, end_age)`)
        .eq('id', sessionId)
        .single();

      if (session && session.eras) {
        const era = session.eras as any;
        setContext({
          era_label: era.label,
          era_description: era.description,
          start_age: era.start_age,
          end_age: era.end_age,
        });
      }
    };

    loadContext();
  }, [sessionId, bonusTopic]);

  // 2. AUTO-START ou AUTO-CONTINUE
  useEffect(() => {
    if (hasStarted.current || isThinking) return;

    // Cas 1: Pas d'historique du tout → démarrer l'interview
    if (initialMessages.length === 0) {
      hasStarted.current = true;
      triggerAIResponse("START_SESSION_HIDDEN_PROMPT");
      return;
    }

    // Cas 2: Historique existe mais le dernier message est de l'utilisateur → générer une question
    const lastMessage = initialMessages[initialMessages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      hasStarted.current = true;
      console.log("🔄 Dernier message = user, génération d'une nouvelle question...");
      triggerAIResponse(lastMessage.content);
      return;
    }

    // Cas 3: Historique existe et le dernier message est de l'assistant → tout est ok
    hasStarted.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        body: JSON.stringify({
          sessionId,
          userMessage,
          // Si c'est un bonus topic, on passe le system prompt personnalisé
          bonusSystemPrompt: bonusTopic?.systemPrompt
        }),
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
    formData.append('file', blob, 'audio.webm');

    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) {
        setDraftText(prev => prev ? `${prev} ${data.text}` : data.text);
      }
    } catch (e) {
      alert("Erreur de transcription audio");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Régénérer la dernière question
  const handleRegenerateQuestion = async () => {
    if (isThinking || history.length === 0) return;

    // Supprimer la dernière question de l'assistant
    const lastMessage = history[history.length - 1];
    if (lastMessage.role !== 'assistant') return;

    setHistory(prev => prev.slice(0, -1));

    // Supprimer de la DB
    await supabase.from('messages').delete().eq('session_id', sessionId).eq('content', lastMessage.content);

    // Redemander une question sur un autre sujet
    await triggerAIResponse("REGENERATE_QUESTION_SAME_THEME");
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#FDF6E3] text-[#2C3E50] font-sans">

      {/* HEADER FIXE */}
      <header className="bg-white/90 backdrop-blur border-b border-[#2C3E50]/10 px-6 py-4 shadow-sm z-10">
        <div className="flex items-center justify-between mb-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-[#47627D] hover:text-[#E76F51] transition font-bold text-sm">
            <ArrowLeft size={18} />
            <span>Retour au Dashboard</span>
          </Link>
        </div>

        {/* CONTEXTE DE LA SESSION */}
        {bonusTopic ? (
          <div className="bg-gradient-to-r from-[#2A9D8F]/10 to-[#E76F51]/5 rounded-xl p-4 border border-[#2A9D8F]/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-[#2A9D8F]" />
                  <h3 className="font-serif font-bold text-[#2C3E50]">{bonusTopic.title}</h3>
                </div>
                <p className="text-xs text-[#47627D]">Sujet bonus • Interview personnalisée</p>
              </div>
              {/* Bouton Régénérer dans le header */}
              {history.length > 0 && !isThinking && (
                <button
                  onClick={handleRegenerateQuestion}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#47627D] hover:text-[#2A9D8F] hover:bg-[#2A9D8F]/10 rounded-xl transition-colors"
                  title="Générer une autre question"
                >
                  <RefreshCw size={16} />
                  <span className="hidden sm:inline">Autre question</span>
                </button>
              )}
            </div>
          </div>
        ) : context && (
          <div className="bg-gradient-to-r from-[#E76F51]/5 to-[#2A9D8F]/5 rounded-xl p-4 border border-[#E76F51]/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-[#E76F51]" />
                  <h3 className="font-serif font-bold text-[#2C3E50]">{context.era_label}</h3>
                </div>
                <p className="text-xs text-[#47627D]">{context.start_age}-{context.end_age} ans • {context.era_description}</p>
              </div>
              {/* Bouton Régénérer dans le header */}
              {history.length > 0 && !isThinking && (
                <button
                  onClick={handleRegenerateQuestion}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#47627D] hover:text-[#E76F51] hover:bg-[#E76F51]/10 rounded-xl transition-colors"
                  title="Générer une autre question"
                >
                  <RefreshCw size={16} />
                  <span className="hidden sm:inline">Autre question</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ZONE DE CHAT */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-[#FDF6E3]">
        <div className="max-w-5xl mx-auto space-y-8 pb-4">

          {history.length === 0 && isThinking && (
            <div className="text-center p-8">
              <Loader2 size={32} className="animate-spin text-[#E76F51] mx-auto mb-2" />
              <p className="text-[#47627D] text-sm">Le biographe prépare sa première question...</p>
            </div>
          )}

          {history.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-6 rounded-3xl text-lg leading-relaxed shadow-sm max-w-[85%] md:max-w-[75%] ${
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
      <div className="bg-white p-4 md:p-6 border-t border-[#2C3E50]/5 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] z-20">
        <div className="max-w-3xl mx-auto">

          {/* Text Area */}
          <div className="relative mb-3">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={isTranscribing ? "Transcription en cours..." : "Écrivez votre réponse (ou utilisez le micro)..."}
              className={`w-full p-4 pr-12 bg-[#FDF6E3]/50 border border-[#2C3E50]/10 rounded-2xl focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white outline-none resize-none text-[#2C3E50] transition-all ${
                isTranscribing ? 'animate-pulse cursor-wait' : ''
              }`}
              style={{
                minHeight: isTextareaExpanded ? '200px' : '60px',
                maxHeight: isTextareaExpanded ? '400px' : '150px'
              }}
              rows={1}
              disabled={isThinking || isTranscribing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>

          {/* CONTRÔLES EN BAS */}
          <div className="flex items-center justify-between gap-3">
            {/* Toggle agrandissement zone texte */}
            <button
              onClick={() => setIsTextareaExpanded(!isTextareaExpanded)}
              className="p-2.5 text-[#47627D] hover:bg-[#FDF6E3] rounded-xl transition-colors"
              title={isTextareaExpanded ? "Réduire la zone de texte" : "Agrandir la zone de texte"}
            >
              {isTextareaExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>

            {/* Boutons à droite */}
            <div className="flex items-center gap-3">
              {/* Micro */}
              <AudioRecorder onAudioReady={handleAudio} />

              {/* Bouton Envoyer */}
              <button
                onClick={handleSend}
                disabled={!draftText.trim() || isThinking || isTranscribing}
                className="p-3 bg-[#2A9D8F] text-white rounded-xl hover:bg-[#1F7A6F] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
