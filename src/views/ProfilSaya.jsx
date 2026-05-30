import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { User, Edit3, KeyRound, X, Image as ImageIcon, RotateCw } from 'lucide-react';
import { api } from '../utils/api';
import Cropper from 'react-easy-crop';

export default function ProfilSaya() {
  const { currentUser, addNotification } = useAppStore();
  
  // Modal toggle states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // States for Image Cropper
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Form states for edit profile
  const [editForm, setEditForm] = useState({
    no_telp: currentUser?.no_telp || '',
    tempat_lahir: currentUser?.tempat_lahir || '',
    tanggal_lahir: currentUser?.tanggal_lahir || '',
    alamat_jalan: currentUser?.alamat_jalan || '',
    desa: currentUser?.desa || '',
    kecamatan: currentUser?.kecamatan || '',
    kabupaten_kota: currentUser?.kabupaten_kota || '',
    provinsi: currentUser?.provinsi || '',
    pekerjaan: currentUser?.pekerjaan || '',
    kegiatan: currentUser?.kegiatan || '',
    instansi: currentUser?.instansi || '',
    kelompok: currentUser?.kelompok || '',
    keahlian_1: currentUser?.keahlian_1 || '',
    keahlian_2: currentUser?.keahlian_2 || '',
    org_shiddiqiyyah: currentUser?.org_shiddiqiyyah || '',
    foto_profil: currentUser?.foto_profil || ''
  });

  // Form states for change passkey
  const [passkeyForm, setPasskeyForm] = useState({
    oldPasskey: '',
    newPasskey: '',
    confirmNewPasskey: ''
  });

  useEffect(() => {
    // Pengecekan pemicu dari pop-up beranda
    if (window.location.hash === '#edit-profil') {
      setShowEditModal(true);
      window.location.hash = ''; // Bersihkan hash agar tidak terus terbuka jika direfresh manual
    }
  }, []);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.post('/anggota/pengajuan-profil', {
        id_anggota: currentUser.id_anggota,
        data_perubahan: editForm
      });
      setSuccessMsg('Pengajuan perubahan profil berhasil dikirim! Silakan menunggu persetujuan Admin.');
      addNotification('Anda telah mengajukan perubahan profil ke Admin.');
      setTimeout(() => setShowEditModal(false), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengirim pengajuan');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCropImageSrc(event.target.result);
        setZoom(1);
        setRotation(0);
        setCrop({ x: 0, y: 0 });
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null; // Reset input agar bisa memilih file yang sama lagi jika dibatalkan
  };

  const handleCropComplete = async () => {
    try {
      const image = new Image();
      image.src = cropImageSrc;
      await new Promise((resolve) => (image.onload = resolve));

      // Buat kanvas pertama untuk menangani rotasi
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const angle = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(angle));
      const cos = Math.abs(Math.cos(angle));
      const width = image.width * cos + image.height * sin;
      const height = image.width * sin + image.height * cos;

      canvas.width = width;
      canvas.height = height;

      ctx.translate(width / 2, height / 2);
      ctx.rotate(angle);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);

      // Buat kanvas akhir untuk memotong dan kompresi
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      const maxSize = 400;
      finalCanvas.width = maxSize;
      finalCanvas.height = maxSize;

      finalCtx.drawImage(
        canvas,
        croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0, maxSize, maxSize
      );

      const compressedBase64 = finalCanvas.toDataURL('image/jpeg', 0.8);
      setEditForm({ ...editForm, foto_profil: compressedBase64 });
      setShowCropModal(false);
    } catch (e) {
      console.error('Gagal memotong gambar', e);
    }
  };

  const handlePasskeySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { oldPasskey, newPasskey, confirmNewPasskey } = passkeyForm;

    if (!oldPasskey || !newPasskey || !confirmNewPasskey) {
      setErrorMsg('Harap lengkapi semua kolom!');
      setLoading(false);
      return;
    }

    if (oldPasskey !== currentUser.passkey) {
      setErrorMsg('Passkey lama Anda salah!');
      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(newPasskey)) {
      setErrorMsg('Passkey baru harus berupa 6 digit angka!');
      setLoading(false);
      return;
    }

    if (newPasskey !== confirmNewPasskey) {
      setErrorMsg('Konfirmasi passkey baru tidak cocok!');
      setLoading(false);
      return;
    }

    try {
      const db = await api.get('/anggota');
      const target = db.find(a => a.id_anggota === currentUser.id_anggota);
      if (target) {
        await api.post('/pengaturan', {}); 
        await api.put(`/anggota/${currentUser.id_anggota}`, { passkey: newPasskey });
        currentUser.passkey = newPasskey;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
      setSuccessMsg('Passkey berhasil diperbarui! Silakan gunakan passkey baru pada login berikutnya.');
      setTimeout(() => setShowPasskeyModal(false), 3000);
    } catch (err) {
      setErrorMsg('Gagal mengganti passkey di backend. Namun passkey lokal Anda berhasil disimulasikan.');
      currentUser.passkey = newPasskey;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      setSuccessMsg('Passkey lokal Anda disimulasikan sukses.');
      setTimeout(() => setShowPasskeyModal(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profil-saya-view">
      <div className="premium-card profile-details-card">
        <div className="profile-details-header">
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
            <User size={20} /> Biodata Lengkap Profil
          </h3>
          <div className="profile-details-actions desktop-actions">
            <button 
              onClick={() => setShowEditModal(true)} 
              className="btn-primary btn-interactive" 
              style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
            >
              <Edit3 size={14} style={{ marginRight: '6px' }} />
              Ajukan Edit Profil
            </button>
            <button 
              onClick={() => setShowPasskeyModal(true)} 
              className="btn-secondary btn-interactive"
              style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
            >
              <KeyRound size={14} style={{ marginRight: '6px' }} />
              Ganti Passkey
            </button>
          </div>
        </div>

        <div className="profile-photo-section">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div 
              onClick={() => currentUser?.foto_profil && setShowPhotoPreview(true)}
              className="profile-photo-circle"
              style={{ cursor: currentUser?.foto_profil ? 'pointer' : 'default' }}
            >
              {currentUser?.foto_profil ? (
                <img src={currentUser.foto_profil} alt="Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={40} color="var(--text-secondary)" />
              )}
            </div>
            {currentUser?.foto_profil && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>Klik foto untuk memperbesar</span>}
          </div>

          <div className="profile-details-actions mobile-actions">
            <button 
              onClick={() => setShowEditModal(true)} 
              className="btn-primary btn-interactive" 
              style={{ flex: 1, padding: '8px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Edit3 size={14} style={{ marginRight: '6px' }} />
              Ajukan Edit Profil
            </button>
            <button 
              onClick={() => setShowPasskeyModal(true)} 
              className="btn-secondary btn-interactive"
              style={{ flex: 1, padding: '8px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <KeyRound size={14} style={{ marginRight: '6px' }} />
              Ganti Passkey
            </button>
          </div>
        </div>

        <div className="profile-details-grid">
          <div className="profile-data-item">
            <span className="profile-data-label">Nama Lengkap</span>
            <span className="profile-data-value">{currentUser?.nama_lengkap}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Nomor Telepon</span>
            <span className="profile-data-value">{currentUser?.no_telp || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Tempat / Tanggal Lahir</span>
            <span className="profile-data-value">
              {currentUser?.tempat_lahir || '-'}, {currentUser?.tanggal_lahir || '-'}
            </span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Alamat Jalan</span>
            <span className="profile-data-value">{currentUser?.alamat_jalan || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Desa</span>
            <span className="profile-data-value">{currentUser?.desa || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Kecamatan</span>
            <span className="profile-data-value">{currentUser?.kecamatan || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Kabupaten / Kota</span>
            <span className="profile-data-value">{currentUser?.kabupaten_kota || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Provinsi</span>
            <span className="profile-data-value">{currentUser?.provinsi || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Pekerjaan</span>
            <span className="profile-data-value">{currentUser?.pekerjaan || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Kegiatan</span>
            <span className="profile-data-value">{currentUser?.kegiatan || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Instansi</span>
            <span className="profile-data-value">{currentUser?.instansi || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Kelompok</span>
            <span className="profile-data-value">{currentUser?.kelompok || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Keahlian (1 & 2)</span>
            <span className="profile-data-value">
              {currentUser?.keahlian_1 || '-'} {currentUser?.keahlian_2 ? `& ${currentUser?.keahlian_2}` : ''}
            </span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Organisasi di Lingkungan Shiddiqiyyah</span>
            <span className="profile-data-value">{currentUser?.org_shiddiqiyyah || '-'}</span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Jabatan Pengurus</span>
            <span className="profile-data-value badge badge-jabatan" style={{ display: 'inline-block' }}>
              {currentUser?.nama_jabatan}
            </span>
          </div>
          <div className="profile-data-item">
            <span className="profile-data-label">Tanggal Pendasaran</span>
            <span className="profile-data-value">{currentUser?.tanggal_pendasaran || '-'}</span>
          </div>
          <div className="profile-data-item full-span">
            <span className="profile-data-label">Pemberi Pendasaran</span>
            <span className="profile-data-value">{currentUser?.pemberi_pendasaran || '-'}</span>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT PROFIL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <Edit3 size={20} /> Pengajuan Perubahan Biodata Profil
              </h3>
              <button className="btn-interactive" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {successMsg && <div className="badge badge-success w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>{successMsg}</div>}
                {errorMsg && <div className="badge badge-danger w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>{errorMsg}</div>}
                
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Perubahan data di bawah ini tidak akan langsung memodifikasi database, melainkan masuk ke dalam antrean (Waiting List) Admin untuk diperiksa dan disetujui.
                </p>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed var(--border-color)', margin: '0 auto 12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                    {editForm.foto_profil ? (
                      <img src={editForm.foto_profil} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={32} color="var(--text-secondary)" />
                    )}
                  </div>
                  <label className="btn-secondary btn-interactive" style={{ display: 'inline-block', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}>
                    Upload Foto Profil
                    <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  </label>
                </div>

                <div className="modal-form-grid">
                  {/* Input Fields omitted for brevity but remain identical to DashboardAnggota form */}
                  <div className="form-group"><label className="form-label">Nomor Telepon <span style={{color: 'var(--color-danger)'}}>*</span></label><input type="text" className="form-control" value={editForm.no_telp} onChange={(e) => setEditForm({ ...editForm, no_telp: e.target.value.replace(/\D/g, '') })} required /></div>
                  <div className="form-group"><label className="form-label">Tempat Lahir <span style={{color: 'var(--color-danger)'}}>*</span></label><input type="text" className="form-control" value={editForm.tempat_lahir} onChange={(e) => setEditForm({ ...editForm, tempat_lahir: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Tanggal Lahir <span style={{color: 'var(--color-danger)'}}>*</span></label><input type="date" className="form-control" value={editForm.tanggal_lahir} onChange={(e) => setEditForm({ ...editForm, tanggal_lahir: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Alamat Jalan <span style={{color: 'var(--color-danger)'}}>*</span></label><input type="text" className="form-control" value={editForm.alamat_jalan} onChange={(e) => setEditForm({ ...editForm, alamat_jalan: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Desa / Kelurahan <span style={{color: 'var(--color-danger)'}}>*</span></label><input type="text" className="form-control" value={editForm.desa} onChange={(e) => setEditForm({ ...editForm, desa: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Kecamatan <span style={{color: 'var(--color-danger)'}}>*</span></label><input type="text" className="form-control" value={editForm.kecamatan} onChange={(e) => setEditForm({ ...editForm, kecamatan: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Kabupaten / Kota <span style={{color: 'var(--color-danger)'}}>*</span></label><input type="text" className="form-control" value={editForm.kabupaten_kota} onChange={(e) => setEditForm({ ...editForm, kabupaten_kota: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Provinsi <span style={{color: 'var(--color-danger)'}}>*</span></label><input type="text" className="form-control" value={editForm.provinsi} onChange={(e) => setEditForm({ ...editForm, provinsi: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Pekerjaan</label><input type="text" className="form-control" value={editForm.pekerjaan} onChange={(e) => setEditForm({ ...editForm, pekerjaan: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Kegiatan</label><input type="text" className="form-control" value={editForm.kegiatan} onChange={(e) => setEditForm({ ...editForm, kegiatan: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Instansi</label><input type="text" className="form-control" value={editForm.instansi} onChange={(e) => setEditForm({ ...editForm, instansi: e.target.value })} /></div>
                  <div className="form-group">
                    <label className="form-label">Kelompok</label>
                    <select
                      className="form-control"
                      value={editForm.kelompok || ''}
                      onChange={(e) => setEditForm({ ...editForm, kelompok: e.target.value })}
                    >
                      <option value="">-- Pilih Kelompok --</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={`putra-${i+1}`} value={`${i+1} Putra`}>{i+1} Putra</option>
                      ))}
                      {[...Array(12)].map((_, i) => (
                        <option key={`putri-${i+1}`} value={`${i+1} Putri`}>{i+1} Putri</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Organisasi Shiddiqiyyah</label><input type="text" className="form-control" value={editForm.org_shiddiqiyyah} onChange={(e) => setEditForm({ ...editForm, org_shiddiqiyyah: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Keahlian Utama (1)</label><input type="text" className="form-control" value={editForm.keahlian_1} onChange={(e) => setEditForm({ ...editForm, keahlian_1: e.target.value })} /></div>
                  <div className="form-group full-span"><label className="form-label">Keahlian Penunjang (2)</label><input type="text" className="form-control" value={editForm.keahlian_2} onChange={(e) => setEditForm({ ...editForm, keahlian_2: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Mengirim...' : 'Kirim Pengajuan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CROP IMAGE */}
      {showCropModal && cropImageSrc && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>Potong Foto Profil</h3>
              <button type="button" className="btn-interactive" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} onClick={() => setShowCropModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ position: 'relative', height: '300px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="rect"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
              />
            </div>
            <div className="modal-footer" style={{ flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setRotation((prev) => (prev + 90) % 360)} 
                  className="btn-secondary btn-interactive"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCw size={14} /> Rotasi 90°
                </button>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, marginLeft: 'auto' }}>Zoom:</span>
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} style={{ flex: 1, maxWidth: '150px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '8px' }}>
                <button type="button" onClick={() => setShowCropModal(false)} className="btn-secondary">Batal</button>
                <button type="button" onClick={handleCropComplete} className="btn-primary">Terapkan Foto</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE PASSKEY */}
      {showPasskeyModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <KeyRound size={20} /> Ganti Passkey Keamanan
              </h3>
              <button className="btn-interactive" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} onClick={() => setShowPasskeyModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePasskeySubmit}>
              <div className="modal-body">
                {successMsg && <div className="badge badge-success w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>{successMsg}</div>}
                {errorMsg && <div className="badge badge-danger w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>{errorMsg}</div>}
                <div className="form-group">
                  <label className="form-label">Passkey Lama (6 Digit)</label>
                  <input type="password" className="form-control" maxLength={6} placeholder="••••••" value={passkeyForm.oldPasskey} onChange={(e) => setPasskeyForm({ ...passkeyForm, oldPasskey: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Passkey Baru (6 Digit)</label>
                  <input type="password" className="form-control" maxLength={6} placeholder="••••••" value={passkeyForm.newPasskey} onChange={(e) => setPasskeyForm({ ...passkeyForm, newPasskey: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Konfirmasi Passkey Baru</label>
                  <input type="password" className="form-control" maxLength={6} placeholder="••••••" value={passkeyForm.confirmNewPasskey} onChange={(e) => setPasskeyForm({ ...passkeyForm, confirmNewPasskey: e.target.value.replace(/\D/g, '') })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPasskeyModal(false)} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : 'Perbarui Passkey'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        .profile-details-card { display: flex; flex-direction: column; }
        .profile-details-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .profile-details-actions { display: flex; gap: 8px; }
        .profile-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .profile-data-item { display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; background-color: var(--bg-primary); border-radius: var(--radius-sm); border: 1px solid var(--border-color); }
        .profile-data-label { font-size: 0.725rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
        .profile-data-value { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); }
        .modal-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .full-span { grid-column: span 2; }

        .profile-photo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .desktop-actions {
          display: flex;
        }
        
        .mobile-actions {
          display: none;
          flex-direction: row;
          gap: 8px;
        }
        
        .profile-photo-circle {
          width: 120px;
          height: 160px;
          border-radius: 12px;
          overflow: hidden;
          border: 3px solid var(--accent-secondary);
          background-color: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 1024px) {
          .desktop-actions { display: none; }
          .mobile-actions { display: flex; width: 100%; max-width: 400px; }
          .profile-photo-section {
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 12px;
          }
        }

        @media (max-width: 768px) { 
          .profile-details-grid, .modal-form-grid { grid-template-columns: 1fr; } 
          .full-span { grid-column: span 1; }
        }
      `}</style>
    </div>
  );
}