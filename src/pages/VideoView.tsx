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
  Loader2
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const VideoView = () => {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [video, setVideo] = useState<{
    id: string;
    title: string;
    youtube_video_id: string;
    creator_name: string;
    order_index: number;
  } | null>(null);
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
    if (videoId && courseId && user) {
      fetchVideoData();
    }
  }, [videoId, courseId, user]);

  const fetchVideoData = async () => {
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
        .single();

      if (notesData) {
        setNotes(notesData.content);
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

  const handleSaveNotes = async () => {
    try {
      const { error } = await supabase
        .from('notes')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          content: notes
        });

      if (error) throw error;

      toast({
        title: "Notes Saved",
        description: "Your notes have been saved successfully.",
      });
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
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
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSaveNotes}
                    className="w-full bg-jewel hover:bg-jewel-light"
                  >
                    Save Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoView;