import { X } from 'lucide-react';
import { Button } from './ui/button';
import { AIAssistant } from './AIAssistant';

interface NotesSidebarProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NotesSidebar({ videoId, isOpen, onClose }: NotesSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg z-50 flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-semibold">Learning Notes</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close notes</span>
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <AIAssistant videoId={videoId} />
      </div>
    </div>
  );
}
