import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  User, 
  Users,
  KeyRound, 
  AlertTriangle, 
  LayoutDashboard, 
  MapPin, 
  Award, 
  PlusCircle,
  ClipboardList, 
  FileText, 
  Megaphone,
  UserCheck,
  Network,
  Settings,
  X
} from 'lucide-react';
import { api } from '../utils/api';

export default function DashboardAnggota({ setActiveView }) {
  const { currentUser, settings, addNotification } = useAppStore();
  const [allBills, setAllBills] = useState([]);
  const [totalTunggakanSemuaTahun, setTotalTunggakanSemuaTahun] = useState(0);
  const [daftarTahunBuku, setDaftarTahunBuku] = useState([]);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  
  const hijriMonths = [
    'Muharrom', 'Shofar', 'Robi\'ul Awwal', 'Robi\'ul Akhir',
    'Jumadal Ula', 'Jumadal Akhir', 'Rojab', 'Sya\'ban',
    'Romadhon', 'Syawwal', 'Dzulqo\'dah', 'Dzulhijjah'
  ];

  useEffect(() => {
    if (currentUser) {
      loadPersonalBill();
    }
  }, [currentUser]);

  const loadPersonalBill = async () => {
    try {
      // Get all unique years from master payments
      const masters = await api.get('/pembayaran/master');
      const uniqueYears = [...new Set(masters.map(m => m.tahun_hijriyyah).filter(Boolean))].sort();
      if (uniqueYears.length === 0) uniqueYears.push('1447');
      
      // Fetch bill details for each unique year in parallel
      const bills = await Promise.all(
        uniqueYears.map(year => 
          api.get(`/pembayaran/tagihan/${currentUser.id_anggota}`, { tahun_hijriyyah: year })
        )
      );

      // Sum all grand totals
      const sumTunggakan = bills.reduce((sum, b) => sum + b.grand_total_tunggakan, 0);
      setTotalTunggakanSemuaTahun(sumTunggakan);
      setDaftarTahunBuku(uniqueYears);
      setAllBills(bills);
    } catch (e) {
      console.error('Gagal memuat tagihan pribadi:', e);
    }
  };

  // Quick access menu items — mirrors sidebar exactly (excluding Dashboard)
  const quickAccessItems = [
    { id: 'anggota', label: 'Data Anggota', icon: Users, roles: ['Admin', 'Pembayaran', 'Penarikan', 'Ketua'] },
    { id: 'struktur', label: 'Daftar Pengurus', icon: Network, roles: ['Admin', 'Pembayaran', 'Penarikan', 'Ketua'] },
    { id: 'alamat', label: 'Alamat', icon: MapPin, roles: ['Admin', 'Pembayaran', 'Penarikan', 'Ketua'] },
    { id: 'keahlian', label: 'Keahlian Anggota', icon: Award, roles: ['Admin', 'Pembayaran', 'Penarikan', 'Ketua'] },
    { id: 'input_pembayaran', label: 'Input Pembayaran', icon: PlusCircle, roles: ['Admin', 'Pembayaran'] },
    { id: 'rekap_pembayaran', label: 'Rekap Pembayaran', icon: ClipboardList, roles: ['Admin', 'Pembayaran', 'Penarikan', 'Ketua'] },
    { id: 'tagihan', label: 'Tagihan & Kwitansi', icon: FileText, roles: ['Admin', 'Pembayaran', 'Penarikan', 'Ketua'] },
    { id: 'waiting_list', label: 'Pengajuan Edit Profil', icon: UserCheck, roles: ['Admin'] },
    { id: 'pengumuman', label: 'Pengumuman', icon: Megaphone, roles: ['Admin', 'Pembayaran', 'Penarikan', 'Ketua'] },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings, roles: ['Admin'] },
  ];

  const userRole = currentUser?.role || 'Anggota';
  const availableNavs = quickAccessItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="dashboard-view">
      <div className="dashboard-top-section">
        {/* Profile overview status */}
        <div className="premium-card summary-card profile-card">
          <div 
            className="summary-card-icon-container primary"
            onClick={() => currentUser?.foto_profil && setShowPhotoPreview(true)}
            style={{ cursor: currentUser?.foto_profil ? 'pointer' : 'default', border: currentUser?.foto_profil ? '2px solid var(--accent-secondary)' : 'none' }}
          >
            {currentUser?.foto_profil ? (
              <img 
                src={currentUser.foto_profil} 
                alt="Profil Anggota" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} 
              />
            ) : (
              <User size={48} />
            )}
          </div>
          <div className="profile-text-container">
            <h4 className="summary-card-label">Identitas Keanggotaan</h4>
            <h3 className="summary-card-value-small">{currentUser?.nama_lengkap || 'Nama Anggota'}</h3>
            <p className="summary-card-sub">
              KTM: {currentUser?.no_ktm} | KTA: {currentUser?.no_kta}
            </p>
            <button 
              onClick={() => setActiveView('profil')} 
              className="btn-primary btn-interactive" 
              style={{ marginTop: '12px', fontSize: '0.75rem', padding: '6px 12px' }}
            >
              Lihat Profil & Ganti Sandi
            </button>
          </div>
        </div>

        {/* Outstanding bill summary */}
        <div className="premium-card summary-card outstanding-bill-card">
          <div className="summary-card-icon-container warning">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h4 className="summary-card-label">Total Seluruh Tunggakan</h4>
            <h2 className="summary-card-value danger">
              Rp {totalTunggakanSemuaTahun.toLocaleString('id-ID')}
            </h2>
            <p className="summary-card-sub" style={{ fontStyle: 'italic' }}>
              Terhitung sampai bulan {hijriMonths[(Number(settings?.bulan_aktif_mulazamah) || 7) - 1]} {settings?.tahun_aktif_mulazamah || '1447'} H
            </p>
          </div>
        </div>

        {/* 2. Quick Access Menu (Grab-Style Grid) */}
        {availableNavs.length > 0 && (
          <div className="premium-card grab-menu-card quick-access-card" style={{ padding: '20px 16px' }}>
            <div className="grab-menu-grid">
              {availableNavs.map(item => {
                const Icon = item.icon;
                return (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveView(item.id)}
                    className="grab-menu-item btn-interactive"
                  >
                    <div className="grab-menu-circle">
                      <Icon size={20} />
                    </div>
                    <span className="grab-menu-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Personal Bill Breakdown - All Years */}
      <div className="premium-card profile-details-card">
        <h3 className="section-title">
          <ClipboardList size={20} /> Rekap Tunggakan Pribadi
        </h3>

          <div className="bill-breakdown-container">
            {allBills.length > 0 ? (
              <>
                {allBills.map((bill, idx) => (
                  <div key={bill.tahun_hijriyyah || idx} className="bill-year-section">
                    <div className="bill-year-header">
                      <span className="bill-year-badge">{bill.tahun_hijriyyah} H</span>
                    </div>
                    <div className="bill-row">
                      <span>Mulazamah Bulanan</span>
                      <span className={bill.mulazamah.total_tunggakan > 0 ? 'danger' : 'lunas-text'}>
                        Rp {bill.mulazamah.total_tunggakan.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="bill-row">
                      <span>Iuran Pembayaran Wajib</span>
                      <span className={bill.wajib.total_tunggakan > 0 ? 'danger' : 'lunas-text'}>
                        Rp {bill.wajib.total_tunggakan.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="bill-row">
                      <span>Shodaqoh & Partisipasi</span>
                      <span className={bill.shodaqoh.total_tunggakan > 0 ? 'danger' : 'lunas-text'}>
                        Rp {bill.shodaqoh.total_tunggakan.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="bill-row-subtotal">
                      <span>Subtotal {bill.tahun_hijriyyah} H</span>
                      <span>Rp {bill.grand_total_tunggakan.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}

                <div className="bill-row-total">
                  <span>GRAND TOTAL TUNGGAKAN</span>
                  <span>Rp {totalTunggakanSemuaTahun.toLocaleString('id-ID')}</span>
                </div>
                <button 
                  onClick={() => setActiveView('tagihan')}
                  className="btn-gold w-full btn-interactive"
                  style={{ marginTop: '24px' }}
                >
                  <FileText size={16} style={{ marginRight: '8px' }} /> Lihat & Unduh Lembar Tagihan
                </button>
              </>
            ) : (
              <p>Memuat rekap tunggakan...</p>
            )}
          </div>
        </div>

      {/* MODAL: PHOTO PREVIEW */}
      {showPhotoPreview && currentUser?.foto_profil && (
        <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setShowPhotoPreview(false)}>
          <div style={{ position: 'relative', width: '300px', maxWidth: '85vw' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowPhotoPreview(false)}
              className="btn-interactive"
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={28} />
            </button>
            <img 
              src={currentUser.foto_profil} 
              alt="Preview Profil" 
              style={{ width: '100%', height: 'auto', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'block' }} 
            />
          </div>
        </div>
      )}

      <style>{`
        .dashboard-top-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .quick-access-card {
          grid-column: 1 / -1;
        }

        @media (max-width: 768px) {
          .dashboard-top-section {
            display: flex;
            flex-direction: column;
          }
          .profile-card {
            order: 1;
          }
          .quick-access-card {
            order: 2;
          }
          .outstanding-bill-card {
            order: 3;
          }
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .profile-card .summary-card-icon-container {
          width: 90px;
          height: 120px;
        }

        .profile-text-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
          padding: 4px 0;
        }

        .summary-card-icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 80px;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .summary-card-icon-container.warning {
          background-color: #ffc107;
          color: var(--color-danger);
          width: 64px;
          height: 64px;
          border-radius: 50%;
          animation: pulseWarningContainer 2s infinite;
        }

        .summary-card-icon-container.warning svg {
          animation: pulseWarningIcon 2s infinite ease-in-out;
        }

        @keyframes pulseWarningContainer {
          0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.6); }
          70% { box-shadow: 0 0 0 12px rgba(255, 193, 7, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
        }

        @keyframes pulseWarningIcon {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }

        .summary-card-icon-container.primary {
          background-color: rgba(128, 0, 0, 0.1);
          color: var(--accent-primary);
        }

        [data-theme="dark"] .summary-card-icon-container.primary {
          background-color: rgba(255, 215, 0, 0.1);
          color: var(--accent-secondary);
        }

        .summary-card-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .summary-card-value {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 4px 0;
        }

        .summary-card-value-small {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 4px 0;
        }

        .summary-card-sub {
          font-size: 0.725rem;
          color: var(--text-secondary);
        }

        .bill-breakdown-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 12px;
        }

        .bill-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          font-weight: 500;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .bill-row-total {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          font-size: 1.05rem;
          padding-top: 8px;
          color: var(--accent-primary);
        }

        [data-theme="dark"] .bill-row-total {
          color: var(--accent-secondary);
        }

        .bill-year-section {
          padding: 16px;
          background: var(--bg-primary);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bill-year-header {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }

        .bill-year-badge {
          font-size: 0.8rem;
          font-weight: 700;
          padding: 4px 14px;
          border-radius: 20px;
          background: linear-gradient(135deg, var(--accent-primary), rgba(27, 54, 93, 0.8));
          color: #fff;
          letter-spacing: 0.5px;
          font-family: var(--font-alt);
        }

        [data-theme="dark"] .bill-year-badge {
          background: linear-gradient(135deg, var(--accent-secondary), rgba(255, 215, 0, 0.7));
          color: #112240;
        }

        .bill-year-section .bill-row {
          padding-bottom: 8px;
          border-bottom: 1px dashed var(--border-color);
        }

        .bill-year-section .bill-row:last-of-type {
          border-bottom: none;
        }

        .bill-row-subtotal {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          font-size: 0.95rem;
          padding-top: 8px;
          border-top: 2px solid var(--border-color);
          color: var(--text-primary);
        }

        .lunas-text {
          color: var(--color-success, #28a745);
          font-weight: 600;
        }

        .grab-menu-card {
          background: linear-gradient(135deg, #1b365d 0%, #2a5298 50%, #0f2545 100%) !important;
          border-radius: 24px !important;
          box-shadow: 0 12px 35px rgba(27, 54, 93, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          position: relative;
          overflow: hidden;
        }

        .grab-menu-card::after {
          content: '';
          position: absolute;
          top: -60px;
          right: -60px;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        [data-theme="dark"] .grab-menu-card {
          background: linear-gradient(135deg, #0b1120 0%, #152336 50%, #0a192f 100%) !important;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5) !important;
          border-color: rgba(255, 255, 255, 0.05) !important;
        }

        .grab-menu-grid {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          gap: 16px 12px;
          justify-items: center;
        }

        @media (max-width: 1024px) {
          .grab-menu-grid {
            grid-template-columns: repeat(5, 1fr);
            grid-auto-flow: row;
            grid-auto-columns: auto;
            gap: 16px 12px;
          }
        }

        @media (max-width: 576px) {
          .grab-menu-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 12px 8px;
          }
        }

        .grab-menu-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          padding: 4px;
          outline: none;
          transition: transform 0.2s ease;
        }

        .grab-menu-item:hover {
          transform: translateY(-2px);
        }

        .grab-menu-item:focus-visible {
          outline: none;
        }

        .grab-menu-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          transition: all 0.3s ease;
        }

        [data-theme="dark"] .grab-menu-circle {
          background: rgba(165, 42, 42, 0.15);
          color: var(--accent-secondary);
          border: 1px solid var(--border-color);
        }

        .grab-menu-item:hover .grab-menu-circle {
          background: var(--accent-secondary);
          color: #112240;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        [data-theme="dark"] .grab-menu-item:hover .grab-menu-circle {
          background: var(--accent-secondary);
          color: #112240;
          box-shadow: 0 6px 16px rgba(255, 215, 0, 0.2);
        }

        .grab-menu-label {
          font-size: 0.725rem;
          font-weight: 600;
          color: #FFFFFF;
          text-align: center;
          margin-top: 8px;
          font-family: var(--font-alt);
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        [data-theme="dark"] .grab-menu-label {
          color: var(--text-primary);
        }

        @media (max-width: 480px) {
          .grab-menu-circle {
            width: 42px;
            height: 42px;
          }
          
          .grab-menu-circle svg {
            width: 18px;
            height: 18px;
          }

          .grab-menu-label {
            font-size: 0.625rem;
            margin-top: 6px;
          }
        }
      `}</style>
    </div>
  );
}
