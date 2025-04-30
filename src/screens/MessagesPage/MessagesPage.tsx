import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { PaperclipIcon, Send } from "lucide-react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { useState, useRef, KeyboardEvent } from "react";
import { RichTextEditor } from "../../components/RichTextEditor";

export function MessagesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: 'Hello! How can I help you today?',
      sender: 'instructor',
      timestamp: new Date().toISOString(),
      files: [],
    },
    {
      id: 2,
      content: '<div data-youtube-video><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen="true" class="w-full aspect-video"></iframe></div>',
      sender: 'instructor',
      timestamp: new Date().toISOString(),
      files: [],
    }
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Handle file upload here
      console.log('Files selected:', files);
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        {
          id: messages.length + 1,
          content: message,
          sender: 'user',
          timestamp: new Date().toISOString(),
          files: [],
        }
      ]);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <DashboardLayout title="Messages">
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-4 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border'
                }`}
              >
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: msg.content }}
                />
                <div className="text-xs mt-2 opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <Card className="p-4">
          <RichTextEditor
            content={message}
            onChange={setMessage}
          />
          <div className="flex items-center gap-2 mt-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperclipIcon className="h-4 w-4" />
            </Button>
            <Button
              className="ml-auto"
              onClick={handleSendMessage}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}