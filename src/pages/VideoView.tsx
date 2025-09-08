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
  ChevronRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";

const VideoView = () => {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  // Mock video data
  const mockVideo = {
    id: 1,
    title: "What is React?",
    description: "Learn the fundamentals of React, including what it is, why it's useful, and how it compares to other JavaScript frameworks. This video covers the core concepts you need to understand before diving deeper into React development.",
    creator: "Tech with Tim",
    duration: "15:32",
    youtubeId: "dQw4w9WgXcQ", // Mock YouTube ID
    completed: false,
    moduleTitle: "Getting Started with React",
    courseTitle: "React Development Fundamentals",
    videoIndex: 1,
    totalVideos: 12,
  };

  // Mock course navigation
  const prevVideo = { id: null, title: null };
  const nextVideo = { id: 2, title: "Setting up Your Development Environment" };

  useEffect(() => {
    // Simulate video progress tracking
    const interval = setInterval(() => {
      if (isPlaying && progress < 100) {
        setProgress(prev => Math.min(prev + 1, 100));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, progress]);

  useEffect(() => {
    // Mark as completed when video reaches 90%
    if (progress >= 90 && !isCompleted) {
      setIsCompleted(true);
      toast({
        title: "Video Completed!",
        description: "Great job! You've completed this video.",
      });
    }
  }, [progress, isCompleted, toast]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMarkComplete = () => {
    setIsCompleted(true);
    setProgress(100);
    toast({
      title: "Video Marked Complete",
      description: "Moving to next video...",
    });
    
    // Auto-navigate to next video after 2 seconds
    setTimeout(() => {
      if (nextVideo.id) {
        navigate(`/course/${courseId}/video/${nextVideo.id}`);
      }
    }, 2000);
  };

  const handleSaveNotes = () => {
    // Mock save notes
    toast({
      title: "Notes Saved",
      description: "Your notes have been saved successfully.",
    });
  };

  const handlePrevVideo = () => {
    if (prevVideo.id) {
      navigate(`/course/${courseId}/video/${prevVideo.id}`);
    }
  };

  const handleNextVideo = () => {
    if (nextVideo.id) {
      navigate(`/course/${courseId}/video/${nextVideo.id}`);
    }
  };

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
              {mockVideo.courseTitle}
            </button>
            <span>/</span>
            <span className="text-foreground">{mockVideo.title}</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Video Player and Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Video Player */}
            <Card>
              <div className="aspect-video bg-black rounded-t-lg relative overflow-hidden">
                {/* Mock YouTube Player */}
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4">📺</div>
                    <p className="text-lg mb-4">YouTube Video Player</p>
                    <p className="text-sm text-gray-300">Video ID: {mockVideo.youtubeId}</p>
                  </div>
                  
                  {/* Play/Pause Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Button 
                      size="lg" 
                      variant="ghost" 
                      onClick={handlePlayPause}
                      className="text-white hover:bg-white/20"
                    >
                      {isPlaying ? <Pause className="h-12 w-12" /> : <Play className="h-12 w-12" />}
                    </Button>
                  </div>
                </div>
                
                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={handlePlayPause}
                          className="text-white hover:bg-white/20"
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-white text-sm">
                        {Math.floor(progress * 15.32 / 100)}:32 / {mockVideo.duration}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Video Info */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{mockVideo.moduleTitle}</Badge>
                    {isCompleted && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-jewel mb-2">{mockVideo.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>By {mockVideo.creator}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{mockVideo.duration}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{mockVideo.description}</p>
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
                  disabled={!prevVideo.id}
                  onClick={handlePrevVideo}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Video {mockVideo.videoIndex} of {mockVideo.totalVideos}
                </span>
                
                <Button 
                  variant="outline" 
                  disabled={!nextVideo.id}
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
                    <span className="font-medium">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <div className="text-sm text-muted-foreground">
                    9 of 12 videos completed
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