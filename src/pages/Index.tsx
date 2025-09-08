import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login page on initial load
    navigate("/login");
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-jewel to-jewel-light rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-white">LF</span>
        </div>
        <h1 className="mb-4 text-4xl font-bold text-jewel">LearnFlow</h1>
        <p className="text-xl text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  );
};

export default Index;
