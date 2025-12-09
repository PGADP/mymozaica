'use client'

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

export function ChatInterface({ sessionId, initialMessages = [] }: { sessionId: string, initialMessages?: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Appel API vers l'agent Interviewer
      const response = await fetch('/api/agents/interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          message: userMsg.content,
          history: messages // On envoie l'historique pour le contexte
        }),
      });

      if (!response.ok) throw new Error('Erreur API');

      const data = await response.json();
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue lors de la réponse de l'IA.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-3xl mx-auto">
      
      {/* ZONE DE MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-[#47627D]/50 mt-10 italic">
            L'IA prépare sa première question... (ou attendez qu'elle vous parle)
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-5 rounded-2xl text-lg leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-[#E76F51] text-white rounded-br-none' 
                  : 'bg-white text-[#2C3E50] border border-[#FDF6E3] rounded-bl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        
        {/* Indicateur de frappe */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-[#FDF6E3] flex gap-2 items-center">
              <span className="w-2 h-2 bg-[#47627D]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
              <span className="w-2 h-2 bg-[#47627D]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
              <span className="w-2 h-2 bg-[#47627D]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ZONE DE SAISIE */}
      <div className="p-4 bg-[#FDF6E3] sticky bottom-0">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Racontez votre souvenir..."
            className="w-full p-4 pr-14 rounded-2xl border-2 border-white bg-white focus:border-[#2A9D8F] focus:ring-0 outline-none shadow-lg text-[#2C3E50] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="absolute right-3 bottom-3 p-2 bg-[#2A9D8F] text-white rounded-xl hover:bg-[#1F7A6F] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}