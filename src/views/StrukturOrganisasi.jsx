import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Network, UserCheck, UserMinus, Filter, X, Plus, Settings, Edit3, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import Swal from 'sweetalert2';

export default function StrukturOrganisasi() {
  const { currentUser, addNotification } = useAppStore();
  const [struktur, setStruktur] = useState([]);
  const [anggotaList, setAnggotaList] = useState([]);
  const [jabatanList, setJabatanList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedKelompok, setSelectedKelompok] = useState('');
  const [kelompokList, setKelompokList] = useState([]);
  const [selectedJabatanFilter, setSelectedJabatanFilter] = useState('');

  // Form states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showManageDivisiModal, setShowManageDivisiModal] = useState(false);
  const [selectedAnggota, setSelectedAnggota] = useState('');
  const [selectedJabatan, setSelectedJabatan] = useState('');
  const [selectedAssignKelompok, setSelectedAssignKelompok] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const structData = await api.get('/struktur');
      setStruktur(structData);

      const allMembers = await api.get('/anggota');
      setAnggotaList(allMembers);

      const uniqueKelompok = [...new Set(allMembers.map(m => m.kelompok).filter(Boolean))].sort();
      setKelompokList(uniqueKelompok);

      const allPositions = structData.map(s => ({
        id_jabatan: s.id_jabatan,
        nama_jabatan: s.nama_jabatan
      }));
      allPositions.push({ id_jabatan: '17', nama_jabatan: 'Anggota (Lepas Jabatan)' });
      setJabatanList(allPositions);
    } catch (e) {
      console.error('Gagal memuat data pengurus:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedAnggota || !selectedJabatan) {
      setErrorMsg('Pilih Anggota dan Jabatan terlebih dahulu!');
      setFormLoading(false);
      return;
    }

    if (selectedJabatan === '12' && !selectedAssignKelompok) {
      setErrorMsg('Pilih Kelompok terlebih dahulu untuk PJ Kelompok!');
      setFormLoading(false);
      return;
    }

    // Cek apakah jabatan sudah terisi (kecuali untuk ID 17 - Lepas Jabatan)
    if (selectedJabatan !== '17') {
      const targetPos = struktur.find(s => s.id_jabatan === selectedJabatan);
      if (targetPos && targetPos.assigned && targetPos.assigned.length > 0) {
        const currentNames = targetPos.assigned.map(a => a.nama_lengkap).join(', ');
        const confirm = await Swal.fire({
          title: 'Peringatan: Jabatan Terisi!',
          text: `Jabatan "${targetPos.nama_jabatan}" saat ini diduduki oleh: ${currentNames}. Apakah Anda yakin ingin menimpa penugasan ini?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Ya, Timpa Jabatan',
          cancelButtonText: 'Batal'
        });

        if (!confirm.isConfirmed) {
          setFormLoading(false);
          return;
        }
      }
    }

    try {
      await api.post('/struktur/assign', {
        id_anggota: selectedAnggota,
        id_jabatan: selectedJabatan,
        kelompok: selectedJabatan === '12' ? selectedAssignKelompok : undefined
      });
      setSuccessMsg('Penugasan pengurus berhasil dilakukan!');
      addNotification('Daftar pengurus organisasi telah diubah.');
      setSelectedAnggota('');
      setSelectedAnggota('');
      setSelectedJabatan('');
      setSelectedAssignKelompok('');
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengubah susunan pengurus');
    } finally {
      setFormLoading(false);
    }
  };

  // Handler untuk menambah jabatan/divisi baru
  const handleAddDivisi = async () => {
    const { value: namaDivisi } = await Swal.fire({
      title: 'Tambah Divisi / Jabatan Baru',
      input: 'text',
      inputPlaceholder: 'Contoh: Departemen IT',
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) return 'Nama divisi tidak boleh kosong!';
      }
    });

    if (namaDivisi) {
      try {
        await api.post('/struktur/jabatan', { nama_jabatan: namaDivisi });
        Swal.fire('Berhasil!', `Divisi "${namaDivisi}" berhasil ditambahkan.`, 'success');
        await loadData();
      } catch (err) {
        Swal.fire('Gagal', err.message || 'Gagal menambahkan divisi baru. Pastikan backend sudah memiliki endpoint ini.', 'error');
      }
    }
  };

  // Flatten all positions + assigned people into a list
  const buildKepengurusanList = () => {
    const list = [];
    struktur.forEach(pos => {
      if (pos.assigned && pos.assigned.length > 0) {
        pos.assigned.forEach(person => {
          const fullMember = anggotaList.find(a => a.id_anggota === person.id_anggota);
          list.push({
            id_jabatan: pos.id_jabatan,
            nama_jabatan: pos.nama_jabatan,
            nama_lengkap: person.nama_lengkap,
            no_ktm: person.no_ktm,
            no_kta: person.no_kta,
            id_anggota: person.id_anggota,
            foto_profil: fullMember?.foto_profil || '',
            kelompok: fullMember?.kelompok || ''
          });
        });
      }
    });
    return list;
  };

  const handleBebasTugaskan = async (id_anggota, nama_lengkap, nama_jabatan) => {
    const confirm = await Swal.fire({
      title: 'Bebas Tugaskan?',
      text: `Apakah Anda yakin ingin memberhentikan ${nama_lengkap} dari jabatan ${nama_jabatan}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, Bebas Tugaskan',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        await api.post('/struktur/assign', {
          id_anggota: id_anggota,
          id_jabatan: '17'
        });
        Swal.fire('Berhasil!', `${nama_lengkap} telah dibebastugaskan dari ${nama_jabatan}.`, 'success');
        addNotification(`Pengurus ${nama_lengkap} telah dibebastugaskan dari ${nama_jabatan}.`);
        await loadData();
      } catch (err) {
        Swal.fire('Gagal', err.message || 'Gagal membebastugaskan pengurus', 'error');
        setLoading(false);
      }
    }
  };

  const handleResetFilters = () => {
    setSelectedKelompok('');
    setSelectedJabatanFilter('');
  };

  const kepengurusanList = buildKepengurusanList();

  // Apply filters
  const filteredList = kepengurusanList.filter(item => {
    const kelompokMatch = !selectedKelompok || item.kelompok === selectedKelompok;
    const jabatanMatch = !selectedJabatanFilter || item.id_jabatan === selectedJabatanFilter;
    return kelompokMatch && jabatanMatch;
  });

  return (
    <div className="struktur-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="section-title" style={{ marginBottom: 0 }}>
          <Network size={20} /> Daftar Pengurus Organisasi
        </h3>
      </div>

      {/* FILTER CONTROLS */}
      <div className="premium-card filter-card" style={{ marginBottom: '24px', padding: '20px' }}>
        <h4 className="form-label" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
          <Filter size={14} style={{ display: 'inline', marginRight: '4px' }} />
          Filter Daftar Pengurus
        </h4>
        <div className="filter-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Filter Berdasarkan Jabatan</label>
            <select
              className="form-control"
              value={selectedJabatanFilter}
              onChange={(e) => setSelectedJabatanFilter(e.target.value)}
            >
              <option value="">-- Semua Jabatan --</option>
              {jabatanList
                .filter(j => j.id_jabatan !== '17') // Exclude 'Lepas Jabatan' from filter
                .map(j => (
                  <option key={`filter-${j.id_jabatan}`} value={j.id_jabatan}>
                    {j.nama_jabatan}
                  </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Filter Berdasarkan Kelompok</label>
            <select
              className="form-control"
              value={selectedKelompok}
              onChange={(e) => setSelectedKelompok(e.target.value)}
            >
              <option value="">-- Semua Kelompok --</option>
              {kelompokList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button 
            onClick={handleResetFilters} 
            className="btn-secondary btn-interactive"
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            Reset Filter
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="btn-primary btn-interactive"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <UserCheck size={16} /> Tugaskan Pengurus
            </button>
          )}
        </div>
      </div>

      {/* DAFTAR KEPENGURUSAN */}
      {loading ? (
        <div className="loading-state">
          <p>Memuat daftar pengurus...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="premium-card empty-state">
          <p>{kepengurusanList.length === 0 ? 'Belum ada data pengurus.' : 'Tidak ada pengurus yang cocok dengan kriteria filter.'}</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Menampilkan <strong>{filteredList.length}</strong> dari <strong>{kepengurusanList.length}</strong> total pengurus.
          </p>
          {/* TABLE VIEW (DESKTOP) */}
          <div className="desktop-only-table table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Pengurus</th>
                  <th>Jabatan</th>
                  <th style={{ textAlign: 'center' }}>Kelompok</th>
                  {isAdmin && <th style={{ textAlign: 'center' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, index) => (
                  <tr key={item.id_jabatan + '-' + (item.id_anggota || 'kosong')}>
                    <td data-label="No">{index + 1}</td>
                    <td data-label="Nama Pengurus" style={{ fontWeight: 600 }}>
                      {item.nama_lengkap}
                    </td>
                    <td data-label="Jabatan">
                      {item.nama_jabatan}
                    </td>
                    <td data-label="Kelompok" style={{ textAlign: 'center' }}>
                      <span className="badge-kelompok">
                        {item.kelompok || '-'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td data-label="Aksi" style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleBebasTugaskan(item.id_anggota, item.nama_lengkap, item.nama_jabatan)}
                          className="btn-interactive"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--color-danger)', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Bebas Tugaskan"
                        >
                          <UserMinus size={14} /> Bebas Tugaskan
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW */}
          <div className="mobile-cards-container" style={{ marginTop: '8px' }}>
            {filteredList.map((item, index) => (
              <div key={item.id_jabatan + '-' + (item.id_anggota || 'kosong')} className="mobile-table-card">
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Nama Pengurus</span>
                  <span className="mobile-table-card-value" style={{ fontWeight: 600 }}>
                    {item.nama_lengkap}
                  </span>
                </div>
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Kelompok</span>
                  <span className="mobile-table-card-value">
                    <span className="badge-kelompok">
                      {item.kelompok || '-'}
                    </span>
                  </span>
                </div>
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Jabatan</span>
                  <span className="mobile-table-card-value">
                    <span className="badge badge-jabatan" style={{ fontSize: '0.7rem' }}>
                      {item.nama_jabatan}
                    </span>
                  </span>
                </div>
                {isAdmin && (
                  <div className="mobile-table-card-row" style={{ marginTop: '8px', borderTop: 'none', padding: 0 }}>
                    <button
                      onClick={() => handleBebasTugaskan(item.id_anggota, item.nama_lengkap, item.nama_jabatan)}
                      className="btn-interactive"
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.8rem', borderRadius: '4px', backgroundColor: 'var(--color-danger)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <UserMinus size={16} /> Bebas Tugaskan
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL PENUGASAN PENGURUS */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <UserCheck size={20} /> Penugasan Sebagai Pengurus
              </h3>
              <button className="btn-interactive" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} onClick={() => setShowAssignModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit}>
              <div className="modal-body">
                {successMsg && (
                  <div className="badge badge-success w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px', display: 'block', textTransform: 'none' }}>
                    {successMsg}
                  </div>
                )}
                {errorMsg && (
                  <div className="badge badge-danger w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px', display: 'block', textTransform: 'none' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Pilih Anggota</label>
                  <select
                    className="form-control"
                    value={selectedAnggota}
                    onChange={(e) => setSelectedAnggota(e.target.value)}
                    disabled={formLoading}
                  >
                    <option value="">-- Pilih Nama Anggota --</option>
                    {anggotaList.map(a => (
                      <option key={a.id_anggota} value={a.id_anggota}>
                        {a.nama_lengkap} (KTM: {a.no_ktm} | JABATAN: {a.nama_jabatan})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Pilih Jabatan Pengurus</label>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setShowManageDivisiModal(true)}
                      className="btn-interactive"
                      style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                    >
                      <Settings size={12} /> Kelola Divisi
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDivisi}
                      className="btn-interactive"
                      style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                    >
                      <Plus size={12} /> Tambah Baru
                    </button>
                  </div>
                )}
                  </div>
                  <select
                    className="form-control"
                    value={selectedJabatan}
                    onChange={(e) => setSelectedJabatan(e.target.value)}
                    disabled={formLoading}
                  >
                    <option value="">-- Pilih Jabatan --</option>
                    {jabatanList.map(j => (
                      <option key={j.id_jabatan} value={j.id_jabatan}>
                        {j.nama_jabatan}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedJabatan === '12' && (
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">Pilih Kelompok</label>
                    <select
                      className="form-control"
                      value={selectedAssignKelompok}
                      onChange={(e) => setSelectedAssignKelompok(e.target.value)}
                      disabled={formLoading}
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
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">
                  Tutup
                </button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Menyimpan...' : 'Tugaskan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KELOLA DIVISI */}
      {showManageDivisiModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <Settings size={20} /> Kelola Divisi / Jabatan
              </h3>
              <button className="btn-interactive" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} onClick={() => setShowManageDivisiModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {jabatanList.filter(j => j.id_jabatan !== '17').length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Belum ada divisi yang terdaftar.</p>
                ) : (
                  jabatanList.filter(j => j.id_jabatan !== '17').map((j) => (
                    <div key={j.id_jabatan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{j.nama_jabatan}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditDivisi(j.id_jabatan, j.nama_jabatan)}
                          className="btn-interactive"
                          style={{ padding: '6px', fontSize: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--accent-secondary)', color: '#fff', border: 'none' }}
                          title="Edit Divisi"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteDivisi(j.id_jabatan, j.nama_jabatan)}
                          className="btn-interactive"
                          style={{ padding: '6px', fontSize: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--color-danger)', color: '#fff', border: 'none' }}
                          title="Hapus Divisi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowManageDivisiModal(false)} className="btn-secondary">
                Tutup
              </button>
            </div>
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
        .filter-card button {
          padding: 6px 12px !important;
          font-size: 0.7rem !important;
        }
        .filter-card h4 svg {
          width: 12px !important;
          height: 12px !important;
        }

        .assign-form {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .assign-form {
            flex-direction: column;
            align-items: stretch;
          }
          .assign-form button {
            align-self: auto !important;
            width: 100%;
          }
        }

        .filter-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }
        }

        .premium-table th,
        .premium-table td {
          padding: 6px 10px !important;
          font-size: 0.85rem !important;
        }

        @media (max-width: 768px) {
          .premium-table th,
          .premium-table td {
            padding: 8px 6px !important;
            font-size: 0.75rem !important;
            white-space: nowrap;
          }
        }

        .badge-kelompok {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px 10px;
          background-color: rgba(27, 54, 93, 0.08);
          color: var(--accent-primary);
          border-radius: 50px;
          font-size: 0.7rem;
          font-weight: 600;
          border: 1px solid rgba(27, 54, 93, 0.15);
        }

        [data-theme="dark"] .badge-kelompok {
          background-color: rgba(255, 215, 0, 0.1);
          color: var(--accent-secondary);
          border-color: rgba(255, 215, 0, 0.2);
        }

        .mobile-cards-container {
          display: none;
        }

        @media (max-width: 768px) {
          .desktop-only-table {
            display: none;
          }
          .mobile-cards-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
        }

        .loading-state, .empty-state {
          padding: 40px;
          text-align: center;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
