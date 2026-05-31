import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { KeyRound, User, QrCode, ScanLine, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';
import QrScanner from '../components/QrScanner';
import Swal from 'sweetalert2';

export default function Login() {
  const { login, loginQR, registerPasskey, unlock, currentUser, settings } = useAppStore();
  
  // App-lock mode if a user session is remembered in localStorage but locked
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState('login'); // login | register
  
  // Form inputs
  const [noKtm, setNoKtm] = useState('');
  const [noKta, setNoKta] = useState('');
  const [passkey, setPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  
  // UI helpers
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [mockAnggota, setMockAnggota] = useState([]);

  // Check if currentUser exists and has registered passkey to show lock screen
  useEffect(() => {
    if (currentUser && currentUser.passkey) {
      setIsLocked(true);
    }
  }, [currentUser]);

  const handlePinPadPress = (num) => {
    if (passkey.length < 6) {
      setPasskey(prev => prev + num);
      setError('');
    }
  };

  const handlePinPadClear = () => {
    setPasskey('');
    setError('');
  };

  const handlePinPadBackspace = () => {
    setPasskey(prev => prev.slice(0, -1));
    setError('');
  };

  // Auto-submit when passkey reaches 6 digits on lock screen
  useEffect(() => {
    if (isLocked && passkey.length === 6 && !loading) {
      const timer = setTimeout(() => {
        handleUnlockSubmit({ preventDefault: () => {} });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [passkey, isLocked]);

  // Load mock accounts for easy QR-Code mock scanning
  const loadMockMembers = async () => {
    try {
      const data = await api.get('/anggota');
      setMockAnggota(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQRScanClick = () => {
    loadMockMembers();
    setShowQRModal(true);
  };

  const handleMockQRSelect = (member) => {
    setNoKtm(member.no_ktm);
    setNoKta(member.no_kta);
    setShowQRModal(false);
    setError('');
    
    // As per PRD:
    // "Jika menggunakan QR code maka tidak perlu memasukkan no ktm dan no kta langsung membuat passkey (atau masukkan passkey)"
    if (activeTab === 'register') {
      alert(`QR Code Anggota "${member.nama_lengkap}" berhasil dipindai! Silakan buat Passkey 6 Digit baru Anda.`);
    } else {
      // This is now handled directly by handleQRScanSuccess for Login mode
      alert(`QR Code Anggota "${member.nama_lengkap}" berhasil dipindai!`);
    }
  };

  const handleQRScanSuccess = async (decodedText) => {
    const member = mockAnggota.find(m => m.id_anggota_ikhwaan === decodedText);
    
    if (member) {
      if (activeTab === 'login') {
        // Direct login without passkey
        setShowQRModal(false);
        setLoading(true);
        try {
          await loginQR(decodedText);
        } catch (err) {
          setError(err.message || 'Login via QR gagal');
          setLoading(false);
        }
      } else {
        // Registration mode
        handleMockQRSelect(member);
      }
    } else {
      alert(`Anggota dengan ID Ikhwan ${decodedText} tidak ditemukan.`);
      setShowQRModal(false);
    }
  };

  const validatePasskey = (val) => {
    return /^\d{6}$/.test(val);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!noKtm || !noKta || !passkey) {
      setError('Harap lengkapi semua kolom!');
      setLoading(false);
      return;
    }

    if (!validatePasskey(passkey)) {
      setError('Passkey harus berupa 6 digit angka!');
      setLoading(false);
      return;
    }

    try {
      await login(noKtm, noKta, passkey);
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!noKtm || !noKta || !passkey || !confirmPasskey) {
      setError('Harap lengkapi semua kolom!');
      setLoading(false);
      return;
    }

    if (!validatePasskey(passkey)) {
      setError('Passkey harus berupa 6 digit angka!');
      setLoading(false);
      return;
    }

    if (passkey !== confirmPasskey) {
      setError('Konfirmasi Passkey tidak cocok!');
      setLoading(false);
      return;
    }

    try {
      await registerPasskey(noKtm, noKta, passkey);
    } catch (err) {
      setError(err.message || 'Registrasi passkey gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!passkey) {
      setError('Masukkan Passkey!');
      setLoading(false);
      return;
    }

    if (!validatePasskey(passkey)) {
      setError('Passkey harus berupa 6 digit angka!');
      setLoading(false);
      return;
    }

    try {
      await unlock(passkey);
    } catch (err) {
      setError(err.message || 'Buka kunci gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleForcedLogout = () => {
    Swal.fire({
      title: 'Keluar dari sesi ini?',
      text: "Jika Anda masuk dengan akun lain, Anda akan dikeluarkan dari akun yang sedang login saat ini.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1b365d',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('currentUser');
        setIsLocked(false);
        setPasskey('');
        setNoKtm('');
        setNoKta('');
        setError('');
        window.location.reload();
      }
    });
  };

  const orgName = settings?.nama_pendek_organisasi || 'IKHWAN 9';

  return (
    <div className="login-page">
      {/* Sacred Top Banner */}
      <div className="top-sacred-banner" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}>
        ATAS BERKAT ROCHMAT ALLOH YANG MAHA KUASA
      </div>
      
      {/* Background Graphic Effects */}
      <div className="login-bg-overlay" />
      
      <div className="login-card-container" style={{ marginTop: '24px' }}>
        {/* Logo and Brand Header */}
        {/* Logo and Brand Header */}
        {!isLocked && (
          <div className="login-header-wrapper">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="login-logo-img" />
            ) : (
              <div className="login-logo">I9</div>
            )}
            <div className="login-brand-details">
              <h1 className="login-title gradient-text">{orgName}</h1>
              <p className="login-tagline">Untuk Indonesia Raya</p>
            </div>
          </div>
        )}

        {error && <div className="login-error-alert">{error}</div>}

        {/* =======================================================
            CASE 3: LOCK SCREEN MODE (Sesi Masih Ada)
            ======================================================= */}
        {isLocked ? (
          <form onSubmit={handleUnlockSubmit} className="login-form">
            <div className="lock-user-info">
              <div className="lock-user-avatar">
                {currentUser?.foto_profil ? (
                  <img 
                    src={currentUser.foto_profil} 
                    alt="Profil" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                  />
                ) : (
                  currentUser?.nama_lengkap?.charAt(0).toUpperCase()
                )}
              </div>
              <h3>Masuk sebagai</h3>
              <p className="lock-user-name">{currentUser?.nama_lengkap}</p>
              <span className="lock-user-role">{currentUser?.nama_jabatan}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Masukkan Passkey 6 Digit Anda</label>
              <div className="input-with-icon">
                <KeyRound className="input-icon" size={18} />
                <input
                  type={showPass ? 'text' : 'password'}
                  maxLength={6}
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="form-control padded-left"
                  disabled={loading}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="input-eye-btn"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full btn-interactive" disabled={loading} style={{ display: 'none' }}>
              {loading ? 'Membuka Kunci...' : 'Buka Kunci'}
            </button>

            {/* PIN Pad / Keyboard Anggota (Mobile & Tablet only) */}
            <div className="pin-pad-container">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinPadPress(num.toString())}
                  className="pin-btn btn-interactive"
                  disabled={loading}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinPadClear}
                className="pin-btn clear-btn btn-interactive"
                disabled={loading}
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handlePinPadPress('0')}
                className="pin-btn btn-interactive"
                disabled={loading}
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinPadBackspace}
                className="pin-btn backspace-btn btn-interactive"
                disabled={loading}
              >
                ⌫
              </button>
            </div>

            <button 
              type="button" 
              onClick={handleForcedLogout} 
              className="btn-link-action"
              style={{ marginTop: '24px' }}
            >
              Masuk dengan akun lain
            </button>
          </form>
        ) : (
          /* =======================================================
             CASE 1 & 2: LOGIN / REGISTER PASSKEY SCREEN
             ======================================================= */
          <>
            {/* Tabs */}
            <div className="login-tabs">
              <button
                onClick={() => { setActiveTab('login'); setError(''); }}
                className={`login-tab ${activeTab === 'login' ? 'active' : ''}`}
              >
                Masuk Sesi
              </button>
              <button
                onClick={() => { setActiveTab('register'); setError(''); }}
                className={`login-tab ${activeTab === 'register' ? 'active' : ''}`}
              >
                Pengguna Baru
              </button>
            </div>

            {activeTab === 'login' ? (
              /* FORM LOGIN */
              <form onSubmit={handleLoginSubmit} className="login-form">
                <div className="form-group">
                  <label className="form-label">Nomor KTM</label>
                  <div className="input-with-icon">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      value={noKtm}
                      onChange={(e) => setNoKtm(e.target.value)}
                      placeholder="Masukkan Nomor KTM Anda"
                      className="form-control padded-left"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nomor KTA</label>
                  <div className="input-with-icon">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      value={noKta}
                      onChange={(e) => setNoKta(e.target.value)}
                      placeholder="Masukkan Nomor KTA Anda"
                      className="form-control padded-left"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Passkey 6 Digit</label>
                  <div className="input-with-icon">
                    <KeyRound className="input-icon" size={18} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      maxLength={6}
                      value={passkey}
                      onChange={(e) => setPasskey(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="form-control padded-left"
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPass(!showPass)} 
                      className="input-eye-btn"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
                  <button type="submit" className="btn-primary w-full btn-interactive" disabled={loading}>
                    {loading ? 'Memproses...' : 'Masuk Aplikasi'}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleQRScanClick}
                    className="btn-primary w-full btn-interactive"
                    style={{ backgroundColor: '#1b365d', borderColor: '#1b365d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    title="Login dengan KTA OPSHID"
                  >
                    <QrCode size={18} />
                    Login dengan KTA OPSHID
                  </button>
                </div>
              </form>
            ) : (
              /* FORM REGISTER PASSKEY */
              <form onSubmit={handleRegisterSubmit} className="login-form">
                <div className="form-group">
                  <label className="form-label">Nomor KTM</label>
                  <div className="input-with-icon">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      value={noKtm}
                      onChange={(e) => setNoKtm(e.target.value)}
                      placeholder="Masukkan Nomor KTM Anda"
                      className="form-control padded-left"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nomor KTA</label>
                  <div className="input-with-icon">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      value={noKta}
                      onChange={(e) => setNoKta(e.target.value)}
                      placeholder="Masukkan Nomor KTA Anda"
                      className="form-control padded-left"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Buat Passkey 6 Digit Baru</label>
                  <div className="input-with-icon">
                    <KeyRound className="input-icon" size={18} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      maxLength={6}
                      value={passkey}
                      onChange={(e) => setPasskey(e.target.value.replace(/\D/g, ''))}
                      placeholder="Masukkan 6 Angka"
                      className="form-control padded-left"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Konfirmasi Passkey Baru</label>
                  <div className="input-with-icon">
                    <KeyRound className="input-icon" size={18} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      maxLength={6}
                      value={confirmPasskey}
                      onChange={(e) => setConfirmPasskey(e.target.value.replace(/\D/g, ''))}
                      placeholder="Konfirmasi 6 Angka"
                      className="form-control padded-left"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
                  <button type="submit" className="btn-primary w-full btn-interactive" disabled={loading}>
                    {loading ? 'Membuat Passkey...' : 'Daftarkan Passkey'}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleQRScanClick}
                    className="btn-primary w-full btn-interactive"
                    style={{ backgroundColor: '#1b365d', borderColor: '#1b365d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    title="Scan KTA OPSHID"
                  >
                    <QrCode size={18} />
                    Scan KTA OPSHID
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* QR SCAN MODAL */}
      {showQRModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <ScanLine size={20} />
                Scan QR Code Anggota
              </h3>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center' }}>
                Arahkan kamera ke QR Code pada ID Card Anggota.
              </p>
              <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <QrScanner 
                  onScanSuccess={handleQRScanSuccess} 
                  onScanFailure={(err) => { /* ignore minor failures while scanning */ }} 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowQRModal(false)} className="btn-secondary">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-primary);
          position: relative;
          padding: 24px;
          overflow: hidden;
          transition: var(--transition-normal);
        }

        .login-bg-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(27, 54, 93, 0.05);
          z-index: 1;
        }

        [data-theme="dark"] .login-bg-overlay {
          background: rgba(165, 42, 42, 0.08);
        }

        .login-card-container {
          width: 100%;
          max-width: 440px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 40px 32px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
          z-index: 5;
          position: relative;
          animation: cardIn 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-header-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          justify-content: flex-start;
          text-align: left;
        }

        .login-brand-details {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }

        .login-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: var(--radius-md);
          background: var(--accent-primary);
          color: #FFFFFF;
          font-weight: 800;
          font-family: var(--font-alt);
          font-size: 1.5rem;
          margin-bottom: 0;
          box-shadow: 0 6px 15px rgba(27, 54, 93, 0.25);
          flex-shrink: 0;
        }

        .login-logo-img {
          width: 64px;
          height: 64px;
          object-fit: contain;
          border-radius: var(--radius-md);
          margin-bottom: 0;
          box-shadow: 0 6px 15px rgba(27, 54, 93, 0.25);
          background-color: #FFFFFF;
          padding: 4px;
          flex-shrink: 0;
        }

        [data-theme="dark"] .login-logo, [data-theme="dark"] .login-logo-img {
          box-shadow: 0 6px 15px rgba(165, 42, 42, 0.35);
        }

        .login-title {
          font-size: 1.35rem;
          margin-bottom: 0;
          line-height: 1.25;
          letter-spacing: 0.5px;
        }

        .login-tagline {
          font-size: 0.725rem;
          color: var(--accent-secondary);
          font-weight: 700;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .login-subtitle {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .login-error-alert {
          background-color: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.2);
          color: var(--color-danger);
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          font-size: 0.825rem;
          margin-bottom: 24px;
          font-weight: 500;
          text-align: center;
        }

        .login-tabs {
          display: flex;
          border: 1px solid var(--border-color);
          background-color: var(--bg-primary);
          border-radius: var(--radius-sm);
          padding: 4px;
          margin-bottom: 24px;
        }

        .login-tab {
          flex: 1;
          background: none;
          border: none;
          padding: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          border-radius: 4px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .login-tab.active {
          background-color: var(--accent-primary);
          color: #FFFFFF;
        }

        [data-theme="dark"] .login-tab.active {
          background-color: var(--accent-secondary);
          color: #112240;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
        }

        .padded-left {
          padding-left: 48px;
        }

        .input-eye-btn {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .login-buttons-row {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .w-full {
          width: 100%;
        }

        .flex-1 {
          flex: 1;
        }

        .btn-link-action {
          display: block;
          margin: 0 auto;
          background: none;
          border: none;
          color: var(--accent-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        .lock-user-info {
          text-align: center;
          margin-bottom: 12px;
        }

        .lock-user-info h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
        }

        .lock-user-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--accent-primary);
          color: #FFFFFF;
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
          border: 3px solid var(--accent-secondary);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .lock-user-name {
          font-size: 0.95rem;
          font-weight: 700;
          margin-top: 2px;
          margin-bottom: 2px;
        }

        .lock-user-role {
          font-size: 0.72rem;
          color: var(--accent-secondary);
          font-weight: 600;
          text-transform: uppercase;
          display: block;
          margin-top: 2px;
        }

        .mock-qr-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 280px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .mock-qr-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border-color);
          background-color: var(--bg-primary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .mock-qr-item:hover {
          border-color: var(--accent-secondary);
          background-color: var(--bg-tertiary);
        }

        .mock-qr-item-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--accent-primary);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        /* Penyesuaian ukuran Top Banner khusus untuk Tablet */
        @media (max-width: 1024px) {
          .top-sacred-banner {
            padding: 12px 0;
            font-size: 1rem;
          }
        }

        /* Mengembalikan ke ukuran asli untuk layar HP */
        @media (max-width: 576px) {
          .top-sacred-banner {
            padding: 8px 0;
            font-size: 0.75rem;
          }

          .login-page {
            padding: 16px;
          }

          .login-card-container {
            padding: 28px 20px;
          }

          .login-logo {
            width: 48px;
            height: 48px;
            font-size: 1.25rem;
            margin-bottom: 0 !important;
          }

          .login-logo-img {
            width: 52px;
            height: 52px;
            margin-bottom: 0 !important;
          }

          .login-title {
            font-size: 1.15rem;
          }
        }

        /* PIN Pad Styles */
        .pin-pad-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 16px;
          max-width: 240px;
          margin-left: auto;
          margin-right: auto;
        }

        .pin-btn {
          height: 52px;
          width: 52px;
          border-radius: 50%;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 1.25rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin: 0 auto;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: all 0.15s ease;
        }

        .pin-btn:hover {
          background-color: var(--bg-tertiary);
          border-color: var(--accent-secondary);
        }

        .pin-btn:active {
          transform: scale(0.92);
        }

        .pin-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .clear-btn {
          color: var(--color-danger);
          font-size: 1.15rem;
        }

        .backspace-btn {
          color: var(--text-secondary);
          font-size: 1.15rem;
        }

        @media (min-width: 1025px) {
          .pin-pad-container {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
