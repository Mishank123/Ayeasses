import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import clsx from 'clsx';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSidebarCollapse = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
      </div>
      
      {/* Fixed Sidebar */}
      <div className="fixed top-24 left-0 bottom-0 z-40">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onCollapse={handleSidebarCollapse}
        />
      </div>
      
      {/* Main Content - scrollable area */}
      <div className={clsx(
        "fixed top-24 bottom-0 right-0 overflow-y-auto transition-all duration-300 ease-in-out",
        isCollapsed ? "left-20" : "left-64"
      )}>
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
