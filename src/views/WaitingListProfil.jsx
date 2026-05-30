import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { UserCheck, Check, X, Eye, ShieldAlert, ArrowRight, Filter } from 'lucide-react';
import { api } from '../utils/api';
import Swal from 'sweetalert2';

export default function WaitingListProfil() {
  const { addNotification, currentUser } = useAppStore();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // State untuk filter status
  const [statusFilter, setStatusFilter] = useState('');

  // Reject reason popup state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [alasanPenolakan, setAlasanPenolakan] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.get('/pengajuan-profil');
      // Sort pending first
      data.sort((a, b) => {
        if (a.status_pengajuan === 'PENDING' && b.status_pengajuan !== 'PENDING') return -1;
        if (a.status_pengajuan !== 'PENDING' && b.status_pengajuan === 'PENDING') return 1;
        return new Date(b.tanggal_pengajuan) - new Date(a.tanggal_pengajuan);
      });
      setQueue(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const confirmResult = await Swal.fire({
      title: 'Konfirmasi Persetujuan',
      text: 'Apakah Anda yakin ingin menyetujui perubahan biodata ini? Data profil anggota akan langsung diperbarui.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, Setujui',
      cancelButtonText: 'Batal'
    });

    if (!confirmResult.isConfirmed) return;

    setActionLoading(true);
    try {
      await api.post(`/pengajuan-profil/${id}/approve`);
      Swal.fire('Berhasil!', 'Pengajuan berhasil disetujui!', 'success');

      const req = queue.find(q => q.id_pengajuan === id);
      addNotification(`Perubahan biodata profil ${req?.nama_lengkap} telah disetujui.`);

      // Auto-update UI profil jika admin menyetujui pengajuannya sendiri
      if (currentUser?.id_anggota === req?.id_anggota) {
        useAppStore.setState({ currentUser: { ...currentUser, ...req.data_baru } });
        localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...req.data_baru }));
      }

      setSelectedRequest(null);
      await loadQueue();
    } catch (err) {
      Swal.fire('Gagal', err.message || 'Gagal menyetujui pengajuan', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (id) => {
    setRejectId(id);
    setAlasanPenolakan('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!alasanPenolakan.trim()) {
      Swal.fire('Peringatan', 'Harap isi alasan penolakan!', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/pengajuan-profil/${rejectId}/reject`, {
        alasan_penolakan: alasanPenolakan
      });

      Swal.fire('Ditolak', 'Pengajuan telah ditolak.', 'success');
      const req = queue.find(q => q.id_pengajuan === rejectId);
      addNotification(`Perubahan biodata profil ${req?.nama_lengkap} DITOLAK: ${alasanPenolakan}`);

      setShowRejectModal(false);
      setSelectedRequest(null);
      await loadQueue();
    } catch (err) {
      Swal.fire('Gagal', err.message || 'Gagal menolak pengajuan', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'APPROVED': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      default: return 'badge-warning';
    }
  };

  // Melakukan filter pada antrean berdasarkan status yang dipilih
  const filteredQueue = queue.filter(req => {
    if (!statusFilter) return true;
    return req.status_pengajuan === statusFilter;
  });

  return (
    <div className="waiting-list-view">
      <h3 className="section-title">
        <UserCheck size={20} /> Antrean Pengajuan Ubah Profil
      </h3>

      {/* FILTER CONTROLS */}
      <div className="premium-card filter-card" style={{ marginBottom: '24px', padding: '20px' }}>
        <h4 className="form-label" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
          <Filter size={14} style={{ display: 'inline', marginRight: '4px' }} />
          Filter Pengajuan Berdasarkan Status
        </h4>
        <div className="form-group" style={{ marginBottom: 0, maxWidth: '400px' }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Semua Status Pengajuan --</option>
            <option value="PENDING">PENDING (Menunggu Persetujuan)</option>
            <option value="APPROVED">APPROVED (Telah Disetujui)</option>
            <option value="REJECTED">REJECTED (Telah Ditolak)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Memuat antrean pengajuan...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="premium-card empty-state">
          <p>{queue.length === 0 ? 'Tidak ada pengajuan perubahan biodata saat ini.' : 'Tidak ada pengajuan yang sesuai dengan filter status tersebut.'}</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Menampilkan <strong>{filteredQueue.length}</strong> dari <strong>{queue.length}</strong> total pengajuan.
          </p>
          {/* DESKTOP TABLE */}
          <div className="desktop-only-table table-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Anggota</th>
                  <th>Nomor KTM</th>
                  <th>Nomor KTA</th>
                  <th>Tanggal Pengajuan</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi Kelola</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((req, index) => (
                  <tr key={req.id_pengajuan}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{req.nama_lengkap}</td>
                    <td>{req.no_ktm}</td>
                    <td>{req.no_kta}</td>
                    <td>
                      {new Date(req.tanggal_pengajuan).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(req.status_pengajuan)}`}>
                        {req.status_pengajuan}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="btn-secondary btn-interactive"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px' }}
                          title="Bandingkan Data Perubahan"
                        >
                          <Eye size={12} style={{ marginRight: '4px' }} /> Detail
                        </button>

                        {req.status_pengajuan === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(req.id_pengajuan)}
                              className="btn-primary btn-interactive"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--color-success)' }}
                              disabled={actionLoading}
                            >
                              <Check size={12} /> Setujui
                            </button>
                            <button
                              onClick={() => handleOpenReject(req.id_pengajuan)}
                              className="btn-primary btn-interactive"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--color-danger)' }}
                              disabled={actionLoading}
                            >
                              <X size={12} /> Tolak
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="mobile-cards-container">
            {filteredQueue.map((req, index) => (
              <div key={req.id_pengajuan} className="mobile-table-card">
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Nama Anggota</span>
                  <span className="mobile-table-card-value" style={{ fontWeight: 600 }}>{req.nama_lengkap}</span>
                </div>
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Tanggal Pengajuan</span>
                  <span className="mobile-table-card-value">
                    {new Date(req.tanggal_pengajuan).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Status</span>
                  <span className="mobile-table-card-value">
                    <span className={`badge ${getStatusBadgeClass(req.status_pengajuan)}`}>{req.status_pengajuan}</span>
                  </span>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="btn-gold btn-interactive"
                    style={{ padding: '8px', fontSize: '0.75rem', flex: 1 }}
                  >
                    <Eye size={12} style={{ marginRight: '4px' }} /> Bandingkan
                  </button>
                  {req.status_pengajuan === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(req.id_pengajuan)}
                        className="btn-primary btn-interactive"
                        style={{ padding: '8px', fontSize: '0.75rem', backgroundColor: 'var(--color-success)', flex: 1 }}
                        disabled={actionLoading}
                      >
                        Setujui
                      </button>
                      <button
                        onClick={() => handleOpenReject(req.id_pengajuan)}
                        className="btn-primary btn-interactive"
                        style={{ padding: '8px', fontSize: '0.75rem', backgroundColor: 'var(--color-danger)', flex: 1 }}
                        disabled={actionLoading}
                      >
                        Tolak
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* =======================================================
          MODAL: COMPARE DATA MODAL (DETAIL)
          ======================================================= */}
      {selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <Eye size={20} />
                Komparasi Perubahan Biodata
              </h3>
              <button className="btn-interactive" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} onClick={() => setSelectedRequest(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="compare-cards-wrapper">

                {/* Column 1: Old Data */}
                <div className="compare-card">
                  <h4 className="compare-card-title danger">Data Lama (Saat Ini)</h4>
                  <div className="compare-data-list">
                    {Object.keys(selectedRequest.data_lama).map(key => {
                      // Only display descriptive field diffs, bypass IDs and system fields
                      const excludes = ['id_anggota', 'id_anggota_ikhwaan', 'no_ktm', 'no_kta', 'passkey', 'id_jabatan', 'nama_jabatan', 'role'];
                      if (excludes.includes(key) || selectedRequest.data_lama[key] === selectedRequest.data_baru[key]) return null;

                      if (key === 'foto_profil') {
                        return (
                          <div key={key} className="compare-item">
                            <span className="compare-item-label">FOTO PROFIL</span>
                            <div style={{ width: '60px', height: '60px', marginTop: '4px' }}>
                              {selectedRequest.data_lama[key] ? (
                                <img src={selectedRequest.data_lama[key]} alt="Foto Lama" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Kosong</div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={key} className="compare-item">
                          <span className="compare-item-label">{key.replace('_', ' ').toUpperCase()}</span>
                          <p className="compare-item-val-old">{selectedRequest.data_lama[key] || '-'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="compare-arrow-indicator">
                  <ArrowRight size={24} />
                </div>

                {/* Column 2: New Proposed Data */}
                <div className="compare-card">
                  <h4 className="compare-card-title success">Usulan Data Baru</h4>
                  <div className="compare-data-list">
                    {Object.keys(selectedRequest.data_baru).map(key => {
                      const excludes = ['id_anggota', 'id_anggota_ikhwaan', 'no_ktm', 'no_kta', 'passkey', 'id_jabatan', 'nama_jabatan', 'role'];
                      if (excludes.includes(key) || selectedRequest.data_lama[key] === selectedRequest.data_baru[key]) return null;

                      if (key === 'foto_profil') {
                        return (
                          <div key={key} className="compare-item highlighted-success">
                            <span className="compare-item-label">FOTO PROFIL</span>
                            <div style={{ width: '60px', height: '60px', marginTop: '4px' }}>
                              {selectedRequest.data_baru[key] ? (
                                <img src={selectedRequest.data_baru[key]} alt="Foto Baru" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Kosong</div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={key} className="compare-item highlighted-success">
                          <span className="compare-item-label">{key.replace('_', ' ').toUpperCase()}</span>
                          <p className="compare-item-val-new">{selectedRequest.data_baru[key] || '-'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {selectedRequest.status_pengajuan === 'REJECTED' && (
                <div className="badge badge-danger w-full" style={{ marginTop: '16px', padding: '12px', display: 'block', borderRadius: '4px', textTransform: 'none' }}>
                  <strong>Alasan Penolakan Admin:</strong> {selectedRequest.alasan_penolakan}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedRequest(null)} className="btn-secondary">
                Tutup
              </button>
              {selectedRequest.status_pengajuan === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleOpenReject(selectedRequest.id_pengajuan)}
                    className="btn-primary"
                    style={{ backgroundColor: 'var(--color-danger)' }}
                    disabled={actionLoading}
                  >
                    Tolak Pengajuan
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest.id_pengajuan)}
                    className="btn-gold"
                    disabled={actionLoading}
                  >
                    Setujui Perubahan
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: REJECT FORM POPUP (ALASAN PENOLAKAN)
          ======================================================= */}
      {showRejectModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <ShieldAlert size={20} />
                Alasan Penolakan
              </h3>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tulis alasan mengapa data ini ditolak</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Contoh: Format penulisan alamat salah atau keahlian belum terverifikasi."
                    value={alasanPenolakan}
                    onChange={(e) => setAlasanPenolakan(e.target.value)}
                    required
                    disabled={actionLoading}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowRejectModal(false)} className="btn-secondary" disabled={actionLoading}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-danger)' }} disabled={actionLoading}>
                  {actionLoading ? 'Memproses...' : 'Tolak Permanen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .filter-card {
          padding: 12px !important;
        }
        .filter-card .form-label {
          font-size: 0.7rem !important;
          margin-bottom: 4px !important;
        }
        .filter-card .form-control {
          padding: 6px 10px !important;
          font-size: 0.75rem !important;
        }

        .mobile-cards-container {
          display: none;
        }

        .premium-table th,
        .premium-table td {
          padding: 6px 10px !important;
          font-size: 0.85rem !important;
        }

        @media (max-width: 768px) {
          .desktop-only-table {
            display: none;
          }
          .mobile-cards-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
        }

        .compare-cards-wrapper {
          display: flex;
          align-items: stretch;
          gap: 16px;
        }

        .compare-card {
          flex: 1;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: var(--bg-primary);
          padding: 16px;
        }

        .compare-card-title {
          font-family: var(--font-alt);
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-color);
        }

        .compare-card-title.danger {
          color: var(--color-danger);
        }

        .compare-card-title.success {
          color: var(--color-success);
        }

        .compare-arrow-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-secondary);
        }

        @media (max-width: 600px) {
          .compare-cards-wrapper {
            flex-direction: column;
          }
          .compare-arrow-indicator {
            transform: rotate(90deg);
            padding: 8px 0;
          }
        }

        .compare-data-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .compare-item {
          padding: 8px;
          border-radius: 4px;
          border-left: 2px solid var(--border-color);
        }

        .compare-item.highlighted-success {
          background-color: rgba(40, 167, 69, 0.05);
          border-left-color: var(--color-success);
        }

        .compare-item-label {
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--text-secondary);
          display: block;
        }

        .compare-item-val-old {
          font-size: 0.8rem;
          color: var(--color-danger);
          text-decoration: line-through;
          margin-top: 2px;
        }

        .compare-item-val-new {
          font-size: 0.8rem;
          color: var(--color-success);
          font-weight: 600;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
