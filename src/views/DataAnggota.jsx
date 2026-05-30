import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Search, Eye, X, Filter, Trash2, Download, Upload, Edit3, Image as ImageIcon, RotateCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/api';
import Swal from 'sweetalert2';
import Cropper from 'react-easy-crop';

export default function DataAnggota() {
  const { currentUser } = useAppStore();
  const isAdmin = currentUser?.role === 'Admin';

  const [anggota, setAnggota] = useState([]);
  const [filteredAnggota, setFilteredAnggota] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelompok, setSelectedKelompok] = useState('');
  const [kelompokList, setKelompokList] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // State untuk fitur edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // States for Image Cropper
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
    } catch (e) {
      console.error('Gagal memuat data anggota:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const uniqueKelompok = [...new Set(anggota.map(m => m.kelompok).filter(Boolean))];
    setKelompokList(uniqueKelompok);
  }, [anggota]);

  // Handler untuk membuka modal edit
  const handleEditClick = (anggota) => {
    setEditForm({ ...anggota });
    setShowEditModal(true);
  };

  // Handler untuk upload foto 
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
    e.target.value = null; // Reset input
  };

  const handleCropComplete = async () => {
    try {
      const image = new Image();
      image.src = cropImageSrc;
      await new Promise((resolve) => (image.onload = resolve));

      // Buat kanvas pertama untuk menangani rotasi gambar
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

      // Buat kanvas akhir untuk memotong (crop) dan meresize sesuai kotak
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

  // Submit data editan ke Backend
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsEditing(true);
    try {
      const response = await api.put(`/anggota/${editForm.id_anggota}`, editForm);
      Swal.fire('Berhasil!', 'Data profil anggota berhasil diperbarui!', 'success');
      setShowEditModal(false);
      loadMembers(); // Refresh tabel setelah edit selesai
      
      // Jika admin mengedit biodatanya sendiri, perbarui state global seketika
      if (currentUser?.id_anggota === editForm.id_anggota) {
        useAppStore.setState({ currentUser: { ...currentUser, ...editForm } });
        localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...editForm }));
      }
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memperbarui data: ' + error.message, 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteMember = async (id, nama) => {
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: `Data anggota "${nama}" akan dihapus secara permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/anggota/${id}`);
        Swal.fire('Terhapus!', 'Data anggota berhasil dihapus.', 'success');
        // Reload data after successful deletion
        loadMembers();
      } catch (e) {
        console.error('Gagal menghapus anggota:', e);
        Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus anggota.', 'error');
      }
    }
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
        console.error('Gagal menghapus anggota masal:', e);
        Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus anggota.', 'error');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Filter members dynamically when search or base list changes
  useEffect(() => {
    let results = anggota;

    if (selectedKelompok) {
      results = results.filter(m => m.kelompok === selectedKelompok);
    }

    const term = searchTerm.toLowerCase().trim();
    if (term) {
      results = results.filter(m => 
        (m.nama_lengkap && m.nama_lengkap.toLowerCase().includes(term)) ||
        (m.no_ktm && m.no_ktm.includes(term)) ||
        (m.no_kta && m.no_kta.includes(term)) ||
        (m.id_anggota_ikhwaan && m.id_anggota_ikhwaan.toLowerCase().includes(term)) ||
        (m.desa && m.desa.toLowerCase().includes(term)) ||
        (m.kecamatan && m.kecamatan.toLowerCase().includes(term)) ||
        (m.kelompok && m.kelompok.toLowerCase().includes(term))
      );
    }

    setFilteredAnggota(results);
    setCurrentPage(1); // Reset to page 1 on search
    setSelectedIds([]); // Reset selection when filtering changes
  }, [searchTerm, selectedKelompok, anggota]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAnggota.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnggota.length / itemsPerPage);

  const handlePageChange = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      "Nama Lengkap": "Contoh Fulan",
      "ID Ikhwan": "IKH-000",
      "No KTM": "12345",
      "No KTA": "67890",
      "Passkey (Opsional)": "123456",
      "No Telp": "08123456789",
      "Tempat Lahir": "Jombang",
      "Tanggal Lahir (YYYY-MM-DD)": "1990-01-01",
      "Alamat Jalan": "Jl. Raya No. 1",
      "Desa": "Losari",
      "Kecamatan": "Ploso",
      "Kabupaten Kota": "Jombang",
      "Provinsi": "Jawa Timur",
      "Pekerjaan": "Wiraswasta",
      "Kegiatan": "Ngaji",
      "Instansi": "Yayasan",
      "Kelompok": "Pusat",
      "Keahlian Utama": "IT",
      "Keahlian Penunjang": "Desain",
      "Organisasi Shiddiqiyyah": "OPSHID",
      "Tanggal Pendasaran (YYYY-MM-DD)": "2010-01-01",
      "Pemberi Pendasaran": "Kiai Moch. Mukhtar Mu'thi"
    }];

    const petunjukData = [
      { "Kolom": "Nama Lengkap", "Keterangan": "Wajib diisi. Nama lengkap anggota sesuai identitas." },
      { "Kolom": "ID Ikhwan", "Keterangan": "Opsional. Nomor ID Ikhwan 9 anggota." },
      { "Kolom": "No KTM", "Keterangan": "Wajib diisi. Nomor Kartu Tanda Mahasiswa / Anggota. (Digunakan sebagai Username Login)" },
      { "Kolom": "No KTA", "Keterangan": "Wajib diisi. Nomor Kartu Tanda Anggota. (Digunakan sebagai Username Login)" },
      { "Kolom": "Passkey (Opsional)", "Keterangan": "Opsional. 6 digit angka untuk sandi aplikasi. Jika dikosongkan, anggota membuat sandi sendiri saat login perdana." },
      { "Kolom": "Tanggal Lahir (YYYY-MM-DD)", "Keterangan": "Format wajib menggunakan YYYY-MM-DD (contoh: 1990-01-01)." },
      { "Kolom": "Tanggal Pendasaran (YYYY-MM-DD)", "Keterangan": "Format wajib menggunakan YYYY-MM-DD (contoh: 2010-01-01)." }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const colWidths = Object.keys(templateData[0]).map(key => ({ wch: key.length + 5 }));
    ws['!cols'] = colWidths;

    const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData);
    wsPetunjuk['!cols'] = [{ wch: 35 }, { wch: 100 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format_Anggota");
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk_Pengisian");
    XLSX.writeFile(wb, "Template_Import_Anggota.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          Swal.fire('Gagal', 'File Excel kosong atau format tidak sesuai', 'error');
          setIsUploading(false);
          return;
        }

        const formattedData = rows.map(row => ({
          nama_lengkap: String(row["Nama Lengkap"] || ""),
          id_anggota_ikhwaan: String(row["ID Ikhwan"] || ""),
          no_ktm: String(row["No KTM"] || ""),
          no_kta: String(row["No KTA"] || ""),
          no_telp: String(row["No Telp"] || ""),
          tempat_lahir: String(row["Tempat Lahir"] || ""),
          tanggal_lahir: String(row["Tanggal Lahir (YYYY-MM-DD)"] || ""),
          alamat_jalan: String(row["Alamat Jalan"] || ""),
          desa: String(row["Desa"] || ""),
          kecamatan: String(row["Kecamatan"] || ""),
          kabupaten_kota: String(row["Kabupaten Kota"] || ""),
          provinsi: String(row["Provinsi"] || ""),
          pekerjaan: String(row["Pekerjaan"] || ""),
          kegiatan: String(row["Kegiatan"] || ""),
          instansi: String(row["Instansi"] || ""),
          kelompok: String(row["Kelompok"] || ""),
          keahlian_1: String(row["Keahlian Utama"] || ""),
          keahlian_2: String(row["Keahlian Penunjang"] || ""),
          org_shiddiqiyyah: String(row["Organisasi Shiddiqiyyah"] || ""),
          tanggal_pendasaran: String(row["Tanggal Pendasaran (YYYY-MM-DD)"] || ""),
          pemberi_pendasaran: String(row["Pemberi Pendasaran"] || ""),
          id_jabatan: "17",
          passkey: String(row["Passkey (Opsional)"] || row["Passkey"] || "").replace(/\D/g, '').substring(0, 6)
        })).filter(m => m.no_ktm && m.no_kta && m.nama_lengkap); // Filter baris yg kosong

        if (formattedData.length === 0) {
          Swal.fire('Gagal', 'Tidak ada baris valid ditemukan. Pastikan kolom Nama, KTM, dan KTA terisi.', 'warning');
          setIsUploading(false);
          return;
        }

        const res = await api.post('/anggota/import', { members: formattedData });
        Swal.fire('Selesai', res.message || 'Import data telah berhasil.', 'success');
        loadMembers();
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Terjadi kesalahan saat memproses file Excel.', 'error');
      } finally {
        setIsUploading(false);
        e.target.value = null; // Reset input
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="data-anggota-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="section-title" style={{ marginBottom: 0 }}>
          <UsersIcon size={20} /> Master Database Biodata Anggota
        </h3>
      </div>

      {/* Control panel: Search & Filters */}
      <div className="premium-card control-panel" style={{ marginBottom: '24px', padding: '16px' }}>
        <div className="filter-controls-grid">
          <div className="search-bar-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="form-control padded-left"
              placeholder="Cari anggota berdasarkan Nama, KTM, KTA, ID Ikhwan, atau Alamat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="search-bar-wrapper">
            <Filter size={18} className="search-icon" />
            <select
              className="form-control padded-left"
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
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Memuat database anggota...</p>
        </div>
      ) : filteredAnggota.length === 0 ? (
        <div className="premium-card empty-state">
          <p>Tidak ada data anggota yang cocok dengan kriteria pencarian.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Ditemukan <strong>{filteredAnggota.length}</strong> data anggota.
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {isAdmin && (
                <>
                  <button onClick={handleDownloadTemplate} className="btn-secondary btn-interactive" style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', borderRadius: '4px' }}>
                    <Download size={16} style={{ marginRight: '6px' }} /> Template Excel
                  </button>
                  <label className="btn-gold btn-interactive" style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', cursor: 'pointer', borderRadius: '4px', margin: 0, opacity: isUploading ? 0.7 : 1 }}>
                    <Upload size={16} style={{ marginRight: '6px' }} /> {isUploading ? 'Memproses...' : 'Import Excel'}
                    <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </>
              )}
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
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="desktop-only-table table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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
                  <th>Nama Lengkap</th>
                  <th style={{ textAlign: 'center' }}>Kelompok</th>
                  <th style={{ textAlign: 'center' }}>Jabatan Pengurus</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
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
                    <td style={{ fontWeight: '500' }}>{member.nama_lengkap}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-kelompok">
                        {member.kelompok || '-'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-jabatan" style={{ fontSize: '0.7rem', display: 'inline-flex', justifyContent: 'center' }}>
                        {member.nama_jabatan}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedMember(member)}
                          className="btn-primary btn-interactive"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px' }}
                          title="Lihat Detail"
                        >
                          <Eye size={12} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleEditClick(member)}
                            className="btn-gold btn-interactive"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px' }}
                            title="Edit Anggota"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMember(member.id_anggota, member.nama_lengkap)}
                          className="btn-interactive"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px', backgroundColor: '#dc3545', color: '#fff', border: 'none' }}
                          title="Hapus Anggota"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW */}
          <div className="mobile-cards-container">
            {currentItems.map((member, index) => (
              <div key={member.id_anggota} className="mobile-table-card">
                {isAdmin && (
                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <input 
                      type="checkbox"
                      id={`mob-chk-anggota-${member.id_anggota}`}
                      checked={selectedIds.includes(member.id_anggota)}
                      onChange={(e) => handleSelectOne(e, member.id_anggota)}
                      style={{ marginRight: '8px', width: '16px', height: '16px' }}
                    />
                    <label htmlFor={`mob-chk-anggota-${member.id_anggota}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      Pilih Anggota ini
                    </label>
                  </div>
                )}
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Nama Lengkap</span>
                  <span className="mobile-table-card-value" style={{ fontWeight: 600 }}>{member.nama_lengkap}</span>
                </div>
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Kelompok</span>
                  <span className="mobile-table-card-value">
                    <span className="badge-kelompok">
                      {member.kelompok || '-'}
                    </span>
                  </span>
                </div>
                <div className="mobile-table-card-row">
                  <span className="mobile-table-card-label">Jabatan Pengurus</span>
                  <span className="mobile-table-card-value">
                    <span className="badge badge-jabatan" style={{ fontSize: '0.7rem' }}>
                      {member.nama_jabatan}
                    </span>
                  </span>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedMember(member)}
                    className="btn-primary btn-interactive"
                    style={{ padding: '8px', fontSize: '0.75rem', borderRadius: '4px', flex: 1, display: 'flex', justifyContent: 'center' }}
                    title="Lihat Detail"
                  >
                    <Eye size={14} />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleEditClick(member)}
                      className="btn-gold btn-interactive"
                      style={{ padding: '8px', fontSize: '0.75rem', borderRadius: '4px', flex: 1, display: 'flex', justifyContent: 'center' }}
                      title="Edit Anggota"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMember(member.id_anggota, member.nama_lengkap)}
                    className="btn-interactive"
                    style={{ padding: '8px', fontSize: '0.75rem', borderRadius: '4px', backgroundColor: '#dc3545', color: '#fff', border: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}
                    title="Hapus Anggota"
                  >
                    <Trash2 size={14} />
                  </button>
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

      {/* =======================================================
          MODAL: VIEW FULL BIODATA DETAILS
          ======================================================= */}
      {selectedMember && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <UsersIcon size={20} />
                Detail Biodata Anggota
              </h3>
              <button className="btn-interactive" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} onClick={() => setSelectedMember(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              
              {/* Foto Profil Preview */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div 
                  onClick={() => selectedMember.foto_profil && setShowPhotoPreview(true)}
                  style={{
                  width: '90px', height: '90px', borderRadius: '50%', border: '2px solid var(--border-color)',
                  margin: '0 auto', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'var(--bg-secondary)', cursor: selectedMember.foto_profil ? 'pointer' : 'default'
                }}>
                  {selectedMember.foto_profil ? (
                    <img src={selectedMember.foto_profil} alt="Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={32} color="var(--text-secondary)" />
                  )}
                </div>
                {selectedMember.foto_profil && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>Klik foto untuk memperbesar</span>}
              </div>

              <div className="profile-details-grid">
                <div className="profile-data-item">
                  <span className="profile-data-label">Nama Lengkap</span>
                  <span className="profile-data-value">{selectedMember.nama_lengkap}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">ID Ikhwan</span>
                  <span className="profile-data-value" style={{ fontWeight: 600 }}>{selectedMember.id_anggota_ikhwaan || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Nomor KTM</span>
                  <span className="profile-data-value">{selectedMember.no_ktm}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Nomor KTA</span>
                  <span className="profile-data-value">{selectedMember.no_kta}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Nomor Telepon</span>
                  <span className="profile-data-value">{selectedMember.no_telp || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Tempat / Tanggal Lahir</span>
                  <span className="profile-data-value">
                    {selectedMember.tempat_lahir || '-'}, {selectedMember.tanggal_lahir || '-'}
                  </span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Alamat Jalan</span>
                  <span className="profile-data-value">{selectedMember.alamat_jalan || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Desa</span>
                  <span className="profile-data-value">{selectedMember.desa || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Kecamatan</span>
                  <span className="profile-data-value">{selectedMember.kecamatan || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Kabupaten / Kota</span>
                  <span className="profile-data-value">{selectedMember.kabupaten_kota || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Provinsi</span>
                  <span className="profile-data-value">{selectedMember.provinsi || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Pekerjaan</span>
                  <span className="profile-data-value">{selectedMember.pekerjaan || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Kegiatan</span>
                  <span className="profile-data-value">{selectedMember.kegiatan || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Instansi</span>
                  <span className="profile-data-value">{selectedMember.instansi || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Kelompok</span>
                  <span className="profile-data-value">{selectedMember.kelompok || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Keahlian (1 & 2)</span>
                  <span className="profile-data-value">
                    {selectedMember.keahlian_1 || '-'} {selectedMember.keahlian_2 ? `& ${selectedMember.keahlian_2}` : ''}
                  </span>
                </div>
                <div className="profile-data-item" style={{ gridColumn: 'span 2' }}>
                  <span className="profile-data-label">Organisasi Shiddiqiyyah</span>
                  <span className="profile-data-value">{selectedMember.org_shiddiqiyyah || '-'}</span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Jabatan Pengurus</span>
                  <span className="profile-data-value badge badge-jabatan" style={{ display: 'inline-block' }}>
                    {selectedMember.nama_jabatan}
                  </span>
                </div>
                <div className="profile-data-item">
                  <span className="profile-data-label">Tanggal Pendasaran</span>
                  <span className="profile-data-value">{selectedMember.tanggal_pendasaran || '-'}</span>
                </div>
                <div className="profile-data-item" style={{ gridColumn: 'span 2' }}>
                  <span className="profile-data-label">Pemberi Pendasaran</span>
                  <span className="profile-data-value">{selectedMember.pemberi_pendasaran || '-'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setSelectedMember(null)} className="btn-secondary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}



      {/* =======================================================
          MODAL: EDIT PROFIL (ADMIN)
          ======================================================= */}
      {showEditModal && editForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <Edit3 size={20} /> Edit Master Data Anggota
              </h3>
              <button className="btn-interactive" style={{ background: 'none', border: 'none' }} onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                
                {/* Bagian Upload Foto */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    width: '120px', height: '120px', borderRadius: '50%', border: '2px dashed var(--border-color)',
                    margin: '0 auto 12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--bg-secondary)'
                  }}>
                    {editForm.foto_profil ? (
                      <img src={editForm.foto_profil} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={40} color="var(--text-secondary)" />
                    )}
                  </div>
                  <label className="btn-secondary btn-interactive" style={{ display: 'inline-block', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}>
                    Pilih Foto Baru
                    <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  </label>
                </div>

                {/* Form Input Text */}
                <div className="profile-details-grid">
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap <span style={{color: 'var(--color-danger)'}}>*</span></label>
                    <input type="text" className="form-control" value={editForm.nama_lengkap || ''} onChange={e => setEditForm({...editForm, nama_lengkap: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor KTM</label>
                    <input type="text" className="form-control" value={editForm.no_ktm || ''} onChange={e => setEditForm({...editForm, no_ktm: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor KTA</label>
                    <input type="text" className="form-control" value={editForm.no_kta || ''} onChange={e => setEditForm({...editForm, no_kta: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ID Ikhwan</label>
                    <input type="text" className="form-control" value={editForm.id_anggota_ikhwaan || ''} onChange={e => setEditForm({...editForm, id_anggota_ikhwaan: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor Telepon <span style={{color: 'var(--color-danger)'}}>*</span></label>
                    <input type="text" className="form-control" value={editForm.no_telp || ''} onChange={e => setEditForm({...editForm, no_telp: e.target.value.replace(/\D/g, '')})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tempat Lahir <span style={{color: 'var(--color-danger)'}}>*</span></label>
                    <input type="text" className="form-control" value={editForm.tempat_lahir || ''} onChange={e => setEditForm({...editForm, tempat_lahir: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Lahir <span style={{color: 'var(--color-danger)'}}>*</span></label>
                    <input type="date" className="form-control" value={editForm.tanggal_lahir || ''} onChange={e => setEditForm({...editForm, tanggal_lahir: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Alamat Jalan <span style={{color: 'var(--color-danger)'}}>*</span></label>
                    <input type="text" className="form-control" value={editForm.alamat_jalan || ''} onChange={e => setEditForm({...editForm, alamat_jalan: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Desa <span style={{color: 'var(--color-danger)'}}>*</span></label>
                    <input type="text" className="form-control" value={editForm.desa || ''} onChange={e => setEditForm({...editForm, desa: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kecamatan <span style={{color: 'var(--color-danger)'}}>*</span></label>
                    <input type="text" className="form-control" value={editForm.kecamatan || ''} onChange={e => setEditForm({...editForm, kecamatan: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kabupaten Kota <span style={{color: 'var(--color-danger)'}}>*</span></label>
                    <input type="text" className="form-control" value={editForm.kabupaten_kota || ''} onChange={e => setEditForm({...editForm, kabupaten_kota: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Provinsi <span style={{color: 'var(--color-danger)'}}>*</span></label>
                    <input type="text" className="form-control" value={editForm.provinsi || ''} onChange={e => setEditForm({...editForm, provinsi: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pekerjaan</label>
                    <input type="text" className="form-control" value={editForm.pekerjaan || ''} onChange={e => setEditForm({...editForm, pekerjaan: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kegiatan</label>
                    <input type="text" className="form-control" value={editForm.kegiatan || ''} onChange={e => setEditForm({...editForm, kegiatan: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Instansi</label>
                    <input type="text" className="form-control" value={editForm.instansi || ''} onChange={e => setEditForm({...editForm, instansi: e.target.value})} />
                  </div>
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
                  <div className="form-group">
                    <label className="form-label">Keahlian Utama</label>
                    <input type="text" className="form-control" value={editForm.keahlian_1 || ''} onChange={e => setEditForm({...editForm, keahlian_1: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Keahlian Penunjang</label>
                    <input type="text" className="form-control" value={editForm.keahlian_2 || ''} onChange={e => setEditForm({...editForm, keahlian_2: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organisasi Shiddiqiyyah</label>
                    <input type="text" className="form-control" value={editForm.org_shiddiqiyyah || ''} onChange={e => setEditForm({...editForm, org_shiddiqiyyah: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Pendasaran</label>
                    <input type="date" className="form-control" value={editForm.tanggal_pendasaran || ''} onChange={e => setEditForm({...editForm, tanggal_pendasaran: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pemberi Pendasaran</label>
                    <input type="text" className="form-control" value={editForm.pemberi_pendasaran || ''} onChange={e => setEditForm({...editForm, pemberi_pendasaran: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jabatan (Opsional)</label>
                    <input type="text" className="form-control" value={editForm.nama_jabatan || ''} disabled />
                    <small style={{fontSize: '0.7rem', color: 'gray'}}>*Ubah melalui menu daftar pengurus</small>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary" disabled={isEditing}>
                  {isEditing ? 'Menyimpan...' : 'Simpan Pembaruan'}
                </button>
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

      {/* MODAL: PHOTO PREVIEW */}
      {showPhotoPreview && selectedMember?.foto_profil && (
        <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setShowPhotoPreview(false)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowPhotoPreview(false)}
              className="btn-interactive"
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={28} />
            </button>
            <img 
              src={selectedMember.foto_profil} 
              alt="Preview Profil" 
              style={{ width: '100%', height: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} 
            />
          </div>
        </div>
      )}

      <style>{`
        .control-panel {
          padding: 12px !important;
        }
        .control-panel .form-control {
          padding: 6px 10px !important;
          font-size: 0.75rem !important;
        }
        .search-bar-wrapper .form-control.padded-left {
          padding-left: 28px !important;
        }
        .search-bar-wrapper .search-icon {
          width: 12px !important;
          height: 12px !important;
          left: 10px !important;
        }

        .filter-controls-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .filter-controls-grid {
            grid-template-columns: 1fr;
          }
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

        .loading-state, .empty-state {
          padding: 40px;
          text-align: center;
          color: var(--text-secondary);
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

        .profile-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .profile-data-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px 12px;
          background-color: var(--bg-primary);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .profile-data-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .profile-data-value {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
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
      `}</style>
    </div>
  );
}

// Custom users icon since it's cleaner than import wrapper
function UsersIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
