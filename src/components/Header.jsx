import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import Swal from 'sweetalert2';
import { 
  Bell, 
  Sun, 
  Moon, 
  User, 
  LogOut,
  Calendar,
  ChevronDown,
  Search
} from 'lucide-react';

export default function Header({ activeView, setActiveView, setIsMobileOpen }) {
  const { currentUser, toggleTheme, darkMode, notifications, markAsRead, logout, settings } = useAppStore();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  const [menuSearch, setMenuSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifPanel(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setShowProfileMenu(false);
    Swal.fire({
      title: 'Konfirmasi Keluar',
      text: 'Apakah Anda yakin ingin keluar dari aplikasi?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1B365D',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
      }
    });
  };

  // Daftar menu untuk fitur pencarian
  const searchableMenus = [
    { id: 'dashboard', label: 'Dashboard Saya' },
    { id: 'profil', label: 'Profil Saya' },
    { id: 'anggota', label: 'Data Anggota' },
    { id: 'struktur', label: 'Daftar Pengurus' },
    { id: 'alamat', label: 'Alamat' },
    { id: 'keahlian', label: 'Keahlian' },
    { id: 'input_pembayaran', label: 'Input Pembayaran' },
    { id: 'rekap_pembayaran', label: 'Rekap Pembayaran' },
    { id: 'tagihan', label: 'Tagihan & Kwitansi' },
    { id: 'waiting_list', label: 'Pengajuan Edit Profil' },
    { id: 'pengumuman', label: 'Pengumuman' },
    { id: 'pengaturan', label: 'Pengaturan' }
  ];

  const filteredMenus = searchableMenus.filter(m => 
    m.label.toLowerCase().includes(menuSearch.toLowerCase())
  );

  const handleSearchSelect = (id) => {
    setActiveView(id);
    setMenuSearch('');
    setShowSearchDropdown(false);
  };

  const handleNotifClick = (id) => {
    markAsRead(id);
  };

  const hasUnread = notifications.some(n => !n.read);

  // Format today's date in Indonesian calendar context
  const getFormattedDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('id-ID', options);
  };

  return (
    <header className="app-header">
      {/* Sacred Top Banner */}
      <div className="top-sacred-banner" style={{ width: '100%' }}>
        ATAS BERKAT ROCHMAT ALLOH YANG MAHA KUASA
      </div>
      <div className="header-main-row">
      {/* Left side: Hamburger (Mobile) & Title */}
      <div className="header-left">
        {settings?.logo_url ? (
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className="header-logo-img"
          />
        ) : (
          <div className="header-logo-fallback">
            {settings?.nama_pendek_organisasi ? settings.nama_pendek_organisasi.substring(0, 2).toUpperCase() : 'I9'}
          </div>
        )}
        <div className="header-search-container" ref={searchRef}>
          <div className="search-input-wrapper">
            <Search size={16} className="header-search-icon" />
            <input
              type="text"
              placeholder="Cari menu cepat..."
              value={menuSearch}
              onChange={(e) => {
                setMenuSearch(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="header-search-input"
            />
          </div>
          {showSearchDropdown && menuSearch.trim() !== '' && (
            <div className="search-dropdown-menu">
              {filteredMenus.length > 0 ? (
                <ul className="search-result-list">
                  {filteredMenus.map(menu => (
                    <li key={menu.id}>
                      <button onClick={() => handleSearchSelect(menu.id)} className="search-result-btn">
                        {menu.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="search-result-empty">Menu tidak ditemukan</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Actions & Profile */}
      <div className="header-actions">
        {/* Notification Bell */}
        <div className="notif-wrapper" ref={notifRef}>
          <button 
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            className={`header-action-btn btn-interactive ${hasUnread ? 'pulse-notif' : ''}`}
            title="Pemberitahuan"
          >
            <Bell size={20} />
          </button>

          {showNotifPanel && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <h3>Pemberitahuan</h3>
                <span className="notif-count">{notifications.length} Baru</span>
              </div>
              <div className="notif-dropdown-body">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <p>Tidak ada pemberitahuan baru.</p>
                  </div>
                ) : (
                  <ul className="notif-list">
                    {notifications.map(notif => (
                      <li 
                        key={notif.id} 
                        onClick={() => handleNotifClick(notif.id)}
                        className="notif-item btn-interactive"
                      >
                        <p className="notif-message">{notif.message}</p>
                        <span className="notif-time">
                          {new Date(notif.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="notif-action-hint">Klik untuk membaca (hilang otomatis)</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="header-divider" />

        {/* Profile Dropdown */}
        <div className="profile-menu-wrapper" ref={profileRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="profile-menu-trigger btn-interactive"
          >
            <div className="profile-mini-avatar">
              {currentUser?.foto_profil ? (
                <img 
                  src={currentUser.foto_profil} 
                  alt="Profil" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                currentUser?.nama_lengkap?.charAt(0).toUpperCase()
              )}
            </div>
            <span className="profile-mini-name">{currentUser?.nama_lengkap?.split(' ')[0]}</span>
            <ChevronDown size={14} className={`chevron-icon ${showProfileMenu ? 'rotated' : ''}`} />
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown-menu">
              <div className="profile-dropdown-header">
                <h4 className="profile-full-name">{currentUser?.nama_lengkap}</h4>
                <p className="profile-email">{currentUser?.no_ktm} / {currentUser?.no_kta}</p>
              </div>
              <ul className="profile-dropdown-list">
                <li>
                  <button 
                    onClick={() => { setShowProfileMenu(false); setActiveView('profil'); }} 
                    className="profile-dropdown-link"
                  >
                    <User size={16} /> Detail Profil
                  </button>
                </li>
                <li>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleTheme(); }} 
                    className="profile-dropdown-link"
                  >
                    {darkMode ? <Sun size={16} className="sun-icon" /> : <Moon size={16} className="moon-icon" />}
                    {darkMode ? 'Mode Terang' : 'Mode Gelap'}
                  </button>
                </li>
                <li className="logout-divider">
                  <button 
                    onClick={handleLogout} 
                    className="profile-dropdown-link logout-link"
                  >
                    <LogOut size={16} /> Keluar
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      </div>

      <style>{`
        .app-header {
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          transition: var(--transition-normal);
          position: sticky;
          top: 0;
          z-index: 700;
        }

        .header-main-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 80px;
          padding: 0 24px;
          gap: 24px;
        }

        .header-logo-img, .header-logo-fallback {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
        }

        .header-logo-img {
          object-fit: contain;
        }

        .header-logo-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--accent-primary);
          color: #FFFFFF;
          border-radius: var(--radius-sm);
          font-weight: 800;
          font-family: var(--font-alt);
          font-size: 1.25rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .header-search-container {
          position: relative;
          display: flex;
          flex-direction: column;
          flex: 1;
          max-width: 800px;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .header-search-icon {
          position: absolute;
          left: 10px;
          width: 14px;
          height: 14px;
          color: var(--text-secondary);
        }

        .header-search-input {
          width: 100%;
          padding: 6px 10px 6px 30px;
          border: 1px solid var(--border-color);
          border-radius: 50px;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.75rem;
          transition: var(--transition-fast);
        }

        .header-search-input:focus {
          outline: none;
          border-color: var(--accent-secondary);
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
        }

        [data-theme="dark"] .header-search-input {
          background-color: var(--bg-secondary);
        }

        .search-dropdown-menu {
          position: absolute;
          top: 40px;
          left: 0;
          width: 100%;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: 0 10px 30px var(--shadow-hover);
          z-index: 1000;
          overflow: hidden;
          animation: dropFadeIn 0.2s ease-out;
        }

        .search-result-list {
          list-style: none;
          margin: 0;
          padding: 4px 0;
          max-height: 300px;
          overflow-y: auto;
        }

        .search-result-btn {
          width: 100%;
          text-align: left;
          padding: 10px 16px;
          background: none;
          border: none;
          font-size: 0.85rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .search-result-btn:hover {
          background-color: var(--bg-tertiary);
          color: var(--accent-primary);
        }

        .search-result-empty {
          padding: 12px 16px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-align: center;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-action-btn {
          background: none;
          border: 1px solid var(--border-color);
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .header-action-btn:hover {
          background-color: var(--bg-tertiary);
          border-color: var(--accent-secondary);
          color: var(--accent-primary);
        }

        [data-theme="dark"] .header-action-btn:hover {
          color: var(--accent-secondary);
        }

        .sun-icon {
          color: var(--accent-secondary);
        }

        .moon-icon {
          color: var(--text-primary);
        }

        .header-divider {
          width: 1px;
          height: 30px;
          background-color: var(--border-color);
          margin: 0 4px;
        }

        .notif-wrapper {
          position: relative;
        }

        .notif-dropdown {
          position: absolute;
          top: 56px;
          right: 0;
          width: 320px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: 0 10px 30px var(--shadow-hover);
          overflow: hidden;
          z-index: 1000;
          animation: dropFadeIn 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        @keyframes dropFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .notif-dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          background-color: rgba(27, 54, 93, 0.02);
        }

        [data-theme="dark"] .notif-dropdown-header {
          background-color: rgba(255, 215, 0, 0.01);
        }

        .notif-dropdown-header h3 {
          font-size: 0.95rem;
          font-family: var(--font-alt);
          font-weight: 600;
        }

        .notif-count {
          font-size: 0.725rem;
          background-color: var(--accent-primary);
          color: #FFFFFF;
          padding: 3px 8px;
          border-radius: 50px;
          font-weight: 600;
        }

        [data-theme="dark"] .notif-count {
          background-color: var(--accent-secondary);
          color: #112240;
        }

        .notif-dropdown-body {
          max-height: 280px;
          overflow-y: auto;
        }

        .notif-empty {
          padding: 32px 20px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .notif-list {
          list-style: none;
        }

        .notif-item {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: var(--transition-fast);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .notif-item:last-child {
          border-bottom: none;
        }

        .notif-item:hover {
          background-color: var(--bg-tertiary);
        }

        .notif-message {
          font-size: 0.825rem;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .notif-time {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .notif-action-hint {
          font-size: 0.65rem;
          color: var(--accent-secondary);
          font-style: italic;
          margin-top: 2px;
          opacity: 0.8;
        }

        .profile-menu-wrapper {
          position: relative;
        }

        .profile-menu-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border: 1px solid var(--border-color);
          background-color: var(--bg-primary);
          border-radius: 50px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .profile-menu-trigger:hover {
          border-color: var(--accent-secondary);
        }

        .profile-mini-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-primary);
          color: #FFFFFF;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          overflow: hidden;
        }

        .profile-mini-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .chevron-icon {
          color: var(--text-secondary);
          transition: var(--transition-fast);
        }

        .chevron-icon.rotated {
          transform: rotate(180deg);
        }

        .profile-dropdown-menu {
          position: absolute;
          top: 48px;
          right: 0;
          width: 240px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: 0 10px 30px var(--shadow-hover);
          overflow: hidden;
          z-index: 1000;
          animation: dropFadeIn 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .profile-dropdown-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          background-color: rgba(128, 0, 0, 0.01);
        }

        .profile-full-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .profile-email {
          font-size: 0.725rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .profile-dropdown-list {
          list-style: none;
          padding: 8px 0;
        }

        .profile-dropdown-link {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 20px;
          background: none;
          border: none;
          text-align: left;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .profile-dropdown-link:hover {
          background-color: var(--bg-tertiary);
          color: var(--accent-primary);
        }

        [data-theme="dark"] .profile-dropdown-link:hover {
          color: var(--accent-secondary);
        }

        .logout-divider {
          border-top: 1px solid var(--border-color);
          margin-top: 8px;
          padding-top: 8px;
        }

        .logout-link {
          color: var(--color-danger);
        }

        .logout-link:hover {
          background-color: rgba(220, 53, 69, 0.08);
          color: var(--color-danger);
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {

          .top-sacred-banner {
            padding: 14px 0;
            font-size: 1.1rem;
          }

          .profile-mini-name, .chevron-icon {
            display: none;
          }

          .profile-menu-trigger {
            padding: 6px;
          }

          .app-header {
            height: auto;
          }
          .header-main-row {
            height: 85px;
            padding: 0 20px;
            gap: 16px;
          }

          .header-logo-img, .header-logo-fallback {
            width: 50px;
            height: 50px;
          }

          .header-logo-fallback {
            font-size: 1.35rem;
          }

          .header-action-btn {
            width: 50px;
            height: 50px;
          }

          .header-action-btn svg {
            width: 24px;
            height: 24px;
          }

          .profile-mini-avatar {
            width: 44px;
            height: 44px;
            font-size: 1.1rem;
          }

          .header-divider {
            height: 34px;
          }
        }

        /* HP/Mobile Specific Scaling (Tablet remains unchanged) */
        @media (max-width: 576px) {
          .top-sacred-banner {
            padding: 8px 0;
            font-size: 0.75rem;
          }

          .app-header {
            height: auto;
          }
          .header-main-row {
            height: 60px;
            padding: 0 16px;
            gap: 12px;
          }

          .header-logo-img, .header-logo-fallback {
            width: 32px;
            height: 32px;
          }

          .header-logo-fallback {
            font-size: 1rem;
          }

          .header-search-input {
            padding: 4px 10px 4px 26px;
            font-size: 0.75rem;
          }
          .header-search-icon {
            left: 8px;
            width: 12px;
            height: 12px;
          }
          .search-dropdown-menu {
            top: 40px;
          }

          .header-action-btn {
            width: 34px !important;
            height: 34px !important;
          }

          .header-action-btn svg {
            width: 16px !important;
            height: 16px !important;
          }

          .profile-mini-avatar {
            width: 28px !important;
            height: 28px !important;
            font-size: 0.75rem;
          }

          .header-divider {
            height: 16px;
          }

          .notif-dropdown {
            width: 270px;
            top: 46px;
            right: -50px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
          }

          .notif-dropdown-header {
            padding: 10px 14px;
          }

          .notif-dropdown-header h3 {
            font-size: 0.8rem;
          }

          .notif-item {
            padding: 12px 14px;
          }

          .notif-message {
            font-size: 0.75rem;
          }

          .notif-time {
            font-size: 0.625rem;
          }

          .notif-action-hint {
            font-size: 0.575rem;
          }
        }
      `}</style>
    </header>
  );
}
