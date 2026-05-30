import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { MapPin, Search, HelpCircle, Trash2, Eye, X } from 'lucide-react';
import { api } from '../utils/api';
import Swal from 'sweetalert2';

export default function AlamatAnggota() {
  const { currentUser, addNotification } = useAppStore();
  const isAdmin = currentUser?.role === 'Admin';

  const [anggota, setAnggota] = useState([]);
  const [filteredAnggota, setFilteredAnggota] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailMember, setDetailMember] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Address filter states
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedKab, setSelectedKab] = useState('');
  const [selectedKec, setSelectedKec] = useState('');
  const [selectedDesa, setSelectedDesa] = useState('');

  // Options extracted dynamically from the database
  const [provList, setProvList] = useState([]);
  const [kabList, setKabList] = useState([]);
  const [kecList, setKecList] = useState([]);
  const [desaList, setDesaList] = useState([]);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/anggota');
      const finalData = currentUser?.role === 'PJKelompok' 
        ? data.filter(m => m.kelompok === currentUser.kelompok)
        : data;
      setAnggota(finalData);
      setFilteredAnggota(finalData);
      extractFilters(finalData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const extractFilters = (data) => {
    const provs = [...new Set(data.map(m => m.provinsi).filter(Boolean))];
    setProvList(provs);
  };

  // Address cascades logic
  useEffect(() => {
    if (!selectedProv) {
      setKabList([]);
      setSelectedKab('');
      return;
    }
    const kabs = [...new Set(
      anggota.filter(m => m.provinsi === selectedProv).map(m => m.kabupaten_kota).filter(Boolean)
    )];
    setKabList(kabs);
    setSelectedKab('');
  }, [selectedProv, anggota]);

  useEffect(() => {
    if (!selectedKab) {
      setKecList([]);
      setSelectedKec('');
      return;
    }
    const kecs = [...new Set(
      anggota.filter(m => m.provinsi === selectedProv && m.kabupaten_kota === selectedKab).map(m => m.kecamatan).filter(Boolean)
    )];
    setKecList(kecs);
    setSelectedKec('');
  }, [selectedKab, selectedProv, anggota]);

  useEffect(() => {
    if (!selectedKec) {
      setDesaList([]);
      setSelectedDesa('');
      return;
    }
    const desas = [...new Set(
      anggota.filter(m => m.provinsi === selectedProv && m.kabupaten_kota === selectedKab && m.kecamatan === selectedKec).map(m => m.desa).filter(Boolean)
    )];
    setDesaList(desas);
    setSelectedDesa('');
  }, [selectedKec, selectedKab, selectedProv, anggota]);

  // Combined filtering logic for search and address
  useEffect(() => {
    let results = anggota;

    const term = searchTerm.toLowerCase().trim();
    if (term) {
      results = results.filter(m => 
        m.nama_lengkap && m.nama_lengkap.toLowerCase().includes(term)
      );
    }

    if (selectedProv) results = results.filter(m => m.provinsi === selectedProv);
    if (selectedKab) results = results.filter(m => m.kabupaten_kota === selectedKab);
    if (selectedKec) results = results.filter(m => m.kecamatan === selectedKec);
    if (selectedDesa) results = results.filter(m => m.desa === selectedDesa);

    setFilteredAnggota(results);
    setCurrentPage(1);
  }, [searchTerm, selectedProv, selectedKab, selectedKec, selectedDesa, anggota]);

  const handleResetFilters = () => {
    setSelectedProv('');
    setSelectedKab('');
    setSelectedKec('');
    setSelectedDesa('');
    setSearchTerm('');
    setFilteredAnggota(anggota);
    setSelectedIds([]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAnggota.map(m => m.id_anggota));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: `Anda akan menghapus ${selectedIds.length} data anggota secara permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        await api.post('/anggota/delete-masal', { ids: selectedIds });
        Swal.fire('Terhapus!', `${selectedIds.length} data anggota berhasil dihapus.`, 'success');
        setSelectedIds([]);
        loadMembers();
      } catch (e) {
        Swal.fire('Gagal!', e.message || 'Gagal menghapus anggota', 'error');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAnggota.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnggota.length / itemsPerPage);

  const handlePageChange = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  return (
    <div className="alamat-keahlian-view">
      <h3 className="section-title">
        <MapPin size={20} style={{ marginRight: '8px', display: 'inline', verticalAlign: 'middle' }} />
        Pencarian Alamat Anggota
      </h3>

      {/* FILTER CONTROLLERS */}
      <div className="premium-card filter-card" style={{ marginBottom: '24px' }}>
        <div className="form-group" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
          <label className="form-label">Pencarian Cepat Nama Anggota</label>
          <div className="search-bar-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="form-control padded-left"
              placeholder="Ketik nama anggota untuk mencari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* CASCADE SELECT FOR ADDRESS */}
        <div className="cascading-grid">
          <div className="form-group">
            <label className="form-label">Provinsi</label>
            <select
              className="form-control"
              value={selectedProv}
              onChange={(e) => setSelectedProv(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Semua Provinsi --</option>
              {provList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Kabupaten / Kota</label>
            <select
              className="form-control"
              value={selectedKab}
              onChange={(e) => setSelectedKab(e.target.value)}
              disabled={!selectedProv || loading}
            >
              <option value="">-- Semua Kabupaten --</option>
              {kabList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Kecamatan</label>
            <select
              className="form-control"
              value={selectedKec}
              onChange={(e) => setSelectedKec(e.target.value)}
              disabled={!selectedKab || loading}
            >
              <option value="">-- Semua Kecamatan --</option>
              {kecList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Desa / Kelurahan</label>
            <select
              className="form-control"
              value={selectedDesa}
              onChange={(e) => setSelectedDesa(e.target.value)}
              disabled={!selectedKec || loading}
            >
              <option value="">-- Semua Desa --</option>
              {desaList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <button 
          onClick={handleResetFilters} 
          className="btn-secondary btn-interactive"
          style={{ marginTop: '16px', fontSize: '0.8rem', padding: '8px 16px' }}
        >
          Reset Filter Pencarian
        </button>
      </div>

      {/* SEARCH RESULTS */}
      {loading ? (
        <div className="loading-state">
          <p>Mencari anggota...</p>
        </div>
      ) : filteredAnggota.length === 0 ? (
        <div className="premium-card empty-state">
          <HelpCircle size={32} style={{ marginBottom: '12px', color: 'var(--text-secondary)' }} />
          <p>Tidak ada anggota ditemukan dengan filter pencarian tersebut.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Ditemukan <strong>{filteredAnggota.length}</strong> anggota yang sesuai kriteria.
            </p>
            {isAdmin && selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="btn-interactive"
                disabled={isDeleting}
                style={{ 
                  backgroundColor: 'var(--color-danger)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} style={{ marginRight: '6px' }} />
                {isDeleting ? 'Menghapus...' : `Hapus ${selectedIds.length} Terpilih`}
              </button>
            )}
          </div>

          {/* DESKTOP TABLE */}
          <div className="desktop-only-table table-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredAnggota.length > 0 && selectedIds.length === filteredAnggota.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                  )}
                  <th>No</th>
                  <th>Nama Anggota</th>
                  <th>Alamat Jalan</th>
                  <th>Desa</th>
                  <th>Kecamatan</th>
                  <th>Kabupaten/Kota</th>
                  <th>Provinsi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((member, index) => (
                  <tr key={member.id_anggota}>
                    {isAdmin && (
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(member.id_anggota)}
                          onChange={(e) => handleSelectOne(e, member.id_anggota)}
                        />
                      </td>
                    )}
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td style={{ fontWeight: '600' }}>{member.nama_lengkap}</td>
                    <td>{member.alamat_jalan || '-'}</td>
                    <td>{member.desa || '-'}</td>
                    <td>{member.kecamatan || '-'}</td>
                    <td>{member.kabupaten_kota || '-'}</td>
                    <td>{member.provinsi || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="mobile-cards-container">
            {currentItems.map((member, index) => (
              <div key={member.id_anggota} className="mobile-table-card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    {isAdmin && (
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(member.id_anggota)}
                        onChange={(e) => handleSelectOne(e, member.id_anggota)}
                        style={{ width: '16px', height: '16px', flexShrink: 0 }}
                      />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.nama_lengkap}</span>
                  </div>
                  <button
                    onClick={() => setDetailMember(member)}
                    className="btn-interactive"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 12px', fontSize: '0.72rem', fontWeight: 600,
                      backgroundColor: 'var(--accent-primary)', color: '#fff',
                      border: 'none', borderRadius: '6px', cursor: 'pointer',
                      whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >
                    <Eye size={13} /> Detail
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DETAIL ALAMAT POPUP (MOBILE) */}
          {detailMember && (
            <div className="modal-overlay" onClick={() => setDetailMember(null)}>
              <div className="modal-content alamat-detail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <div className="modal-header">
                  <h3 className="section-title" style={{ marginBottom: 0, fontSize: '0.95rem' }}>
                    <MapPin size={18} /> Detail Alamat
                  </h3>
                  <button className="btn-interactive" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} onClick={() => setDetailMember(null)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body" style={{ padding: '16px 20px' }}>
                  <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nama Anggota</span>
                    <p style={{ fontWeight: 700, fontSize: '1rem', marginTop: '4px' }}>{detailMember.nama_lengkap}</p>
                  </div>
                  <div className="alamat-detail-grid">
                    <div className="alamat-detail-item">
                      <span className="alamat-detail-label">Alamat Jalan</span>
                      <span className="alamat-detail-value">{detailMember.alamat_jalan || '-'}</span>
                    </div>
                    <div className="alamat-detail-item">
                      <span className="alamat-detail-label">Desa / Kelurahan</span>
                      <span className="alamat-detail-value">{detailMember.desa || '-'}</span>
                    </div>
                    <div className="alamat-detail-item">
                      <span className="alamat-detail-label">Kecamatan</span>
                      <span className="alamat-detail-value">{detailMember.kecamatan || '-'}</span>
                    </div>
                    <div className="alamat-detail-item">
                      <span className="alamat-detail-label">Kabupaten / Kota</span>
                      <span className="alamat-detail-value">{detailMember.kabupaten_kota || '-'}</span>
                    </div>
                    <div className="alamat-detail-item">
                      <span className="alamat-detail-label">Provinsi</span>
                      <span className="alamat-detail-value">{detailMember.provinsi || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button onClick={() => setDetailMember(null)} className="btn-secondary" style={{ width: '100%' }}>Tutup</button>
                </div>
              </div>
            </div>
          )}

          {/* PAGINATION PANEL */}
          {totalPages > 1 && (
            <div className="pagination-wrapper">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn btn-interactive"
              >
                Sebelumnya
              </button>
              
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    onClick={() => handlePageChange(num)}
                    className={`pagination-num-btn btn-interactive ${currentPage === num ? 'active' : ''}`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn btn-interactive"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </>
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
        .filter-card .form-control.padded-left {
          padding-left: 28px !important;
        }
        .filter-card .search-icon {
          width: 12px !important;
          height: 12px !important;
          left: 10px !important;
        }
        .filter-card button {
          padding: 6px 12px !important;
          font-size: 0.7rem !important;
          margin-top: 8px !important;
        }

        .cascading-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .cascading-grid .form-group {
          margin-bottom: 0;
        }

        @media (max-width: 900px) {
          .cascading-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {
          .cascading-grid {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }

        .filter-card {
          padding: 20px !important;
          background-color: var(--bg-secondary);
        }

        .search-bar-wrapper {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
        }

        .form-control.padded-left {
          padding-left: 48px;
        }

        .pagination-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 12px;
        }

        .pagination-btn {
          padding: 8px 16px;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-numbers {
          display: flex;
          gap: 6px;
        }

        .pagination-num-btn {
          width: 36px;
          height: 36px;
          background: none;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.85rem;
        }

        .pagination-num-btn.active {
          background-color: var(--accent-primary);
          color: #FFFFFF;
          border-color: var(--accent-primary);
        }

        [data-theme="dark"] .pagination-num-btn.active {
          background-color: var(--accent-secondary);
          color: #112240;
          border-color: var(--accent-secondary);
        }

        .mobile-cards-container {
          display: none;
        }

        .alamat-detail-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .alamat-detail-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .alamat-detail-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .alamat-detail-value {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
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
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
