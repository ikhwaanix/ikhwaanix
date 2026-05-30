import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import Swal from 'sweetalert2';
import { 
  LayoutDashboard, 
  Users, 
  User,
  Network, 
  MapPin, 
  Award, 
  PlusCircle, 
  ClipboardList, 
  FileText, 
  UserCheck, 
  Megaphone, 
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { api } from '../utils/api';

export default function Sidebar({ activeView, setActiveView, isMobileOpen, setIsMobileOpen }) {
  const { currentUser, logout, settings } = useAppStore();
  const [pendingCount, setPendingCount] = useState(0);

  const handleLogout = () => {
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

  const userRole = currentUser?.role || 'Anggota';

  // Fetch pending profile requests count (Admin only)
  useEffect(() => {
    if (userRole === 'Admin') {
      const fetchPendingCount = async () => {
        try {
          const data = await api.get('/pengajuan-profil');
          const count = data.filter(item => item.status_pengajuan === 'PENDING').length;
          setPendingCount(count);
        } catch (e) {
          console.error('Gagal memuat jumlah antrean:', e);
        }
      };
      fetchPendingCount();
    }
  }, [userRole, activeView]); // Refresh when view changes so badge stays updated

  // Role-Based Menu Filtering
  // Ketua = Ketua Umum, Ketua Penunjang, Ketua Misi
  // Admin = Sekretaris (semua fitur)
  // Pembayaran = Bendahara
  // Penarikan = Penarikan
  // Humas = Humas
  // Anggota = anggota biasa
  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard Saya', 
      icon: LayoutDashboard,
      roles: ['Admin', 'Ketua', 'Pembayaran', 'Penarikan', 'Humas', 'Anggota'],
      group: 'Utama'
    },
    { 
      id: 'profil', 
      label: 'Profil Saya', 
      icon: User,
      roles: ['Admin', 'Ketua', 'Pembayaran', 'Penarikan', 'Humas', 'Anggota'],
      group: 'Utama'
    },
    { 
      id: 'anggota', 
      label: 'Data Anggota', 
      icon: Users,
      roles: ['Admin', 'Ketua', 'Pembayaran', 'Humas', 'PJKelompok'],
      group: 'Keanggotaan'
    },
    { 
      id: 'struktur', 
      label: 'Daftar Pengurus', 
      icon: Network,
      roles: ['Admin', 'Ketua', 'Pembayaran', 'Penarikan', 'Humas', 'Anggota'],
      group: 'Keanggotaan'
    },
    { 
      id: 'alamat', 
      label: 'Alamat', 
      icon: MapPin,
      roles: ['Admin', 'Ketua', 'Humas', 'PJKelompok'],
      group: 'Keanggotaan'
    },
    { 
      id: 'keahlian', 
      label: 'Keahlian Anggota', 
      icon: Award,
      roles: ['Admin', 'Ketua', 'PJKelompok'],
      group: 'Keanggotaan'
    },
    { 
      id: 'input_pembayaran', 
      label: 'Input Pembayaran', 
      icon: PlusCircle,
      roles: ['Admin', 'Pembayaran'],
      group: 'Keuangan'
    },
    { 
      id: 'rekap_pembayaran', 
      label: 'Rekap Pembayaran', 
      icon: ClipboardList,
      roles: ['Admin', 'Ketua', 'Pembayaran', 'PJKelompok'],
      group: 'Keuangan'
    },
    { 
      id: 'tagihan', 
      label: 'Tagihan & Kwitansi', 
      icon: FileText,
      roles: ['Admin', 'Ketua', 'Pembayaran', 'Penarikan', 'Humas', 'Anggota', 'PJKelompok'],
      group: 'Keuangan'
    },
    { 
      id: 'waiting_list', 
      label: 'Pengajuan Edit Profil', 
      icon: UserCheck,
      roles: ['Admin'],
      badge: pendingCount,
      group: 'Administrasi'
    },
    { 
      id: 'pengumuman', 
      label: 'Pengumuman', 
      icon: Megaphone,
      roles: ['Admin', 'Ketua', 'Pembayaran', 'Penarikan', 'Humas', 'Anggota'],
      group: 'Administrasi'
    },
    { 
      id: 'pengaturan', 
      label: 'Pengaturan', 
      icon: Settings,
      roles: ['Admin'],
      group: 'Administrasi'
    }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

  // Mengelompokkan menu berdasarkan properti 'group'
  const groupedMenu = filteredMenu.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {});

  const handleMenuClick = (viewId) => {
    setActiveView(viewId);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const orgName = settings?.nama_pendek_organisasi || settings?.nama_organisasi || 'IKHWAN 9';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="mobile-sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Header/Logo section */}
        <div className="sidebar-brand">
          <div className="brand-logo">
            {settings?.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt="Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit', padding: '2px', backgroundColor: '#ffffff' }} 
              />
            ) : (
              <span className="logo-symbol">I9</span>
            )}
          </div>
          <div className="brand-info">
            <h1 className="brand-name">{orgName}</h1>
            <span className="brand-subtitle">Manajemen Organisasi</span>
          </div>
        </div>



        {/* Navigation Menu Links */}
        <nav className="sidebar-nav">
          <ul className="sidebar-menu-list">
            {Object.entries(groupedMenu).map(([groupName, items]) => (
              <React.Fragment key={groupName}>
                <li className="menu-group-header">{groupName}</li>
                {items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <li key={item.id} className="menu-item-wrapper">
                      <button
                        onClick={() => handleMenuClick(item.id)}
                        className={`menu-link btn-interactive ${isActive ? 'active' : ''} `}
                      >
                        <span className="menu-icon"><Icon size={20} /></span>
                        <span className="menu-label">{item.label}</span>
                        {item.badge > 0 && (
                          <span className="menu-badge">{item.badge}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </React.Fragment>
            ))}
          </ul>
        </nav>

        {/* User Profile & Logout Group Container */}
        <div className="sidebar-user-footer-container">
          <div className="sidebar-user-footer-card">
            <div className="user-profile-group">
              <div className="user-avatar-wrapper">
                <div className="user-avatar">
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
                <span className="user-status-indicator"></span>
              </div>
              <div className="user-details">
                <h3 className="user-name">{currentUser?.nama_lengkap}</h3>
                <span className="user-role-badge">{currentUser?.nama_jabatan}</span>
              </div>
            </div>
            
            <button onClick={handleLogout} className="sidebar-logout-btn-grouped btn-interactive">
              <LogOut size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      <style>{`
        .mobile-sidebar-backdrop {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(10, 25, 47, 0.4);
          z-index: 800;
          backdrop-filter: blur(2px);
        }

        .app-sidebar {
          width: 280px;
          background-color: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 900;
          transition: var(--transition-normal);
          flex-shrink: 0;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .brand-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--accent-primary);
          color: #FFFFFF;
          font-weight: 700;
          font-family: var(--font-alt);
          font-size: 1.25rem;
          box-shadow: 0 4px 10px rgba(27, 54, 93, 0.2);
        }

        [data-theme="dark"] .brand-logo {
          box-shadow: 0 4px 10px rgba(165, 42, 42, 0.35);
        }

        .brand-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .brand-name {
          font-family: var(--font-alt);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--accent-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        [data-theme="dark"] .brand-name {
          color: var(--accent-secondary);
        }

        .brand-subtitle {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sidebar-user-footer-card {
          padding: 16px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, rgba(27, 54, 93, 0.04) 0%, rgba(27, 54, 93, 0.01) 100%);
          border: 1px solid rgba(27, 54, 93, 0.08);
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all var(--transition-normal) ease;
        }

        [data-theme="dark"] .sidebar-user-footer-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 20px -3px rgba(0, 0, 0, 0.2);
        }

        .sidebar-user-footer-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.06);
          border-color: rgba(27, 54, 93, 0.15);
        }

        [data-theme="dark"] .sidebar-user-footer-card:hover {
          border-color: rgba(255, 215, 0, 0.15);
          box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.3);
        }

        .user-profile-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar-wrapper {
          position: relative;
          display: inline-block;
          flex-shrink: 0;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--accent-primary);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-alt);
          font-weight: 600;
          font-size: 1.1rem;
          border: 2px solid var(--bg-secondary);
          box-shadow: 0 0 0 2px rgba(27, 54, 93, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        [data-theme="dark"] .user-avatar {
          box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.15);
        }

        .sidebar-user-footer-card:hover .user-avatar {
          transform: scale(1.03);
        }

        .user-status-indicator {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #10B981;
          border: 2px solid var(--bg-secondary);
          box-shadow: 0 0 6px #10B981;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .user-name {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.2px;
        }

        .user-role-badge {
          font-size: 0.72rem;
          color: var(--text-secondary);
          font-weight: 500;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
        }

        .sidebar-menu-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menu-group-header {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 8px 16px 4px 16px;
        }

        .menu-group-header:first-child {
          padding-top: 4px;
        }

        .menu-link {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: none;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          cursor: pointer;
          font-weight: 500;
          font-size: 0.9rem;
          text-align: left;
        }

        .menu-badge {
          background-color: var(--color-danger, #dc3545);
          color: #FFFFFF;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 50px;
          margin-left: auto;
        }

        .menu-link:hover {
          background-color: var(--bg-tertiary);
          color: var(--accent-primary);
        }

        [data-theme="dark"] .menu-link:hover {
          color: var(--accent-secondary);
        }

        .menu-link.active {
          background-color: rgba(27, 54, 93, 0.08);
          color: var(--accent-primary);
          font-weight: 600;
          border-left: 4px solid var(--accent-secondary);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }

        [data-theme="dark"] .menu-link.active {
          background-color: rgba(255, 215, 0, 0.05);
          color: var(--accent-secondary);
          border-left-color: var(--accent-secondary);
        }

        .menu-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-user-footer-container {
          padding: 12px;
          border-top: 1px solid var(--border-color);
        }

        .sidebar-logout-btn-grouped {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          border: 1px solid rgba(220, 53, 69, 0.2);
          background: rgba(220, 53, 69, 0.04);
          border-radius: var(--radius-sm);
          color: #DC3545;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.82rem;
          transition: all 0.2s ease;
        }

        .sidebar-logout-btn-grouped:hover {
          background: #DC3545;
          color: #FFFFFF;
          border-color: #DC3545;
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.15);
        }

        /* Responsive behavior tablet & mobile (drawer) */
        @media (max-width: 1024px) {
          .mobile-sidebar-backdrop {
            display: block;
            z-index: 1150;
          }

          .app-sidebar {
            position: fixed;
            top: 0;
            left: -280px;
            height: 100vh;
            width: 280px;
            z-index: 1200;
          }

          .app-sidebar.mobile-open {
            left: 0;
            box-shadow: 10px 0 30px rgba(0, 0, 0, 0.25);
          }
        }
      `}</style>
    </>
  );
}
