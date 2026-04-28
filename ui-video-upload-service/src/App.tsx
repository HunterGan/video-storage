import { useState } from 'react';
import { Header } from './widgets/header';
import { Sidebar, type MenuItem } from './widgets/sidebar';
import { VideosPage } from './pages/videos/VideosPage';
import { UploadPage } from './pages/upload/UploadPage';
import { Dashboard } from './widgets/dashboard';

function App() {
  const [activeItem, setActiveItem] = useState<MenuItem>('videos');

  const renderContent = () => {
    switch (activeItem) {
      case 'videos':
        return <VideosPage />;
      case 'upload':
        return <UploadPage />;
      case 'analysis':
      case 'history':
      case 'settings':
      case 'help':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar activeItem={activeItem} onItemSelect={setActiveItem} />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;