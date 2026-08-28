import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  return (
    <div className="min-h-screen flex bg-[#030309] text-[#CED1D5]">
      {/* Sidebar Navigation */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />

        <main className="flex-1 px-3.5 sm:px-5 lg:px-6 py-2 sm:py-3 w-full max-w-[1850px] mx-auto animate-fadeIn">
          <Outlet />
        </main>

        <footer className="py-4 border-t border-[#232C38] text-center text-xs text-[#58707A] bg-[#0E121B]/60">
          <p>© 2026 Faith Automation & Engineering — Faith Automation IT Inventory</p>
        </footer>
      </div>
    </div>
  );
};
