import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Megaphone, Trash, Eye, Plus } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Pengumuman() {
  const { 
    currentUser, 
    announcements, 
    loadAnnouncements, 
    addAnnouncement, 
    deleteAnnouncement 
  } = useAppStore();

  const [loading, setLoading] = useState(false);

  // Announcement Form State
  const [annForm, setAnnForm] = useState({
    judul: '',
    deskripsi: '',
    file_url: '',
    link_url: ''
  });

  const userRole = currentUser?.role;
  const canCreate = ['Admin', 'Humas'].includes(userRole);
  const canDelete = ['Admin', 'Humas', 'Sekretaris'].includes(userRole);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // Limit to 2MB to keep db.json small
      Swal.fire('Gagal!', 'Ukuran file maksimal adalah 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAnnForm({ ...annForm, file_url: reader.result });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleAnnSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!annForm.judul || !annForm.deskripsi) {
      Swal.fire('Gagal!', 'Judul dan Deskripsi wajib diisi!', 'error');
      setLoading(false);
      return;
    }

    try {
      await addAnnouncement(annForm);
      Swal.fire('Berhasil!', 'Pengumuman baru berhasil disebarluaskan!', 'success');
      
      // Reset form
      setAnnForm({
        judul: '',
        deskripsi: '',
        file_url: '',
        link_url: ''
      });
    } catch (err) {
      Swal.fire('Gagal!', err.message || 'Gagal menyebarkan pengumuman', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnn = async (id) => {
    const confirmResult = await Swal.fire({
      title: 'Konfirmasi Hapus',
      text: 'Apakah Anda yakin ingin menghapus pengumuman ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (!confirmResult.isConfirmed) return;
    
    try {
      await deleteAnnouncement(id);
      Swal.fire('Terhapus!', 'Pengumuman berhasil dihapus.', 'success');
    } catch (err) {
      Swal.fire('Gagal', err.message || 'Gagal menghapus pengumuman', 'error');
    }
  };

  return (
    <div className="pengumuman-view">
      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Megaphone size={20} /> Papan Pengumuman & Broadcast
      </h3>

      <div className="pengumuman-section">
        {/* Creator Form */}
        {canCreate && (
          <div className="premium-card" style={{ marginBottom: '32px' }}>
            <h4 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Buat Broadcast Pengumuman Baru
            </h4>
            <form onSubmit={handleAnnSubmit} className="ann-form">
              <div className="form-group">
                <label className="form-label">Judul Pengumuman</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Undangan Pendasaran Gelombang V"
                  value={annForm.judul}
                  onChange={(e) => setAnnForm({ ...annForm, judul: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi Informasi Lengkap</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Tuliskan rincian pengumuman di sini..."
                  value={annForm.deskripsi}
                  onChange={(e) => setAnnForm({ ...annForm, deskripsi: e.target.value })}
                  required
                />
              </div>
              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Lampiran Dokumen (PDF/JPG/PNG)</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                  {annForm.file_url && (
                    <small style={{ color: 'var(--color-success)', display: 'block', marginTop: '4px' }}>
                      ✓ File berhasil dilampirkan siap di-broadcast
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Tautan / URL Link (Opsional)</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://..."
                    value={annForm.link_url}
                    onChange={(e) => setAnnForm({ ...annForm, link_url: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary btn-interactive" disabled={loading}>
                {loading ? 'Mengirim...' : 'Broadcast Pengumuman'}
              </button>
            </form>
          </div>
        )}

        {/* List display boards */}
        <h4 className="section-title">Informasi Terbaru Organisasi</h4>
        {announcements.length === 0 ? (
          <div className="premium-card empty-state">
            <p>Tidak ada pengumuman saat ini.</p>
          </div>
        ) : (
          <div className="announcements-cards-list">
            {announcements.map(ann => (
              <div key={ann.id_pengumuman} className="premium-card ann-card">
                <div className="ann-card-header">
                  <h3 className="ann-title">{ann.judul}</h3>
                  <span className="ann-date">
                    {new Date(ann.tanggal_publikasi).toLocaleDateString('id-ID', {
                      dateStyle: 'medium'
                    })}
                  </span>
                </div>
                <p className="ann-description">{ann.deskripsi}</p>
                
                <div className="ann-card-footer">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {ann.link_url && (
                      <a 
                        href={ann.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-gold btn-interactive"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} /> Buka Tautan
                      </a>
                    )}
                    {ann.file_url && (
                      <a 
                        href={ann.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-secondary btn-interactive"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px' }}
                      >
                        Lihat Lampiran
                      </a>
                    )}
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteAnn(ann.id_pengumuman)}
                      className="btn-interactive"
                      style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                      title="Hapus Pengumuman"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .announcements-cards-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }

        .ann-card {
          padding: 20px !important;
          background-color: var(--bg-secondary);
        }

        .ann-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ann-title {
          font-family: var(--font-alt);
          font-size: 1rem;
          font-weight: 700;
          color: var(--accent-primary);
        }

        [data-theme="dark"] .ann-title {
          color: var(--accent-secondary);
        }

        .ann-date {
          font-size: 0.725rem;
          color: var(--text-secondary);
        }

        .ann-description {
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--text-primary);
          white-space: pre-line;
        }

        .ann-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }

        @media (max-width: 768px) {
          .ann-form .btn-primary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
