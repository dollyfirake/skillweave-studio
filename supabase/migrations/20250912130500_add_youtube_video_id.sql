-- Add youtube_video_id column to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_video_id);

-- Comment explaining the purpose of the column
COMMENT ON COLUMN videos.youtube_video_id IS 'Stores the original YouTube video ID for API operations';
