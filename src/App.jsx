import React, { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import Layout from './components/Layout';
import Login from './views/Login';
import Swal from 'sweetalert2';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Import Views
import DashboardAnggota from './views/DashboardAnggota';
import ProfilSaya from './views/ProfilSaya';
import DataAnggota from './views/DataAnggota';
import StrukturOrganisasi from './views/StrukturOrganisasi';
import AlamatAnggota from './views/AlamatAnggota';
import KeahlianAnggota from './views/KeahlianAnggota';
import InputPembayaran from './views/InputPembayaran';
import RekapPembayaran from './views/RekapPembayaran';
import TagihanPembayaran from './views/TagihanPembayaran';
import WaitingListProfil from './views/WaitingListProfil';
import Pengumuman from './views/Pengumuman';
import Pengaturan from './views/Pengaturan';

// Helper untuk menghasilkan efek suara "Chime/Ting" premium
const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playNote = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine'; // Suara paling murni dan lembut
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(0.08, startTime); // Volume lebih rendah
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(783.99, now, 0.5);  // Nada G5
    playNote(1046.50, now + 0.1, 0.8); // Nada C6
  } catch (e) {
    console.log("Audio tidak didukung atau diblokir oleh browser:", e);
  }
};

export default function App() {
  const { isAuthenticated, darkMode, loadSettings, settings } = useAppStore();
  const [activeView, setActiveView] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Load global system settings from Node.js server upon load
  useEffect(() => {
    loadSettings();
    // Beri tahu Capgo bahwa app sukses dimuat (mencegah rollback)
    CapacitorUpdater.notifyAppReady();
  }, []);

  // Synchronize CSS variable theme setting when state changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [darkMode]);

  // Handle hash changes to allow deep links (e.g. from profile dropdown links)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#profil') {
        setActiveView('profil');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Tampilkan animasi loading database setelah status login menjadi berhasil
  useEffect(() => {
    if (isAuthenticated) {
      const user = useAppStore.getState().currentUser;
      const isProfileIncomplete = !user?.alamat_jalan || !user?.desa || !user?.kecamatan || !user?.kabupaten_kota || !user?.provinsi;
      setActiveView(isProfileIncomplete ? 'profil' : 'dashboard');
      setShowSplash(true);
      setIsFadingOut(false);
      const fadeOutTimer = setTimeout(() => setIsFadingOut(true), 6500); // Mulai fade out 0.5s sebelum menghilang (Total 7s)
      const timer = setTimeout(() => {
        setShowSplash(false);
        playSuccessSound(); // Mainkan suara saat Dashboard muncul
        
        // Pop-up ucapan selamat datang
        const org = useAppStore.getState().settings?.nama_pendek_organisasi || 'IKHWAN 9';
        
        if (isProfileIncomplete) {
          Swal.fire({
            title: 'Selamat Datang!',
            html: `Halo <strong>${user?.nama_lengkap || 'Anggota'}</strong>,<br/>selamat datang di Aplikasi ${org}.<br/><br/><span style="color: #dc3545; font-size: 0.9em; font-weight: 500;">Mohon lengkapi data alamat dan profil Anda terlebih dahulu.</span>`,
            icon: 'info',
            confirmButtonColor: '#1b365d',
            confirmButtonText: 'Lengkapi Profil'
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.hash = 'edit-profil';
            }
          });
        } else {
          Swal.fire({
            title: 'Selamat Datang!',
            html: `Halo <strong>${user?.nama_lengkap || 'Anggota'}</strong>,<br/>selamat datang kembali di Aplikasi ${org}.`,
            icon: 'success',
            confirmButtonColor: '#1b365d',
            confirmButtonText: 'Mulai',
            timer: 3500,
            timerProgressBar: true
          });
        }
      }, 7000); // Fase 1 (2s) + Fase 2 (5s)
      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(timer);
      };
    }
  }, [isAuthenticated]);

  // Handle Maintenance Mode lockout according to settings
  const isMaintenance = settings?.maintenance_mode;
  const userRole = useAppStore.getState().currentUser?.role;

  // Render the correct View component based on activeView state
  const renderView = () => {
    // If maintenance mode is active, prevent non-admin roles from accessing
    if (isMaintenance && userRole !== 'Admin') {
      return (
        <div className="premium-card maintenance-view-lock" style={{ textAlign: 'center', padding: '48px 24px', margin: '40px auto', maxWidth: '600px' }}>
          <h2 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '16px' }}>
            Sistem Dalam Pemeliharaan
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            Mohon maaf atas ketidaknyamanannya, aplikasi saat ini sedang dalam proses pemeliharaan berkala oleh Administrator demi kestabilan sistem database.
          </p>
          <p style={{ color: 'var(--accent-secondary)', fontSize: '0.85rem', fontWeight: 600, marginTop: '20px' }}>
            Silakan kembali beberapa saat lagi. Terima kasih.
          </p>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardAnggota setActiveView={setActiveView} />;
      case 'profil':
        return <ProfilSaya />;
      case 'anggota':
        return <DataAnggota />;
      case 'struktur':
        return <StrukturOrganisasi />;
      case 'alamat':
        return <AlamatAnggota />;
      case 'keahlian':
        return <KeahlianAnggota />;
      case 'input_pembayaran':
        return <InputPembayaran />;
      case 'rekap_pembayaran':
        return <RekapPembayaran />;
      case 'tagihan':
        return <TagihanPembayaran />;
      case 'waiting_list':
        return <WaitingListProfil />;
      case 'pengumuman':
        return <Pengumuman />;
      case 'pengaturan':
        return <Pengaturan />;
      default:
        return <DashboardAnggota setActiveView={setActiveView} />;
    }
  };

  // If not authenticated, force the Login page
  if (!isAuthenticated) {
    return <Login />;
  }

  // Tampilan Splash Screen (Animasi Loading Database)
  if (showSplash) {
    return (
      <div className={`splash-screen ${isFadingOut ? 'fade-out' : ''}`}>
        <div className="splash-phase-1">
          <h1 className="splash-sacred-text">ATAS BERKAT ROCHMAT ALLOH YANG MAHA KUASA</h1>
        </div>
        <div className="splash-content">
          
          <div className="splash-logo-container">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo Organisasi" className="splash-logo" />
            ) : (
              <div className="splash-logo-fallback">
                {settings?.nama_pendek_organisasi ? settings.nama_pendek_organisasi.substring(0, 2).toUpperCase() : 'I9'}
              </div>
            )}
          </div>
          
          <h2 className="splash-title">Memuat Database...</h2>
          
          <div className="splash-progress-bar">
            <div className="splash-progress-fill"></div>
          </div>
          
          <p className="splash-subtitle">
            Sistem sedang menyinkronkan profil Anda, menarik struktur kepengurusan, serta merekapitulasi data keuangan terbaru...
          </p>
        </div>

        <style>{`
          .splash-screen {
            height: 100vh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1b365d 0%, #2a5298 50%, #0f2545 100%);
            flex-direction: column;
            text-align: center;
            padding: 24px;
          }
          .splash-content {
            max-width: 500px;
            display: flex;
            flex-direction: column;
            align-items: center;
            opacity: 0;
          animation: phase2Anim 5s 2s ease-out forwards;
          }
          .splash-phase-1 {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          animation: phase1Anim 2s ease-in-out forwards;
          }
          .splash-sacred-text {
            font-size: 1.15rem;
            font-weight: 800;
            color: var(--accent-secondary);
            letter-spacing: 1px;
            text-align: center;
            line-height: 1.5;
            font-family: var(--font-alt);
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.4), 0 0 45px rgba(255, 215, 0, 0.2);
          }
          .splash-logo-container {
            width: 140px;
            height: 140px;
            margin-bottom: 32px;
          }
          .splash-logo {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .splash-logo-fallback {
            width: 100%;
            height: 100%;
            border-radius: 24px;
            background-color: var(--accent-primary);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            font-weight: bold;
            font-family: var(--font-alt);
          }
          .splash-title {
            font-size: 1.6rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 20px;
            font-family: var(--font-alt);
          }
          .splash-progress-bar {
            width: 100%;
            height: 8px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 32px;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .splash-progress-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
          animation: loadProgress 5s 2s ease-in-out forwards;
          }
          @keyframes loadProgress {
            0% { width: 0%; }
            40% { width: 15%; }
            75% { width: 80%; }
            100% { width: 100%; }
          }
          .splash-subtitle {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.5;
            margin-bottom: 48px;
          }
          @keyframes phase1Anim {
            0% { opacity: 0; transform: scale(0.95); }
            20% { opacity: 1; transform: scale(1); }
            80% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.05); }
          }
          @keyframes phase2Anim {
            0% { opacity: 0; transform: translateY(15px); }
            10% { opacity: 1; transform: translateY(0); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .fade-out {
            animation: fadeOut 0.5s ease-in forwards !important;
          }
          @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
          }

          /* Penyesuaian responsif khusus untuk layar Ponsel */
          @media (max-width: 768px) {
            .splash-content {
              max-width: 320px;
            }
            .splash-logo-container {
              width: 90px;
              height: 90px;
              margin-bottom: 20px;
            }
            .splash-logo-fallback {
              font-size: 2rem;
              border-radius: 16px;
            }
            .splash-title {
              font-size: 5vw;
              margin-bottom: 12px;
            }
            .splash-progress-bar {
              height: 6px;
              margin-bottom: 24px;
            }
            .splash-subtitle {
              font-size: 0.8rem;
              margin-bottom: 32px;
            }
            .splash-phase-1 {
              padding: 0 8px;
            }
            .splash-sacred-text {
              font-size: 12px !important; /* Batas aman minimum browser */
              letter-spacing: -0.5px !important;
              white-space: nowrap !important;
              transform: scale(0.85); /* Paksa perkecil visual menjadi 85% dari ukuran asli */
              transform-origin: center;
            }
          }
        `}</style>
      </div>
    );
  }

  // Render the dynamic view wrapped in the responsive Layout
  return (
    <Layout activeView={activeView} setActiveView={setActiveView}>
      {renderView()}
    </Layout>
  );
}
