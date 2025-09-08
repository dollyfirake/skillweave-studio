import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, BookOpen, Play, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Mock data for courses
  const mockCourses = [
    {
      id: 1,
      title: "React Development Fundamentals",
      description: "Master the basics of React including components, state, and props",
      progress: 75,
      totalVideos: 12,
      completedVideos: 9,
      duration: "4.5 hours",
      thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=200&fit=crop",
    },
    {
      id: 2,
      title: "TypeScript for Beginners",
      description: "Learn TypeScript basics and advanced features for better JavaScript",
      progress: 30,
      totalVideos: 8,
      completedVideos: 2,
      duration: "3.2 hours",
      thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=300&h=200&fit=crop",
    },
    {
      id: 3,
      title: "Node.js Backend Development",
      description: "Build robust backend applications with Node.js and Express",
      progress: 0,
      totalVideos: 15,
      completedVideos: 0,
      duration: "6.8 hours",
      thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&h=200&fit=crop",
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/course/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCourseClick = (courseId: number) => {
    navigate(`/course/${courseId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-jewel mb-4">
            Master New Topics with Curated Learning Paths
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform top YouTube videos into structured courses using the Pareto Principle - 
            get 80% of the knowledge from the top 20% of content.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="What would you like to learn today? (e.g., Python, Digital Marketing, Photography)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 py-6 text-lg"
              />
              <Button 
                type="submit" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-jewel hover:bg-jewel-light"
              >
                Generate Course
              </Button>
            </div>
          </form>
        </div>

        {/* My Learning Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-jewel">My Learning</h2>
            <Button variant="outline">View All</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockCourses.map((course) => (
              <Card 
                key={course.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => handleCourseClick(course.id)}
              >
                <div className="aspect-video bg-gradient-to-br from-jewel-lighter to-jewel-bg rounded-t-lg relative overflow-hidden">
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{course.completedVideos}/{course.totalVideos} videos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Popular Topics */}
        <section>
          <h2 className="text-2xl font-bold text-jewel mb-6">Popular Learning Topics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              "JavaScript",
              "Python",
              "React",
              "Machine Learning",
              "Digital Marketing",
              "Photography",
              "UI/UX Design",
              "Data Science",
              "Node.js",
              "Adobe Photoshop",
              "SEO",
              "Project Management"
            ].map((topic) => (
              <Card 
                key={topic} 
                className="p-4 text-center cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSearchQuery(topic)}
              >
                <h3 className="font-medium text-sm">{topic}</h3>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;