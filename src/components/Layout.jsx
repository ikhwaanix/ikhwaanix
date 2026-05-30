import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Home, Menu, User } from 'lucide-react';

export default function Layout({ activeView, setActiveView, children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area Wrapper */}
      <div className="content-wrapper">
        {/* Header Top Bar */}
        <Header 
          activeView={activeView} 
          setActiveView={setActiveView}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Dynamic Inner Page Content */}
        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Bottom Navigation Bar (Khusus Tablet & Mobile) */}
      <div className="bottom-nav-bar">
        <button
          className="bottom-nav-item"
          onClick={() => setIsMobileOpen(true)}
        >
          <Menu size={20} />
          <span>Menu</span>
        </button>

        <button
          className={`bottom-nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setActiveView('dashboard'); setIsMobileOpen(false); }}
        >
          <Home size={20} />
          <span>Beranda</span>
        </button>

        <button
          className={`bottom-nav-item ${activeView === 'profil' ? 'active' : ''}`}
          onClick={() => { setActiveView('profil'); setIsMobileOpen(false); }}
        >
          <User size={20} />
          <span>Profil</span>
        </button>
      </div>

      <style>{`
        .bottom-nav-bar {
          display: none;
          position: fixed;
          background-color: var(--accent-primary);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          z-index: 1000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          bottom: calc(16px + env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 32px);
          max-width: 400px;
          height: 65px;
          padding: 0 8px;
        }

        [data-theme="dark"] .bottom-nav-bar {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .bottom-nav-item {
          position: relative;
          overflow: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: var(--transition-fast);
          gap: 4px;
        }

        .bottom-nav-item svg {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .bottom-nav-item:first-child {
          border-radius: 16px 0 0 16px;
        }
        
        .bottom-nav-item:last-child {
          border-radius: 0 16px 16px 0;
        }

        .bottom-nav-item::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 120px;
          height: 120px;
          background-color: rgba(255, 255, 255, 0.2);
          opacity: 0;
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(1);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
          pointer-events: none;
        }

        .bottom-nav-item:active::after {
          opacity: 0.15;
          transform: translate(-50%, -50%) scale(0);
          transition: 0s;
        }

        .bottom-nav-item.active {
          color: var(--accent-secondary);
        }

        .bottom-nav-item.active svg {
          color: var(--accent-secondary);
          fill: rgba(212, 175, 55, 0.15);
          transform: translateY(-2px);
          filter: drop-shadow(0 2px 5px rgba(212, 175, 55, 0.5));
        }

        [data-theme="dark"] .bottom-nav-item.active {
          color: var(--accent-secondary);
        }

        [data-theme="dark"] .bottom-nav-item.active svg {
          color: var(--accent-secondary);
          fill: rgba(255, 215, 0, 0.15);
          transform: translateY(-2px);
          filter: drop-shadow(0 2px 5px rgba(255, 215, 0, 0.5));
        }

        [data-theme="dark"] .bottom-nav-item::after {
          background-color: var(--accent-secondary);
        }

        .bottom-nav-item span {
          font-size: 0.65rem;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .bottom-nav-bar {
            display: flex;
          }
          .main-content {
            /* Menambahkan padding bawah agar konten tidak tertutup oleh bottom bar saat discroll mentok bawah */
            padding-bottom: calc(120px + env(safe-area-inset-bottom)) !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        }

        /* GLOBAL OVERRIDE: Mematikan animasi lompat, outline, border, dan shadow pada seluruh kotak menu di semua halaman */
        .premium-card {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .premium-card:hover,
        .premium-card:focus-within {
          transform: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
