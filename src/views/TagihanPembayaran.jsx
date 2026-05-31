import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { FileText, Download, Printer, Filter } from 'lucide-react';
import { api } from '../utils/api';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import Swal from 'sweetalert2';

export default function TagihanPembayaran() {
  const { currentUser, settings } = useAppStore();
  const [members, setMembers] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMember, setSelectedMember] = useState('');

  // Loaded Invoice Data
  const [billData, setBillData] = useState(null);

  useEffect(() => {
    loadFilterData();
  }, []);

  const loadFilterData = async () => {
    try {
      const allMembers = await api.get('/anggota');
      setMembers(allMembers);

      const masters = await api.get('/pembayaran/master');
      const uniqueYears = [...new Set(masters.map(m => m.tahun_hijriyyah).filter(Boolean))];
      if (uniqueYears.length === 0) uniqueYears.push('1447');
      setYears(uniqueYears);
      
      setSelectedYear(uniqueYears[0] || '1447');

      // Autofill current logged member by default
      if (currentUser) {
        setSelectedMember(currentUser.id_anggota);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger loading invoice details when selections change
  useEffect(() => {
    if (selectedMember && selectedYear) {
      loadBillDetails();
    } else {
      setBillData(null);
    }
  }, [selectedMember, selectedYear]);

  const loadBillDetails = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/pembayaran/tagihan/${selectedMember}`, {
        tahun_hijriyyah: selectedYear
      });
      setBillData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (monthNum) => {
    const months = [
      'Muharrom', 'Shofar', 'Robi\'ul Awwal', 'Robi\'ul Akhir', 'Jumadil Ula', 'Jumadil Akhir', 
      'Rojab', 'Sya\'ban', 'Syahru Romadlon', 'Syawwal', 'Dzul Qo\'dah', 'Dzul Hijjah'
    ];
    return months[monthNum - 1] || '';
  };

  // =======================================================
  // HIGH FIDELITY client-side A4 PDF generator using jsPDF
  // =======================================================
  const handleDownloadPDF = async (action = 'download') => {
    if (!billData) return;
    
    try {

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const orgName = settings?.nama_organisasi || 'IKHWAN 9 SHIDDIQIYYAH';
    const orgAddress = settings?.alamat_organisasi || 'Jombang, Jawa Timur';
    const activeMember = members.find(m => m.id_anggota === selectedMember) || currentUser;

    // Premium Dynamic KOP Header Surat
    let yOffset = 0;
    if (settings?.kop_surat_url) {
      let kopFormat = 'PNG';
      if (settings.kop_surat_url.startsWith('data:image/jpeg') || settings.kop_surat_url.startsWith('data:image/jpg')) {
        kopFormat = 'JPEG';
      } else if (settings.kop_surat_url.startsWith('data:image/webp')) {
        kopFormat = 'WEBP';
      }
      
      let kopHeight = 32;
      const pdfKopWidth = 190; // 10mm margin on left and right (210 - 20)
      const marginX = 10;
      const marginY = 5; // 5mm top margin

      try {
        const dim = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.width, h: img.height });
          img.onerror = reject;
          img.src = settings.kop_surat_url;
        });
        kopHeight = (pdfKopWidth / dim.w) * dim.h;
      } catch (e) {
        kopHeight = 32;
      }
      
      doc.addImage(settings.kop_surat_url, kopFormat, marginX, marginY, pdfKopWidth, kopHeight);
      // calculate yOffset based on bottom edge of KOP (marginY + kopHeight) vs original 32mm
      yOffset = (marginY + kopHeight) - 32;
    } else {
      // Fallback/Default navy KOP Surat
      doc.setFillColor(27, 54, 93); // Navy header banner background
      doc.rect(0, 0, 210, 32, 'F');
      
      if (settings?.logo_url) {
        let logoFormat = 'PNG';
        if (settings.logo_url.startsWith('data:image/jpeg') || settings.logo_url.startsWith('data:image/jpg')) {
          logoFormat = 'JPEG';
        } else if (settings.logo_url.startsWith('data:image/webp')) {
          logoFormat = 'WEBP';
        }
        // Render logo on the left
        doc.addImage(settings.logo_url, logoFormat, 15, 3.5, 25, 25);
        
        // Offset text to the right for elegant layout
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(15);
        doc.text(orgName, 46, 11);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(orgAddress, 46, 17);
        doc.text(`Tlp: ${settings?.nomor_ketua || '-'} | Rek: ${settings?.nomor_rekening_1?.split(' ')[0] || '-'}`, 46, 22);
      } else {
        // Standard centered layout (no logo, no banner)
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(orgName, 105, 12, { align: 'center' });
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(orgAddress, 105, 18, { align: 'center' });
        doc.text(`Tlp: ${settings?.nomor_ketua || '-'} | Rek: ${settings?.nomor_rekening_1?.split(' ')[0] || '-'}`, 105, 23, { align: 'center' });
      }

      // Decorative Gold border line under KOP
      doc.setFillColor(212, 175, 55); // Gold line
      doc.rect(0, 32 + yOffset, 210, 2, 'F');
    }

    // Title Receipt Area Background
    doc.setFillColor(27, 54, 93); // Navy Blue Banner
    doc.rect(15, 38 + yOffset, 180, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text('LEMBAR ADMINISTRASI ANGGOTA', 20, 46 + yOffset);
    
    // Tahun Buku Box (White rounded rect on the right)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(145, 40 + yOffset, 45, 8, 1.5, 1.5, 'F');
    
    doc.setTextColor(27, 54, 93);
    doc.setFontSize(8.5);
    doc.text(`TAHUN BUKU: ${billData.tahun_hijriyyah} H`, 167.5, 45.2 + yOffset, { align: 'center' });

    // Member profile card background
    doc.setFillColor(248, 249, 250); // Light gray
    doc.rect(15, 57 + yOffset, 180, 27, 'F');
    // Top border of info box (accent color gold)
    doc.setFillColor(212, 175, 55); 
    doc.rect(15, 57 + yOffset, 180, 1.5, 'F');
    
    let textStartX = 19;
    if (activeMember.foto_profil) {
      try {
        doc.setDrawColor(212, 175, 55); // Gold border around photo
        doc.setLineWidth(0.5);
        doc.rect(19, 60.5 + yOffset, 16.5, 22, 'S');
        doc.addImage(activeMember.foto_profil, 'JPEG', 19, 60.5 + yOffset, 16.5, 22);
        textStartX = 40; // Geser teks ke kanan karena ada foto
      } catch (e) {
        console.error("Gagal merender foto di PDF", e);
      }
    }

    doc.setTextColor(27, 54, 93);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('INFORMASI ANGGOTA', textStartX, 64 + yOffset);
    
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    
    // Left column
    doc.text('Nama Lengkap', textStartX, 69.5 + yOffset);
    doc.text(`: ${billData.anggota.nama_lengkap}`, textStartX + 22, 69.5 + yOffset);
    
    doc.text('KTM / KTA', textStartX, 74.5 + yOffset);
    doc.text(`: ${billData.anggota.no_ktm} / ${billData.anggota.no_kta}`, textStartX + 22, 74.5 + yOffset);

    doc.text('Jabatan/Peran', textStartX, 79.5 + yOffset);
    doc.text(`: ${activeMember.nama_jabatan || 'Anggota'}`, textStartX + 22, 79.5 + yOffset);

    // Right column
    doc.text('Tgl Cetak', 120, 69.5 + yOffset);
    doc.text(`: ${new Date().toLocaleDateString('id-ID')}`, 142, 69.5 + yOffset);
    
    doc.text('Status Cetak', 120, 74.5 + yOffset);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(40, 167, 69); // Green status
    doc.text(`: RESMI PENGURUS`, 142, 74.5 + yOffset);

    // ==========================================
    // Table 1: Mulazamah bulanan
    // ==========================================
    doc.setTextColor(51, 51, 51); // Reset text color to default dark gray
    doc.setFont('Helvetica', 'bold');
    doc.text('1. DAFTAR BULAN MULAZAMAH:', 15, 90 + yOffset);
    
    // Draw two side-by-side table headers
    doc.setFillColor(27, 54, 93); // Navy Blue Background
    
    // Left Table Header Background
    doc.rect(15, 93 + yOffset, 88, 7, 'F');
    doc.rect(15, 93 + yOffset, 88, 7);
    
    // Right Table Header Background
    doc.rect(107, 93 + yOffset, 88, 7, 'F');
    doc.rect(107, 93 + yOffset, 88, 7);

    // Now draw all header texts (prevents text color from overriding fill color)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    
    // Left table center alignment (width 30, 30, 28)
    doc.text('Bulan', 15 + 15, 96.5 + yOffset, { align: 'center', baseline: 'middle' });
    doc.text('Status', 45 + 15, 96.5 + yOffset, { align: 'center', baseline: 'middle' });
    doc.text('Nominal', 75 + 14, 96.5 + yOffset, { align: 'center', baseline: 'middle' });
    
    // Right table center alignment
    doc.text('Bulan', 107 + 15, 96.5 + yOffset, { align: 'center', baseline: 'middle' });
    doc.text('Status', 137 + 15, 96.5 + yOffset, { align: 'center', baseline: 'middle' });
    doc.text('Nominal', 167 + 14, 96.5 + yOffset, { align: 'center', baseline: 'middle' });

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 51, 51); // Reset text color back to dark gray for the rows
    let y = 100 + yOffset;
    
    const leftList = billData.mulazamah.list.slice(0, 6);
    const rightList = billData.mulazamah.list.slice(6, 12);
    
    for (let i = 0; i < 6; i++) {
      const mLeft = leftList[i];
      const mRight = rightList[i];

      // Left Row
      if (mLeft) {
        doc.rect(15, y, 88, 6);
        doc.text(`${mLeft.bulan}. ${getMonthName(mLeft.bulan)}`, 17, y + 3, { baseline: 'middle' });
        if (mLeft.status === 'LUNAS') {
          doc.setTextColor(40, 167, 69);
          doc.text('LUNAS', 60, y + 3, { align: 'center', baseline: 'middle' });
        } else if (mLeft.status === 'BELUM JATUH TEMPO') {
          doc.setTextColor(173, 181, 189);
          doc.text('BELUM JATUH TEMPO', 60, y + 3, { align: 'center', baseline: 'middle' });
        } else {
          doc.setTextColor(220, 53, 69);
          doc.text('TUNGGAKAN', 60, y + 3, { align: 'center', baseline: 'middle' });
        }
        doc.setTextColor(51, 51, 51);
        if (mLeft.status === 'BELUM JATUH TEMPO') {
          doc.setTextColor(173, 181, 189);
          doc.text('-', 101, y + 3, { align: 'right', baseline: 'middle' });
        } else {
          doc.text(mLeft.nominal.toLocaleString('id-ID'), 101, y + 3, { align: 'right', baseline: 'middle' });
        }
        doc.setTextColor(51, 51, 51);
      }

      // Right Row
      if (mRight) {
        doc.rect(107, y, 88, 6);
        doc.text(`${mRight.bulan}. ${getMonthName(mRight.bulan)}`, 109, y + 3, { baseline: 'middle' });
        if (mRight.status === 'LUNAS') {
          doc.setTextColor(40, 167, 69);
          doc.text('LUNAS', 152, y + 3, { align: 'center', baseline: 'middle' });
        } else if (mRight.status === 'BELUM JATUH TEMPO') {
          doc.setTextColor(173, 181, 189);
          doc.text('BELUM JATUH TEMPO', 152, y + 3, { align: 'center', baseline: 'middle' });
        } else {
          doc.setTextColor(220, 53, 69);
          doc.text('TUNGGAKAN', 152, y + 3, { align: 'center', baseline: 'middle' });
        }
        doc.setTextColor(51, 51, 51);
        if (mRight.status === 'BELUM JATUH TEMPO') {
          doc.setTextColor(173, 181, 189);
          doc.text('-', 193, y + 3, { align: 'right', baseline: 'middle' });
        } else {
          doc.text(mRight.nominal.toLocaleString('id-ID'), 193, y + 3, { align: 'right', baseline: 'middle' });
        }
        doc.setTextColor(51, 51, 51);
      }
      y += 6;
    }

    // Subtotal mulazamah
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y, 140, 7, 'F');
    doc.setFillColor(27, 54, 93);
    doc.rect(155, y, 40, 7, 'F');
    doc.rect(15, y, 140, 7);
    doc.rect(155, y, 40, 7);
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(27, 54, 93);
    doc.text('Tunggakan Mulazamah', 150, y + 3.5, { align: 'right', baseline: 'middle' });
    doc.setTextColor(255, 255, 255);
    doc.text(`Rp ${billData.mulazamah.total_tunggakan.toLocaleString('id-ID')}`, 175, y + 3.5, { align: 'center', baseline: 'middle' });
    doc.setTextColor(51, 51, 51);

    // ==========================================
    // Table 2: Wajib iuran
    // ==========================================
    y += 12;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('2. IURAN WAJIB:', 15, y);

    y += 3;
    doc.setFillColor(27, 54, 93); // Navy Blue Header
    doc.rect(15, y, 180, 7, 'F');
    doc.rect(15, y, 180, 7);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    
    doc.text('Nama Item Pembayaran', 65, y + 3.5, { align: 'center', baseline: 'middle' }); 
    doc.text('Tagihan Ketentuan', 115, y + 3.5, { baseline: 'middle' });
    doc.text('Kekurangan Tunggakan', 160, y + 3.5, { baseline: 'middle' });

    doc.setTextColor(51, 51, 51);

    doc.setFont('Helvetica', 'normal');
    y += 7;

    if (billData.wajib.list.length === 0) {
      doc.rect(15, y, 180, 8);
      doc.text('Tidak ada iuran wajib terdaftar tahun ini.', 18, y + 4, { baseline: 'middle' });
      y += 8;
    } else {
      billData.wajib.list.forEach(item => {
        doc.rect(15, y, 180, 7);
        const nameText = item.sifat === 'SUKARELA' ? `[Sukarela] ${item.nama_pembayaran}` : item.nama_pembayaran;
        doc.text(nameText, 18, y + 3.5, { baseline: 'middle' });
        
        // Show actual target even if sukarela, but tunggakan is 0
        const tagihanDisplay = item.sifat === 'SUKARELA' ? 'Sukarela' : `Rp ${item.total_tagihan.toLocaleString('id-ID')}`;
        doc.text(tagihanDisplay, 115, y + 3.5, { baseline: 'middle' });
        
        if (item.tunggakan > 0) {
          doc.setTextColor(220, 53, 69);
          doc.text(`Rp ${item.tunggakan.toLocaleString('id-ID')}`, 193, y + 3.5, { align: 'right', baseline: 'middle' });
        } else {
          doc.setTextColor(40, 167, 69);
          doc.text('-', 193, y + 3.5, { align: 'right', baseline: 'middle' });
        }
        doc.setTextColor(51, 51, 51);
        y += 7;
      });
    }

    // Subtotal Wajib
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y, 140, 7, 'F');
    doc.setFillColor(27, 54, 93);
    doc.rect(155, y, 40, 7, 'F');
    doc.rect(15, y, 140, 7);
    doc.rect(155, y, 40, 7);
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(27, 54, 93);
    doc.text('Tunggakan Wajib', 150, y + 3.5, { align: 'right', baseline: 'middle' });
    doc.setTextColor(255, 255, 255);
    doc.text(`Rp ${billData.wajib.total_tunggakan.toLocaleString('id-ID')}`, 175, y + 3.5, { align: 'center', baseline: 'middle' });
    doc.setTextColor(51, 51, 51);
    y += 7;

    // ==========================================
    // Table 3: Partisipasi Shodaqoh
    // ==========================================
    y += 10;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3. PARTISIPASI SHODAQOH:', 15, y);

    y += 3;
    doc.setFillColor(27, 54, 93); // Navy Blue Header
    doc.rect(15, y, 180, 7, 'F');
    doc.rect(15, y, 180, 7);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    
    doc.text('Nama Item Pembayaran', 65, y + 3.5, { align: 'center', baseline: 'middle' }); 
    doc.text('Tagihan Ketentuan', 115, y + 3.5, { baseline: 'middle' }); 
    doc.text('Kekurangan Tunggakan', 160, y + 3.5, { baseline: 'middle' });

    doc.setTextColor(51, 51, 51);

    doc.setFont('Helvetica', 'normal');
    y += 7;

    if (billData.shodaqoh.list.length === 0) {
      doc.rect(15, y, 180, 8);
      doc.text('Tidak ada shodaqoh terdaftar tahun ini.', 18, y + 4, { baseline: 'middle' });
      y += 8;
    } else {
      billData.shodaqoh.list.forEach(item => {
        doc.rect(15, y, 180, 7);
        const nameText = item.sifat === 'SUKARELA' ? `[Sukarela] ${item.nama_pembayaran}` : item.nama_pembayaran;
        doc.text(nameText, 18, y + 3.5, { baseline: 'middle' });
        
        const tagihanDisplay = item.sifat === 'SUKARELA' ? 'Sukarela' : `Rp ${item.total_tagihan.toLocaleString('id-ID')}`;
        doc.text(tagihanDisplay, 115, y + 3.5, { baseline: 'middle' });
        
        if (item.tunggakan > 0) {
          doc.setTextColor(220, 53, 69);
          doc.text(`Rp ${item.tunggakan.toLocaleString('id-ID')}`, 193, y + 3.5, { align: 'right', baseline: 'middle' });
        } else {
          doc.setTextColor(40, 167, 69);
          doc.text('-', 193, y + 3.5, { align: 'right', baseline: 'middle' });
        }
        doc.setTextColor(51, 51, 51);
        y += 7;
      });
    }
    
    // Subtotal Shodaqoh
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y, 140, 7, 'F');
    doc.setFillColor(27, 54, 93);
    doc.rect(155, y, 40, 7, 'F');
    doc.rect(15, y, 140, 7);
    doc.rect(155, y, 40, 7);
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(27, 54, 93);
    doc.text('Shodaqoh', 150, y + 3.5, { align: 'right', baseline: 'middle' });
    doc.setTextColor(255, 255, 255);
    doc.text(`Rp ${billData.shodaqoh.total_tunggakan.toLocaleString('id-ID')}`, 175, y + 3.5, { align: 'center', baseline: 'middle' });
    doc.setTextColor(51, 51, 51);
    y += 7;

    y += 5; // spacing before grand total

    // ==========================================
    // GRAND TOTAL OVERVIEW
    // ==========================================
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y, 140, 9, 'F');
    doc.setFillColor(27, 54, 93);
    doc.rect(155, y, 40, 9, 'F');
    doc.rect(15, y, 140, 9);
    doc.rect(155, y, 40, 9);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    
    doc.setTextColor(27, 54, 93);
    doc.text('GRAND TOTAL KEKURANGAN TUNGGAKAN:', 150, y + 4.5, { align: 'right', baseline: 'middle' });
    
    doc.setTextColor(255, 255, 255);
    doc.text(`Rp ${billData.grand_total_tunggakan.toLocaleString('id-ID')}`, 175, y + 4.5, { align: 'center', baseline: 'middle' });
    doc.setTextColor(51, 51, 51);

    // Dicetak oleh info
    doc.setTextColor(100, 100, 100);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`${action === 'print' ? 'Dicetak' : 'Diunduh'} oleh: ${currentUser?.nama_lengkap || 'Admin'}`, 15, y + 13.5);
    doc.text(`Di-generate pada: ${new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, 15, y + 17.5);

    // Signatures / Footnotes at the bottom A4
    y += 22;
    doc.setTextColor(108, 117, 125);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('* Catatan: Silakan lakukan pembayaran ke Bendahara atau transfer ke Rekening Resmi tertera.', 15, y);
    doc.text(`* BSI: ${settings?.nomor_rekening_1 || '-'}`, 15, y + 4);
    doc.text(`* Mandiri: ${settings?.nomor_rekening_2 || '-'}`, 15, y + 8);

    // Tampilkan stempel TERLEBIH DAHULU agar posisinya berada di bawah teks (background)
    if (settings?.stempel_url) {
      let stempelFormat = 'PNG';
      if (settings.stempel_url.startsWith('data:image/jpeg') || settings.stempel_url.startsWith('data:image/jpg')) {
        stempelFormat = 'JPEG';
      } else if (settings.stempel_url.startsWith('data:image/webp')) {
        stempelFormat = 'WEBP';
      }
      
      try {
        const gState = doc.GState ? new doc.GState({ opacity: 0.45 }) : { opacity: 0.45 };
        doc.saveGraphicsState();
        doc.setGState(gState);
        doc.addImage(settings.stempel_url, stempelFormat, 130, y - 5, 42, 42); // Ukuran 42x42 mm
        doc.restoreGraphicsState();
      } catch (e) {
        // Fallback aman jika GState gagal
        doc.addImage(settings.stempel_url, stempelFormat, 130, y - 5, 42, 42);
      }
    }

    doc.setTextColor(51, 51, 51);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Jombang, ' + new Date().toLocaleDateString('id-ID'), 145, y);
    doc.setFont('Helvetica', 'bold');
    doc.text('Tertanda Pengurus,', 145, y + 5);
    
    // Signature name
    doc.text('Administrasi Ikhwaan 9', 145, y + 25);

    const fileName = `Tagihan_Ikhwan9_${billData.anggota.nama_lengkap.replace(/\s+/g, '_')}_${billData.tahun_hijriyyah}H.pdf`;

    if (Capacitor.isNativePlatform()) {
      if (action === 'print') {
        Swal.fire({
          icon: 'info',
          title: 'Perhatian',
          text: 'Silakan unduh (download) PDF terlebih dahulu, atau gunakan aplikasi versi Desktop (PC) untuk mencetak langsung.'
        });
        return;
      } else {
        // Native Download Action
        try {
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          const result = await Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: Directory.Documents,
          });
          
          await Share.share({
            title: 'Kwitansi Tagihan',
            text: 'Kwitansi Pembayaran Ikhwan 9',
            url: result.uri,
          });
        } catch (error) {
          console.error('File write error', error);
          Swal.fire('Gagal', 'Gagal menyimpan atau membagikan file PDF.', 'error');
        }
      }
    } else {
      // Desktop / Web / PWA Action
      try {
        if (action === 'print') {
          doc.autoPrint();
          const blobUrl = doc.output('bloburl');
          const printWindow = window.open(blobUrl, '_blank');
          if (!printWindow) {
            Swal.fire('Terblokir Browser', 'Browser Anda memblokir jendela baru. Mohon izinkan Pop-up untuk situs ini.', 'warning');
          }
        } else {
          // Download mechanism optimized for Web & iOS Safari PWA
          const blob = doc.output('blob');
          const blobUrl = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          }, 100);
          
          Swal.fire('Berhasil', 'PDF sedang diunduh...', 'success');
        }
      } catch (err) {
        console.error('Download error:', err);
        Swal.fire('Gagal', 'Terjadi kesalahan saat mengunduh PDF di browser ini.', 'error');
      }
    }
    } catch (err) {
      console.error('CRITICAL PDF ERROR:', err);
      Swal.fire('Gagal Membuat PDF', 'Terjadi kesalahan saat memproses gambar KOP atau Foto Profil. Pastikan pengaturan benar.', 'error');
    }
  };

  return (
    <div className="tagihan-view">
      <h3 className="section-title">
        <FileText size={20} /> Lembar Tagihan Pembayaran & Kwitansi
      </h3>

      {/* FILTER PANEL */}
      <div className="premium-card filter-card" style={{ marginBottom: '24px', padding: '20px' }}>
        <h4 className="form-label" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
          <Filter size={14} style={{ display: 'inline', marginRight: '4px' }} />
          Pilih Anggota & Tahun Buku Hijriyyah
        </h4>

        <div className="invoice-filters">
          {/* 1. Year */}
          <div className="form-group flex-1" style={{ marginBottom: 0 }}>
            <label className="form-label">Tahun Hijriyyah</label>
            <select
              className="form-control"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map(y => <option key={y} value={y}>{y} H</option>)}
            </select>
          </div>

          {/* 2. Member selection (Only Admin/Bendahara/Penarikan/Ketua can select other members, regular members are locked to themselves as per PRD) */}
          <div className="form-group flex-2" style={{ marginBottom: 0 }}>
            <label className="form-label">Nama Anggota</label>
            {!['Admin', 'Ketua', 'Pembayaran', 'Penarikan', 'PJKelompok'].includes(currentUser?.role) ? (
              <input
                type="text"
                className="form-control"
                value={currentUser?.nama_lengkap || ''}
                disabled
              />
            ) : (
              <select
                className="form-control"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
              >
                <option value="">-- Pilih Anggota --</option>
                {members
                  .filter(m => currentUser?.role === 'PJKelompok' ? m.kelompok === currentUser.kelompok : true)
                  .map(m => (
                  <option key={m.id_anggota} value={m.id_anggota}>
                    {m.nama_lengkap} (KTM: {m.no_ktm} | ID: {m.id_anggota_ikhwaan})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Mempersiapkan rincian tagihan kwitansi...</p>
        </div>
      ) : !billData ? (
        <div className="premium-card empty-state">
          <p>Pilih Anggota dan Tahun Hijriyyah untuk memunculkan lembar kwitansi tagihan.</p>
        </div>
      ) : (
        /* =======================================================
           BILL RECEIPT SCREEN PREVIEW
           ======================================================= */
        <div className="premium-card receipt-preview-container">
          
          {/* SIMPLE PREVIEW HEADER (No KOP on screen) */}
          <div className="preview-header-box">
            <span className="preview-header-title">LEMBAR ADMINISTRASI ANGGOTA</span>
            <span className="preview-header-year">
              TAHUN BUKU: {billData.tahun_hijriyyah} H
            </span>
          </div>

          <hr className="receipt-divider" />

          {/* RECEIPT BODY CLIENT DETAILS */}
          <div className="receipt-client-details">
            <div>
              <span>KTM / KTA :</span>
              <strong>{billData.anggota.no_ktm} / {billData.anggota.no_kta}</strong>
              <span style={{ display: 'block', marginTop: '4px' }}>Nama Lengkap :</span>
              <strong>{billData.anggota.nama_lengkap}</strong>
              <span style={{ display: 'block', marginTop: '4px' }}>Jabatan/Peran :</span>
              <strong>{members.find(m => m.id_anggota === selectedMember)?.nama_jabatan || currentUser?.nama_jabatan || 'Anggota'}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span>Tanggal Cetak :</span>
              <strong>{new Date().toLocaleDateString('id-ID')}</strong>
              <span style={{ display: 'block', marginTop: '4px' }}>Status Cetak :</span>
              <strong style={{ color: '#28a745' }}>RESMI PENGURUS</strong>
            </div>
          </div>

          {/* RECEIPT MULAZAMAH BREAKDOWN */}
          <div className="receipt-table-section">
            <h4>1. Mulazamah Bulanan</h4>
            <table className="receipt-inner-table">
              <thead>
                <tr>
                  <th>Bulan Hijriyyah</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Nominal Uang</th>
                </tr>
              </thead>
              <tbody>
                {billData.mulazamah.list.map(m => (
                  <tr key={m.bulan} style={m.status === 'BELUM JATUH TEMPO' ? { opacity: 0.5, fontStyle: 'italic' } : {}}>
                    <td>{m.bulan}. {getMonthName(m.bulan)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${m.status === 'LUNAS' ? 'badge-success' : m.status === 'BELUM JATUH TEMPO' ? 'badge-secondary' : 'badge-danger'}`}
                        style={m.status === 'BELUM JATUH TEMPO' ? { backgroundColor: '#adb5bd', color: '#fff' } : {}}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{m.status === 'BELUM JATUH TEMPO' ? '-' : `Rp ${m.nominal.toLocaleString('id-ID')}`}</td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td colSpan={2} style={{ textAlign: 'right', backgroundColor: '#ffffff', color: '#1b365d', borderRight: '1px solid #1b365d' }}>Tunggakan Mulazamah</td>
                  <td style={{ textAlign: 'center', backgroundColor: '#1b365d', color: '#ffffff', fontWeight: 'bold' }}>Rp {billData.mulazamah.total_tunggakan.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RECEIPT WAJIB BREAKDOWN */}
          <div className="receipt-table-section" style={{ marginTop: '24px' }}>
            <h4>2. Iuran Wajib</h4>
            <table className="receipt-inner-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>Nama Tagihan</th>
                  <th style={{ textAlign: 'left' }}>Sudah Setor</th>
                  <th style={{ textAlign: 'left' }}>Kekurangan Tunggakan</th>
                </tr>
              </thead>
              <tbody>
                {billData.wajib.list.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Tidak ada tagihan Wajib terdaftar tahun ini.
                    </td>
                  </tr>
                ) : (
                  <>
                    {billData.wajib.list.map(w => (
                      <tr key={w.id_master_bayar}>
                        <td>
                          {w.sifat === 'SUKARELA' && <span className="badge badge-success" style={{marginRight: '8px', padding: '2px 6px', fontSize: '0.65rem'}}>Sukarela</span>}
                          {w.nama_pembayaran}
                        </td>
                        <td style={{ textAlign: 'right' }}>Rp {w.sudah_dibayar.toLocaleString('id-ID')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: w.tunggakan > 0 ? 'var(--color-danger)' : 'inherit' }}>
                          {w.tunggakan > 0 ? `Rp ${w.tunggakan.toLocaleString('id-ID')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
                <tr className="subtotal-row">
                  <td colSpan={2} style={{ textAlign: 'right', backgroundColor: '#ffffff', color: '#1b365d', borderRight: '1px solid #1b365d' }}>Tunggakan Wajib</td>
                  <td style={{ textAlign: 'center', backgroundColor: '#1b365d', color: '#ffffff', fontWeight: 'bold' }}>Rp {billData.wajib.total_tunggakan.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RECEIPT SHODAQOH BREAKDOWN */}
          <div className="receipt-table-section" style={{ marginTop: '24px' }}>
            <h4>3. Partisipasi Shodaqoh</h4>
            <table className="receipt-inner-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>Nama Tagihan</th>
                  <th style={{ textAlign: 'left' }}>Sudah Setor</th>
                  <th style={{ textAlign: 'left' }}>Kekurangan Tunggakan</th>
                </tr>
              </thead>
              <tbody>
                {billData.shodaqoh.list.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Tidak ada tagihan Shodaqoh terdaftar tahun ini.
                    </td>
                  </tr>
                ) : (
                  <>
                    {billData.shodaqoh.list.map(s => (
                      <tr key={s.id_master_bayar}>
                        <td>
                          {s.sifat === 'SUKARELA' && <span className="badge badge-success" style={{marginRight: '8px', padding: '2px 6px', fontSize: '0.65rem'}}>Sukarela</span>}
                          {s.nama_pembayaran}
                        </td>
                        <td style={{ textAlign: 'right' }}>Rp {s.sudah_dibayar.toLocaleString('id-ID')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: s.tunggakan > 0 ? 'var(--color-danger)' : 'inherit' }}>
                          {s.tunggakan > 0 ? `Rp ${s.tunggakan.toLocaleString('id-ID')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
                <tr className="subtotal-row">
                  <td colSpan={2} style={{ textAlign: 'right', backgroundColor: '#ffffff', color: '#1b365d', borderRight: '1px solid #1b365d' }}>Shodaqoh</td>
                  <td style={{ textAlign: 'center', backgroundColor: '#1b365d', color: '#ffffff', fontWeight: 'bold' }}>Rp {billData.shodaqoh.total_tunggakan.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RECEIPT FOOTER GRAND TOTAL */}
          <div className="receipt-grand-total" style={{ padding: 0, backgroundColor: 'transparent', display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #1b365d' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: 1, padding: '12px 20px', backgroundColor: '#ffffff', color: '#1b365d', fontWeight: 700 }}>GRAND TOTAL KEKURANGAN TUNGGAKAN:</span>
            <div style={{ width: '180px', backgroundColor: '#1b365d', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
              Rp {billData.grand_total_tunggakan.toLocaleString('id-ID')}
            </div>
          </div>
          
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#6c757d' }}>
            <div style={{ marginBottom: '4px' }}>Preview Dokumen dilihat oleh: {currentUser?.nama_lengkap || 'Admin'}</div>
            <div>Di-generate pada: {new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          </div>

          {/* SIGNATURE AREA */}
          <div className="receipt-signature-area">
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>* Transfer Rekening Resmi Pengurus:</p>
              <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{settings?.nomor_rekening_1 || '-'}</p>
              <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{settings?.nomor_rekening_2 || '-'}</p>
            </div>
            <div style={{ textAlign: 'right', position: 'relative' }}>
              <span>Jombang, {new Date().toLocaleDateString('id-ID')}</span>
              <p style={{ fontWeight: 700, marginTop: '4px' }}>Tertanda Pengurus,</p>
              <div style={{ height: '50px', position: 'relative' }}>
                {/* Gambar stempel dihilangkan pada tampilan preview sesuai permintaan */}
              </div>
              <strong style={{ borderBottom: '1px solid var(--text-primary)', paddingBottom: '2px', position: 'relative', zIndex: 2 }}>
                Administrasi Ikhwaan 9
              </strong>
            </div>
          </div>

          {/* ACTION DOWNLOAD BUTTONS */}
          <div className="receipt-actions">
            <button onClick={() => handleDownloadPDF('download')} className="btn-gold btn-interactive">
              <Download size={16} /> Unduh Kwitansi PDF (A4)
            </button>
            <button onClick={() => handleDownloadPDF('print')} className="btn-secondary btn-interactive">
              <Printer size={16} /> Cetak Lembar Tagihan
            </button>
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

        .invoice-filters {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .flex-2 {
          flex: 2;
        }

        .receipt-preview-container {
          background-color: #FFFFFF !important;
          color: #212529 !important;
          border: 2px solid #dee2e6;
          width: 100%;
          margin: 0 auto;
          padding: 32px !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important;
        }

        [data-theme="dark"] .receipt-preview-container {
          color: #212529 !important; /* Keep receipt white-paper always for realistic printable preview */
        }

        .receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .receipt-header-branding h2 {
          font-family: var(--font-alt);
          font-size: 1.25rem;
          color: var(--accent-primary) !important;
          font-weight: 700;
        }

        .receipt-header-branding p {
          font-size: 0.775rem;
          color: #495057;
          margin-top: 4px;
        }

        .receipt-header-meta {
          text-align: right;
        }

        .receipt-header-meta h4 {
          font-family: var(--font-alt);
          font-size: 0.95rem;
          color: #212529;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .receipt-header-meta span {
          font-size: 0.775rem;
          color: #495057;
        }

        .receipt-divider {
          border: none;
          border-top: 2px solid var(--accent-secondary);
          margin: 16px 0;
        }

        .receipt-client-details {
          display: flex;
          justify-content: space-between;
          font-size: 0.825rem;
          color: #212529;
          margin-bottom: 24px;
          background-color: #f8f9fa;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
        }

        .receipt-client-details span {
          font-size: 0.725rem;
          color: #6c757d;
        }

        .receipt-table-section h4 {
          font-family: var(--font-alt);
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 8px;
          color: var(--accent-primary) !important;
        }

        .receipt-inner-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }

        .receipt-inner-table th {
          background-color: #1b365d;
          color: #ffffff;
          font-weight: 700;
          padding: 6px 10px;
          border-bottom: 1px solid #1b365d;
          text-align: center;
          vertical-align: middle;
        }

        .receipt-inner-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #e9ecef;
          color: #333333;
          vertical-align: middle;
        }

        .subtotal-row td {
          font-weight: 700;
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
          font-size: 0.825rem;
        }

        .receipt-grand-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--accent-primary);
          color: #FFFFFF;
          padding: 12px 20px;
          border-radius: var(--radius-sm);
          margin-top: 32px;
        }

        .receipt-grand-total span {
          font-size: 0.85rem;
          font-weight: 700;
        }

        .receipt-grand-total h3 {
          font-size: 1.35rem;
          font-weight: 800;
        }

        .receipt-signature-area {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          font-size: 0.825rem;
          color: #212529;
        }

        .preview-header-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #1b365d;
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .preview-header-title {
          font-weight: 700;
          color: #ffffff;
          font-size: 1.1rem;
          letter-spacing: 0.5px;
        }
        .preview-header-year {
          background-color: #ffffff;
          color: #1b365d;
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .receipt-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 32px;
          border-top: 1px solid #dee2e6;
          padding-top: 20px;
        }

        @media (max-width: 768px) {
          .preview-header-box {
            padding: 8px 10px !important;
          }
          .preview-header-title {
            font-size: 0.7rem !important;
            letter-spacing: 0px !important;
          }
          .preview-header-year {
            font-size: 0.65rem !important;
            padding: 4px 8px !important;
          }
          .receipt-preview-container {
            padding: 12px !important;
          }
          .receipt-client-details {
            flex-direction: column;
            gap: 12px;
            font-size: 0.75rem;
            padding: 10px;
          }
          .receipt-client-details > div {
            text-align: left !important;
          }
          .receipt-inner-table {
            font-size: 0.7rem;
          }
          .receipt-inner-table th, .receipt-inner-table td {
            padding: 4px 6px !important;
          }
          .receipt-table-section h4 {
            font-size: 0.8rem;
          }
          .receipt-grand-total {
            flex-direction: column !important;
          }
          .receipt-grand-total span {
            width: 100% !important;
            justify-content: center !important;
            padding: 8px !important;
            font-size: 0.75rem !important;
            text-align: center;
          }
          .receipt-grand-total div {
            width: 100% !important;
            padding: 8px !important;
            font-size: 1rem !important;
          }
          .receipt-signature-area {
            flex-direction: column;
            gap: 20px;
            font-size: 0.75rem;
          }
          .receipt-signature-area > div {
            text-align: left !important;
          }
          .receipt-actions {
            flex-direction: column;
            gap: 12px;
          }
          .receipt-actions button {
            width: 100%;
            justify-content: center;
          }
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-preview-container, .receipt-preview-container * {
            visibility: visible;
          }
          .receipt-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            border: none;
            box-shadow: none;
          }
          .receipt-actions, .filter-card, .section-title {
            display: none !important;
          }
          /* Ensure images and background colors are printed */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
