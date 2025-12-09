/**
 * HOOK useConversation
 * Gère l'état et la logique de conversation avec l'Interviewer
 */

'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);

    try {
      // Ajouter le message utilisateur
      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // TODO: Appeler l'API Interviewer
      const response = await fetch('/api/agents/interviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId,
        }),
      });

      const data = await response.json();

      // Ajouter la réponse de l'assistant
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // TODO: Déclencher l'agent Analyst en arrière-plan
      fetch('/api/agents/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: data.conversationId }),
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
    conversationId,
  };
}
