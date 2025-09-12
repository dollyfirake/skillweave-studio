import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AIAssistantProps {
  videoId: string;
  onNotesGenerated?: (notes: string) => void;
}

export function AIAssistant({ videoId, onNotesGenerated }: AIAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateNotes = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to generate AI notes',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-notes', {
        body: { video_id: videoId },
      });

      if (error) throw error;

      const notesText = data.notes?.text || '';
      setNotes(notesText);
      if (onNotesGenerated) {
        onNotesGenerated(notesText);
      }

      toast({
        title: 'Notes generated!',
        description: data.fromCache ? 'Loaded from cache' : 'AI has generated new notes',
      });
    } catch (error) {
      console.error('Error generating notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate notes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load existing notes on mount
  useEffect(() => {
    const loadExistingNotes = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('notes')
          .select('content')
          .eq('user_id', user.id)
          .eq('video_id', videoId)
          .single();

        if (data?.content?.text) {
          setNotes(data.content.text);
          if (onNotesGenerated) {
            onNotesGenerated(data.content.text);
          }
        }
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    };

    loadExistingNotes();
  }, [user, videoId, onNotesGenerated]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">AI Notes</h3>
        <Button
          onClick={generateNotes}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {notes ? 'Regenerate' : 'Generate Notes'}
            </>
          )}
        </Button>
      </div>

      {notes ? (
        <div className="prose prose-sm max-w-none bg-muted/50 p-4 rounded-md">
          <pre className="whitespace-pre-wrap font-sans">{notes}</pre>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          Click "Generate Notes" to create AI-powered notes for this video.
        </div>
      )}
    </div>
  );
}
