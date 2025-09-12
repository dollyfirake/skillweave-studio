-- Update CORS settings for Edge Functions
update storage.buckets set cors = '[
  {
    "origin": ["http://localhost:8080", "http://localhost:5173", "https://your-production-domain.com"],
    "method": ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    "headers": ["*"],
    "maxAgeSeconds": 3600
  }
]'::jsonb where id = 'functions';

-- Update CORS for the specific function
update storage.buckets set cors = '[
  {
    "origin": ["http://localhost:8080", "http://localhost:5173", "https://your-production-domain.com"],
    "method": ["POST", "OPTIONS"],
    "headers": ["Content-Type", "Authorization", "apikey"],
    "maxAgeSeconds": 3600
  }
]'::jsonb where id = 'generate-notes';
