import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Award, Search, HelpCircle, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import Swal from 'sweetalert2';

export default function KeahlianAnggota() {
  const { currentUser, addNotification } = useAppStore();
  const isAdmin = currentUser?.role === 'Admin';

  const [anggota, setAnggota] = useState([]);
  const [filteredAnggota, setFilteredAnggota] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Skill filter states
  const [selectedSkill, setSelectedSkill] = useState('');

  // Options extracted dynamically from the database
  const [skillList, setSkillList] = useState([]);

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
    const skills = [...new Set(
      data.flatMap(m => [m.keahlian_1, m.keahlian_2]).filter(Boolean)
    )];
    setSkillList(skills);
  };

  // Combined filtering logic for search and skills
  useEffect(() => {
    let results = anggota;

    const term = searchTerm.toLowerCase().trim();
    if (term) {
      results = results.filter(m => 
        m.nama_lengkap && m.nama_lengkap.toLowerCase().includes(term)
      );
    }

    if (selectedSkill) {
      const lowercasedSkill = selectedSkill.toLowerCase();
      results = results.filter(m => 
        (m.keahlian_1 && m.keahlian_1.toLowerCase() === lowercasedSkill) || 
        (m.keahlian_2 && m.keahlian_2.toLowerCase() === lowercasedSkill)
      );
    }

    setFilteredAnggota(results);
    setCurrentPage(1);
  }, [searchTerm, selectedSkill, anggota]);

  const handleResetFilters = () => {
    setSelectedSkill('');
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
        <Award size={20} style={{ marginRight: '8px', display: 'inline', verticalAlign: 'middle' }} />
        Pencarian Skill & Keahlian
      </h3>

      {/* FILTER CONTROLLERS */}
      <div className="premium-card filter-card" style={{ marginBottom: '24px' }}>
        <div className="form-group search-section">
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

        {/* DROPDOWN FOR SKILLS */}
        <div style={{ maxWidth: '400px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Spesifikasi Keahlian</label>
            <select
              className="form-control"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Semua Bidang Keahlian --</option>
              {skillList.map(s => <option key={s} value={s}>{s}</option>)}
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
                  <th>Nomor KTM</th>
                  <th>Nomor KTA</th>
                  <th>Keahlian Utama</th>
                  <th>Keahlian Penunjang</th>
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
                    <td>{member.no_ktm}</td>
                    <td>{member.no_kta}</td>
                    <td style={{ fontWeight: '500', color: 'var(--accent-primary)' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        {member.keahlian_1 || '-'}
                      </span>
                    </td>
                    <td>{member.keahlian_2 || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="mobile-cards-container">
            {currentItems.map((member, index) => (
              <div key={member.id_anggota} className="mobile-table-card">
                {isAdmin && (
                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <input 
                      type="checkbox"
                      id={`mob-chk-${member.id_anggota}`}
                      checked={selectedIds.includes(member.id_anggota)}
                      onChange={(e) => handleSelectOne(e, member.id_anggota)}
                      style={{ marginRight: '8px', width: '16px', height: '16px' }}
                    />
                    <label htmlFor={`mob-chk-${member.id_anggota}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      Pilih Anggota ini
                    </label>
                  </div>
                )}
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Nama Anggota</span>
                  <span className="mobile-table-card-value" style={{ fontWeight: 600 }}>{member.nama_lengkap}</span>
                </div>
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">KTM / KTA</span>
                  <span className="mobile-table-card-value">{member.no_ktm} / {member.no_kta}</span>
                </div>
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Keahlian Utama</span>
                  <span className="mobile-table-card-value">
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{member.keahlian_1 || '-'}</span>
                  </span>
                </div>
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Keahlian Penunjang</span>
                  <span className="mobile-table-card-value">{member.keahlian_2 || '-'}</span>
                </div>
              </div>
            ))}
          </div>

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
        .filter-card.premium-card {
          background-color: var(--bg-secondary);
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

        .search-section {
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 20px;
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
        .search-section {
          margin-bottom: 8px !important;
          padding-bottom: 8px !important;
        }
        }
      `}</style>
    </div>
  );
}
