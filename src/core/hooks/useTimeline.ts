/**
 * HOOK useTimeline
 * Gère l'état et la logique de la timeline
 */

'use client';

import { useState, useEffect } from 'react';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  location?: string;
  people?: string[];
  createdAt: Date;
}

export function useTimeline(userId?: string) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadEvents();
    }
  }, [userId]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      // TODO: Récupérer les événements depuis Supabase
      // const supabase = createClient();
      // const { data } = await supabase
      //   .from('timeline_events')
      //   .select('*')
      //   .eq('user_id', userId)
      //   .order('date', { ascending: true });
      // setEvents(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    events,
    isLoading,
    reloadEvents: loadEvents,
  };
}
