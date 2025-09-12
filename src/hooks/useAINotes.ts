import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useAINotes(videoId: string) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    if (!user) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .single();

      if (fetchError) throw fetchError;
      if (data?.content) {
        // Handle both string and { text: string } formats
        const notesContent = typeof data.content === 'string' 
          ? data.content 
          : data.content.text || '';
        setNotes(notesContent);
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Failed to load notes');
    }
  };

  const generateNotes = async () => {
    if (!user) {
      setError('Please sign in to generate notes');
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: generateError } = await supabase.functions.invoke(
        'generate-notes',
        {
          body: { video_id: videoId },
        }
      );

      if (generateError) throw generateError;
      
      // Handle both string and { text: string } formats
      const notesContent = typeof data.notes === 'string' 
        ? data.notes 
        : data.notes?.text || '';
      
      setNotes(notesContent);
      return notesContent;
    } catch (err) {
      console.error('Error generating notes:', err);
      setError('Failed to generate notes. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [user, videoId]);

  return {
    notes,
    isLoading,
    error,
    generateNotes,
    refreshNotes: loadNotes,
  };
}
