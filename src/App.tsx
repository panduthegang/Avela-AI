import { useState } from 'react';
import Hero from './components/Hero.tsx';
import ChatPage from './components/ChatPage.tsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'hero' | 'chat'>('hero');
  const [chatQuery, setChatQuery] = useState('');

  const handleStartChat = (query: string) => {
    setChatQuery(query);
    setCurrentPage('chat');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToHero = () => {
    setCurrentPage('hero');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen bg-[#101322] text-white">
      {currentPage === 'hero' ? (
        <Hero onStartChat={handleStartChat} />
      ) : (
        <ChatPage initialQuery={chatQuery} onBack={handleBackToHero} />
      )}
    </div>
  );
}
