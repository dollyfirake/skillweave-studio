import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Clock, BookOpen, CheckCircle, Circle, Users } from "lucide-react";
import Navbar from "@/components/Navbar";

const CourseOverview = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Mock course data
  const mockCourse = {
    id: 1,
    title: "React Development Fundamentals",
    description: "Master the basics of React including components, state, props, and modern React patterns. This course is curated from the top-rated YouTube tutorials to give you 80% of the knowledge in 20% of the time.",
    instructor: "Various Expert Instructors",
    duration: "4.5 hours",
    totalVideos: 12,
    completedVideos: 9,
    progress: 75,
    difficulty: "Beginner",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop",
    modules: [
      {
        id: 1,
        title: "Getting Started with React",
        videos: [
          { id: 1, title: "What is React?", duration: "15:32", completed: true, creator: "Tech with Tim" },
          { id: 2, title: "Setting up Your Development Environment", duration: "12:45", completed: true, creator: "The Net Ninja" },
          { id: 3, title: "Your First React Component", duration: "18:20", completed: true, creator: "Academind" },
        ]
      },
      {
        id: 2,
        title: "Components and JSX",
        videos: [
          { id: 4, title: "Understanding JSX", duration: "22:10", completed: true, creator: "Traversy Media" },
          { id: 5, title: "Props and Component Communication", duration: "25:15", completed: true, creator: "Dev Ed" },
          { id: 6, title: "Working with Events", duration: "16:40", completed: true, creator: "Codevolution" },
        ]
      },
      {
        id: 3,
        title: "State Management",
        videos: [
          { id: 7, title: "useState Hook Deep Dive", duration: "28:30", completed: true, creator: "Ben Awad" },
          { id: 8, title: "useEffect and Side Effects", duration: "32:15", completed: true, creator: "Web Dev Simplified" },
          { id: 9, title: "useContext for Global State", duration: "24:45", completed: true, creator: "The Net Ninja" },
        ]
      },
      {
        id: 4,
        title: "Advanced Patterns",
        videos: [
          { id: 10, title: "Custom Hooks", duration: "19:20", completed: false, creator: "Kent C. Dodds" },
          { id: 11, title: "Performance Optimization", duration: "26:50", completed: false, creator: "Jack Herrington" },
          { id: 12, title: "Testing React Components", duration: "21:30", completed: false, creator: "Testing Library" },
        ]
      }
    ]
  };

  const handleVideoClick = (videoId: number) => {
    navigate(`/course/${courseId}/video/${videoId}`);
  };

  const handleContinueLearning = () => {
    // Find the first uncompleted video
    const firstIncompleteVideo = mockCourse.modules
      .flatMap(module => module.videos)
      .find(video => !video.completed);
    
    if (firstIncompleteVideo) {
      navigate(`/course/${courseId}/video/${firstIncompleteVideo.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Course Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <Badge variant="secondary" className="mb-2">{mockCourse.difficulty}</Badge>
              <h1 className="text-3xl font-bold text-jewel mb-4">{mockCourse.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{mockCourse.description}</p>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{mockCourse.instructor}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{mockCourse.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{mockCourse.totalVideos} videos</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <Card>
              <div className="aspect-video bg-gradient-to-br from-jewel-lighter to-jewel-bg rounded-t-lg relative overflow-hidden">
                <img 
                  src={mockCourse.thumbnail} 
                  alt={mockCourse.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Button 
                    size="lg" 
                    className="bg-white text-jewel hover:bg-white/90"
                    onClick={handleContinueLearning}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Continue Learning
                  </Button>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{mockCourse.progress}%</span>
                    </div>
                    <Progress value={mockCourse.progress} className="h-3" />
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    {mockCourse.completedVideos} of {mockCourse.totalVideos} videos completed
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Content */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-jewel">Course Content</h2>
          
          {mockCourse.modules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                <CardTitle className="text-lg">{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {module.videos.map((video) => (
                    <div 
                      key={video.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => handleVideoClick(video.id)}
                    >
                      <div className="flex items-center gap-3">
                        {video.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <h4 className="font-medium">{video.title}</h4>
                          <p className="text-sm text-muted-foreground">{video.creator}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{video.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CourseOverview;