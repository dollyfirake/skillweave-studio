import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StickyNote, BookOpen, Play, Trash2, Save, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Notes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      
      const { data: notesData, error } = await supabase
        .from('notes')
        .select(`
          *,
          videos (
            title,
            creator_name,
            modules (
              title,
              courses (
                topic_name
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(notesData || []);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = (noteId: string, content: string) => {
    setEditingNote(noteId);
    setEditContent(content);
  };

  const handleSaveNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ content: editContent })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.map(note => 
        note.id === noteId ? { ...note, content: editContent } : note
      ));
      setEditingNote(null);
      setEditContent("");
      
      toast({
        title: "Note Updated",
        description: "Your note has been saved successfully.",
      });
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.filter(note => note.id !== noteId));
      
      toast({
        title: "Note Deleted",
        description: "Your note has been deleted.",
      });
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const handleGoToVideo = (videoId: string) => {
    const note = notes.find(n => n.video_id === videoId);
    if (note?.videos?.modules?.courses) {
      navigate(`/course/${note.videos.modules.courses[0]?.id}/video/${videoId}`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-6 w-6 text-jewel" />
            <h1 className="text-3xl font-bold text-jewel">My Notes</h1>
          </div>
          <p className="text-muted-foreground">
            All your saved notes from video lessons
          </p>
        </div>

        {notes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Notes Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start taking notes while watching videos to see them here.
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">
                          {note.videos?.modules?.courses?.[0]?.topic_name || 'Course'}
                        </Badge>
                        <Badge variant="outline">
                          {note.videos?.modules?.title || 'Module'}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{note.videos?.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        By {note.videos?.creator_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGoToVideo(note.video_id)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Watch Video
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingNote === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={6}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveNote(note.id)}
                          className="bg-jewel hover:bg-jewel-light"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingNote(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="whitespace-pre-wrap text-sm mb-3 bg-accent/50 p-3 rounded-lg">
                        {note.content || "No content"}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditNote(note.id, note.content)}
                      >
                        Edit Note
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notes;