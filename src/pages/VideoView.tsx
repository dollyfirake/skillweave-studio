import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  CheckCircle, 
  Clock, 
  BookOpen,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotesSidebar } from "@/components/NotesSidebar";
import { AIAssistant } from "@/components/AIAssistant";

const VideoView = () => {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [showNotesSidebar, setShowNotesSidebar] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  interface Video {
    id: string;
    title: string;
    youtube_video_id: string;
    duration: number;
    description?: string;
    module_id: string;
    order_index: number;
    created_at: string;
    updated_at: string;
    creator_name: string;
    modules: {
      id: string;
      title: string;
      courses: {
        id: string;
        title: string;
      };
    };
  }

  interface Note {
    id?: string;
    user_id: string;
    video_id: string;
    content: string | { text: string };
    created_at?: string;
    updated_at?: string;
  }

  interface VideoWithDescription extends Video {
    description?: string;
  }

  const [video, setVideo] = useState<VideoWithDescription | null>(null);
  const [course, setCourse] = useState<{
    id: string;
    topic_name: string;
    description: string;
  } | null>(null);
  const [module, setModule] = useState<{
    id: string;
    title: string;
    description: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [allVideos, setAllVideos] = useState<Array<{
    id: string;
    title: string;
    youtube_video_id: string;
    creator_name: string;
    order_index: number;
  }>>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    console.log('useEffect triggered with:', { videoId, courseId, user });
    if (videoId && courseId && user) {
      // Reset completion state when video changes
      setIsCompleted(false);
      setProgress(0);
      fetchVideoData().catch(error => {
        console.error('Error in fetchVideoData:', error);
        toast({
          title: "Error",
          description: "Failed to load video data. Please try again.",
          variant: "destructive",
        });
      });
    }
  }, [videoId, courseId, user?.id]); // Only depend on user.id instead of the whole user object

  type SupabaseQueryResult<T> = {
    data: T | null;
    error: any;
  };

  const fetchWithRetry = async <T,>(
    queryFn: () => Promise<SupabaseQueryResult<T>>,
    retries = 3,
    delay = 1000
  ): Promise<{ data: T | null; error: any }> => {
    try {
      const result = await queryFn();
      if (result.error) throw result.error;
      return result;
    } catch (error) {
      if (retries === 0) return { data: null, error };
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(queryFn, retries - 1, delay * 2);
    }
  };

  const fetchVideoData = async () => {
    console.log('fetchVideoData called with:', { videoId, courseId });
    try {
      setLoading(true);

      // Fetch video details with module and course info
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select(`
          *,
          modules (
            *,
            courses (*)
          )
        `)
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      if (!videoData) throw new Error('Video not found');
      
      setVideo(videoData);
      setModule(videoData.modules);
      setCourse(videoData.modules.courses);

      // Fetch all videos in the course for navigation
      const { data: allModules, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          videos (*)
        `)
        .eq('course_id', courseId)
        .order('order_index');

      if (modulesError) throw modulesError;

      const videos = allModules.flatMap(m => 
        m.videos.map(v => ({ ...v, moduleTitle: m.title }))
      ).sort((a, b) => a.order_index - b.order_index);
      
      setAllVideos(videos);
      setCurrentVideoIndex(videos.findIndex(v => v.id === videoId));

      // Fetch user progress for this video
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .single();

      if (progressData) {
        setIsCompleted(progressData.completed);
      }

      // Fetch user notes for this video
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      console.log('Fetched notes data:', notesData);

      if (notesData?.content) {
        try {
          // Handle both string and JSONB content
          if (typeof notesData.content === 'object' && notesData.content !== null) {
            // If content is an object (JSONB), extract the text
            const contentObj = notesData.content as { text?: string };
            setNotes(contentObj.text || '');
          } else if (typeof notesData.content === 'string') {
            // If content is a string, try to parse it as JSON
            try {
              const parsedContent = JSON.parse(notesData.content) as { text?: string } | string;
              if (typeof parsedContent === 'object' && parsedContent !== null && 'text' in parsedContent) {
                setNotes(parsedContent.text || '');
              } else {
                setNotes(notesData.content);
              }
            } catch (e) {
              // If not valid JSON, use as is
              setNotes(notesData.content);
            }
          } else {
            console.warn('Unexpected notes content format:', notesData.content);
            setNotes('');
          }
        } catch (error) {
          console.error('Error parsing notes content:', error);
          setNotes('');
        }
      } else {
        setNotes(''); // Initialize with empty string if no notes exist
      }

    } catch (error: unknown) {
      console.error('Error fetching video data:', error);
      toast({
        title: "Error",
        description: "Failed to load video data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async (): Promise<boolean> => {
    if (!user || !videoId || !notes.trim()) {
      console.log('Missing required fields for saving notes');
      return false;
    }
    
    try {
      // Ensure content is properly formatted as a JSONB object
      let noteText = notes.trim();
      // Add Manual Notes header if not already present
      if (!noteText.startsWith('# Manual Notes')) {
        noteText = `# Manual Notes\n\n${noteText}`;
      }
      
      const noteContent = { text: noteText };
      
      const noteData = {
        user_id: user.id,
        video_id: videoId,
        content: noteContent,
        updated_at: new Date().toISOString()
      };
      
      console.log('Saving notes:', noteData);
      
      // First, check if a note already exists for this user and video
      const { data: existingNote, error: fetchError } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      let error;
      
      if (existingNote) {
        // Update existing note
        const { error: updateError } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', existingNote.id);
        error = updateError;
      } else {
        // Insert new note
        const { error: insertError } = await supabase
          .from('notes')
          .insert(noteData);
        error = insertError;
      }
      
      if (error) throw error;
      
      console.log('Notes saved successfully');
      toast({
        title: 'Notes Saved',
        description: 'Your notes have been saved successfully.',
      });
      return true;
      
      console.log('Save response:', { data, error });
      
      if (error) throw error;
      
      toast({
        title: "Notes Saved",
        description: "Your notes have been saved successfully.",
      });
      return true;
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: `Failed to save notes: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleMarkComplete = async () => {
    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          completed: true,
          completion_date: new Date().toISOString()
        });

      if (error) throw error;

      setIsCompleted(true);
      setProgress(100);
      toast({
        title: "Video Completed!",
        description: "Great job! Moving to next video...",
      });
      
      // Auto-navigate to next video after 2 seconds
      setTimeout(() => {
        const nextVideoIndex = currentVideoIndex + 1;
        if (nextVideoIndex < allVideos.length) {
          const nextVideo = allVideos[nextVideoIndex];
          navigate(`/course/${courseId}/video/${nextVideo.id}`);
        }
      }, 2000);
    } catch (error: any) {
      console.error('Error marking video complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark video as complete",
        variant: "destructive",
      });
    }
  };

  const handleGenerateNotes = async () => {
    if (!user || !videoId) {
      toast({
        title: "Error",
        description: "User not authenticated or video not found",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      setIsGeneratingNotes(true);
      
      // First, get the video details to include in the request
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      if (!videoData) throw new Error('Video not found');

      // Ensure we have a YouTube video ID
      if (!videoData.youtube_video_id) {
        throw new Error('YouTube video ID is missing for this video');
      }
      
      // Set video description to empty string if not available
      const videoDescription = videoData.description || '';

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      console.log('Generating notes with data:', {
        youtubeVideoId: videoData.youtube_video_id,
        title: videoData.title,
        hasDescription: !!videoDescription
      });

      const response = await fetch('https://nwrkxjbjxtctydwxxukj.supabase.co/functions/v1/generate-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          video_id: videoData.youtube_video_id,  // Use the YouTube video ID
          video_title: videoData.title,
          video_description: videoDescription
        })
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || errorData.message || 'Failed to generate notes');
      }

      const result = JSON.parse(responseText);
      const generatedNotes = result.notes || result;
      
      if (generatedNotes) {
        // Add AI Notes header to the generated notes
        const aiNotesWithHeader = generatedNotes.startsWith('# AI Notes') 
          ? generatedNotes 
          : `# AI Notes\n\n${generatedNotes}`;
          
        // Format the notes with a divider if there are existing notes
        const formattedNotes = notes 
          ? `${notes}\n\n---\n\n${aiNotesWithHeader}`
          : aiNotesWithHeader;
          
        // Update the UI immediately
        setNotes(formattedNotes);
        
        // Save the notes to the database
        const saveData = {
          user_id: user.id,
          video_id: videoId,
          content: { text: formattedNotes },
          updated_at: new Date().toISOString()
        };
        
        console.log('Saving AI generated notes:', saveData);
        
        // First, check if a note already exists for this user and video
        const { data: existingNote, error: fetchError } = await supabase
          .from('notes')
          .select('id')
          .eq('user_id', user.id)
          .eq('video_id', videoId)
          .maybeSingle();
        
        if (fetchError) throw fetchError;
        
        let saveError;
        
        if (existingNote) {
          // Update existing note
          const { error: updateError } = await supabase
            .from('notes')
            .update(saveData)
            .eq('id', existingNote.id);
          saveError = updateError;
        } else {
          // Insert new note
          const { error: insertError } = await supabase
            .from('notes')
            .insert(saveData);
          saveError = insertError;
        }
        
        if (saveError) {
          console.error('Error saving AI notes:', saveError);
          throw saveError;
        }
        
        console.log('AI notes saved successfully');
        
        toast({
          title: "Notes Generated",
          description: "AI has generated and saved notes for this video.",
        });
        
        return true;
      }
    } catch (error: any) {
      console.error('Error generating notes:', error);
      let errorMessage = "Failed to generate notes. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (error.toString) {
        errorMessage = error.toString();
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const handlePrevVideo = () => {
    const prevVideoIndex = currentVideoIndex - 1;
    if (prevVideoIndex >= 0) {
      const prevVideo = allVideos[prevVideoIndex];
      navigate(`/course/${courseId}/video/${prevVideo.id}`);
    }
  };

  const handleNextVideo = () => {
    const nextVideoIndex = currentVideoIndex + 1;
    if (nextVideoIndex < allVideos.length) {
      const nextVideo = allVideos[nextVideoIndex];
      navigate(`/course/${courseId}/video/${nextVideo.id}`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!video || !course) {
    console.error('Video or course not found:', { video, course });
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-jewel mb-4">Video Not Found</h1>
            <Button onClick={() => navigate(`/course/${courseId}`)}>Back to Course</Button>
          </div>
        </div>
      </div>
    );
  }

  const prevVideo = currentVideoIndex > 0 ? allVideos[currentVideoIndex - 1] : null;
  const nextVideo = currentVideoIndex < allVideos.length - 1 ? allVideos[currentVideoIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative flex">
        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${showNotesSidebar ? 'mr-96' : ''}`}>
          <main className="container mx-auto px-4 py-6">
            {/* Breadcrumb */}
            <div className="mb-6">
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <button 
                  onClick={() => navigate("/dashboard")}
                  className="hover:text-jewel transition-colors"
                >
                  My Learning
                </button>
                <span>/</span>
                <button 
                  onClick={() => navigate(`/course/${courseId}`)}
                  className="hover:text-jewel transition-colors"
                >
                  {course.topic_name}
                </button>
                <span>/</span>
                <span className="text-foreground">{video.title}</span>
              </nav>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Video Player and Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* YouTube Video Player */}
                <Card>
                  <div className="aspect-video bg-black rounded-t-lg relative overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=0&rel=0&modestbranding=1`}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </Card>

                {/* Video Info */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{module.title}</Badge>
                        {isCompleted && (
                          <Badge variant="secondary" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <h1 className="text-2xl font-bold text-jewel mb-2">{video.title}</h1>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span>By {video.creator_name}</span>
                      </div>
                      <p className="text-muted-foreground">
                        Learn about {course.topic_name} through this carefully curated video content.
                      </p>
                    </div>
                    
                    {!isCompleted && (
                      <Button onClick={handleMarkComplete} className="bg-jewel hover:bg-jewel-light">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                  
                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button 
                      variant="outline" 
                      disabled={!prevVideo}
                      onClick={handlePrevVideo}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      Video {currentVideoIndex + 1} of {allVideos.length}
                    </span>
                    
                    <Button 
                      variant="outline" 
                      disabled={!nextVideo}
                      onClick={handleNextVideo}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Progress Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Course Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Overall Progress</span>
                        <span className="font-medium">{Math.round(((currentVideoIndex + (isCompleted ? 1 : 0)) / allVideos.length) * 100)}%</span>
                      </div>
                      <Progress value={Math.round(((currentVideoIndex + (isCompleted ? 1 : 0)) / allVideos.length) * 100)} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        {currentVideoIndex + (isCompleted ? 1 : 0)} of {allVideos.length} videos completed
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate(`/course/${courseId}`)}
                      >
                        View All Videos
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <StickyNote className="h-5 w-5" />
                      My Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Take notes while you learn..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={6}
                        className="min-h-[150px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleSaveNotes}
                          className="flex-1 bg-jewel hover:bg-jewel-light"
                        >
                          Save Notes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleGenerateNotes}
                          disabled={isGeneratingNotes}
                          className="flex items-center gap-1"
                        >
                          {isGeneratingNotes ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          AI
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default VideoView;