import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
import cors from 'cors';


const dbSchema = new mongoose.Schema({ data: Object }, { strict: false });
const DbModel = mongoose.model('Database', dbSchema);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

async function readDatabase() {
  try {
    const doc = await DbModel.findOne();
    if (!doc || !doc.data) {
      return { anggota: [], jabatan: [], master_pembayaran: [], transaksi_pembayaran: [], pengajuan_profil: [], pengaturan: {}, pengumuman: [] };
    }
    return doc.data;
  } catch(e) {
    console.error('Error reading DB:', e);
    return { anggota: [], jabatan: [], master_pembayaran: [], transaksi_pembayaran: [], pengajuan_profil: [], pengaturan: {}, pengumuman: [] };
  }
}

async function writeDatabase(db) {
  try {
    let doc = await DbModel.findOne();
    if (!doc) doc = new DbModel();
    doc.data = db;
    doc.markModified('data');
    await doc.save();
  } catch(e) {
    console.error('Error writing DB:', e);
  }
}


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logger middleware for real-time debugging
app.use((req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.url} - Body:`, req.body);
  next();
});

// Utility to generate UUID-like IDs
const generateId = (prefix = 'id') => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

// ==========================================
// 1. AUTHENTICATION & SESSION ENDPOINTS
// ==========================================

// Register passkey for a member (for new user / haven't set passkey)
app.post('/api/auth/register-passkey', async (req, res) => {
  const { no_ktm, no_kta, passkey } = req.body;
  
  if (!no_ktm || !no_kta || !passkey) {
    return res.status(400).json({ message: 'Nomor KTM, KTA, dan Passkey wajib diisi' });
  }

  const db = await readDatabase();
  const index = db.anggota.findIndex(a => 
    String(a.no_ktm) === String(no_ktm) && 
    String(a.no_kta) === String(no_kta)
  );
  
  if (index === -1) {
    return res.status(404).json({ message: 'Anggota dengan KTM dan KTA tersebut tidak ditemukan' });
  }

  if (db.anggota[index].passkey && db.anggota[index].passkey !== '') {
    return res.status(400).json({ message: 'Passkey sudah pernah dibuat sebelumnya' });
  }

  db.anggota[index].passkey = passkey;
  await writeDatabase(db);

  const role = db.jabatan.find(j => j.id_jabatan === db.anggota[index].id_jabatan);

  res.json({
    message: 'Passkey berhasil didaftarkan',
    user: {
      ...db.anggota[index],
      role: role ? role.level_akses : 'Anggota',
      nama_jabatan: role ? role.nama_jabatan : 'Anggota'
    }
  });
});

// Login using KTM, KTA, and Passkey
app.post('/api/auth/login', async (req, res) => {
  const { no_ktm, no_kta, passkey } = req.body;

  if (!no_ktm || !no_kta || !passkey) {
    return res.status(400).json({ message: 'Nomor KTM, KTA, dan Passkey wajib diisi' });
  }

  const db = await readDatabase();
  const user = db.anggota.find(a => 
    String(a.no_ktm) === String(no_ktm) && 
    String(a.no_kta) === String(no_kta) && 
    String(a.passkey) === String(passkey)
  );

  if (!user) {
    return res.status(401).json({ message: 'Identitas KTM/KTA atau Passkey salah!' });
  }

  const role = db.jabatan.find(j => j.id_jabatan === user.id_jabatan);

  res.json({
    message: 'Login berhasil',
    user: {
      ...user,
      role: role ? role.level_akses : 'Anggota',
      nama_jabatan: role ? role.nama_jabatan : 'Anggota'
    }
  });
});

// Login using QR Code (Bypass Passkey)
app.post('/api/auth/login-qr', async (req, res) => {
  const { id_anggota_ikhwaan } = req.body;

  if (!id_anggota_ikhwaan) {
    return res.status(400).json({ message: 'ID Anggota Ikhwan wajib diisi' });
  }

  const db = await readDatabase();
  const user = db.anggota.find(a => 
    String(a.id_anggota_ikhwaan) === String(id_anggota_ikhwaan)
  );

  if (!user) {
    return res.status(401).json({ message: 'Identitas QR Code tidak dikenali!' });
  }

  const role = db.jabatan.find(j => j.id_jabatan === user.id_jabatan);

  res.json({
    message: 'Login via QR berhasil',
    user: {
      ...user,
      role: role ? role.level_akses : 'Anggota',
      nama_jabatan: role ? role.nama_jabatan : 'Anggota'
    }
  });
});

// Unlock using Passkey only (for active session)
app.post('/api/auth/unlock', async (req, res) => {
  const { id_anggota, passkey } = req.body;

  if (!id_anggota || !passkey) {
    return res.status(400).json({ message: 'Sesi kedaluwarsa atau parameter tidak lengkap' });
  }

  const db = await readDatabase();
  const user = db.anggota.find(a => 
    String(a.id_anggota) === String(id_anggota) && 
    String(a.passkey) === String(passkey)
  );

  if (!user) {
    return res.status(401).json({ message: 'Passkey 6-digit salah!' });
  }

  const role = db.jabatan.find(j => j.id_jabatan === user.id_jabatan);

  res.json({
    message: 'Aplikasi berhasil dibuka kunci',
    user: {
      ...user,
      role: role ? role.level_akses : 'Anggota',
      nama_jabatan: role ? role.nama_jabatan : 'Anggota'
    }
  });
});

// ==========================================
// 2. DATA ANGGOTA & WAITING LIST
// ==========================================

// Get all members with optional filters (address, skills)
app.get('/api/anggota', async (req, res) => {
  const db = await readDatabase();
  let result = db.anggota.map(user => {
    const role = db.jabatan.find(j => j.id_jabatan === user.id_jabatan);
    return {
      ...user,
      role: role ? role.level_akses : 'Anggota',
      nama_jabatan: role ? role.nama_jabatan : 'Anggota'
    };
  });

  // Apply filters if present
  const { provinsi, kabupaten_kota, kecamatan, desa, keahlian } = req.query;

  if (provinsi) result = result.filter(a => a.provinsi === provinsi);
  if (kabupaten_kota) result = result.filter(a => a.kabupaten_kota === kabupaten_kota);
  if (kecamatan) result = result.filter(a => a.kecamatan === kecamatan);
  if (desa) result = result.filter(a => a.desa === desa);
  
  if (keahlian) {
    result = result.filter(a => 
      (a.keahlian_1 && a.keahlian_1.toLowerCase() === keahlian.toLowerCase()) || 
      (a.keahlian_2 && a.keahlian_2.toLowerCase() === keahlian.toLowerCase())
    );
  }

  res.json(result);
});

// Bulk delete members (Admin only)
app.post('/api/anggota/delete-masal', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ message: 'Parameter ID tidak valid' });
  }

  const db = await readDatabase();
  // Filter out deleted members
  db.anggota = db.anggota.filter(a => !ids.includes(a.id_anggota));
  await writeDatabase(db);

  res.json({ message: `${ids.length} anggota berhasil dihapus` });
});

// Bulk import members via Excel (Admin only)
app.post('/api/anggota/import', async (req, res) => {
  const { members } = req.body;
  if (!members || !Array.isArray(members)) {
    return res.status(400).json({ message: 'Data anggota tidak valid' });
  }

  const db = await readDatabase();
  let addedCount = 0;

  members.forEach(member => {
    // Pengecekan agar tidak terjadi duplikasi berdasarkan KTM/KTA yang sama
    const exists = db.anggota.some(a => 
      (a.no_ktm && String(a.no_ktm) === String(member.no_ktm)) && 
      (a.no_kta && String(a.no_kta) === String(member.no_kta))
    );

    if (!exists) {
      db.anggota.push({
        ...member,
        id_anggota: generateId('usr'),
        id_jabatan: member.id_jabatan || "17", // Default menjadi "Anggota Biasa"
        passkey: member.passkey || "" // Passkey akan dibuat pengguna secara mandiri saat registrasi/login perdana
      });
      addedCount++;
    }
  });

  await writeDatabase(db);
  res.json({ message: `${addedCount} data anggota baru berhasil diimpor.` });
});

// Update member data directly (Admin only)
app.put('/api/anggota/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const db = await readDatabase();
  const index = db.anggota.findIndex(a => String(a.id_anggota) === String(id));
  
  if (index === -1) {
    return res.status(404).json({ message: 'Anggota tidak ditemukan' });
  }

  db.anggota[index] = { ...db.anggota[index], ...updateData };
  await writeDatabase(db);

  res.json({ message: 'Data anggota berhasil diperbarui', data: db.anggota[index] });
});

// Submit a profile update request (Waiting List)
app.post('/api/anggota/pengajuan-profil', async (req, res) => {
  const { id_anggota, data_perubahan } = req.body;

  if (!id_anggota || !data_perubahan) {
    return res.status(400).json({ message: 'Parameter tidak lengkap' });
  }

  const db = await readDatabase();
  const user = db.anggota.find(a => a.id_anggota === id_anggota);
  
  if (!user) {
    return res.status(404).json({ message: 'Anggota tidak ditemukan' });
  }

  const pengajuanBaru = {
    id_pengajuan: generateId('pf'),
    id_anggota,
    nama_lengkap: user.nama_lengkap,
    no_ktm: user.no_ktm,
    no_kta: user.no_kta,
    data_lama: user,
    data_baru: { ...user, ...data_perubahan }, // Merge old data with proposed updates
    tanggal_pengajuan: new Date().toISOString(),
    status_pengajuan: 'PENDING', // PENDING, APPROVED, REJECTED
    alasan_penolakan: ''
  };

  db.pengajuan_profil.push(pengajuanBaru);
  await writeDatabase(db);

  res.json({ message: 'Pengajuan perubahan profil berhasil dikirim dan menunggu persetujuan Admin' });
});

// Get all profile change requests (Admin menu)
app.get('/api/pengajuan-profil', async (req, res) => {
  const db = await readDatabase();
  res.json(db.pengajuan_profil);
});

// Approve a profile change request
app.post('/api/pengajuan-profil/:id/approve', async (req, res) => {
  const { id } = req.params;
  const db = await readDatabase();
  
  const pengajuanIndex = db.pengajuan_profil.findIndex(p => p.id_pengajuan === id);
  if (pengajuanIndex === -1) {
    return res.status(404).json({ message: 'Data pengajuan tidak ditemukan' });
  }

  const pengajuan = db.pengajuan_profil[pengajuanIndex];
  if (pengajuan.status_pengajuan !== 'PENDING') {
    return res.status(400).json({ message: 'Pengajuan ini sudah diproses sebelumnya' });
  }

  // Update member profile
  const anggotaIndex = db.anggota.findIndex(a => a.id_anggota === pengajuan.id_anggota);
  if (anggotaIndex !== -1) {
    // Keep credentials and critical IDs intact, only merge descriptive data
    const credentials = {
      id_anggota: db.anggota[anggotaIndex].id_anggota,
      id_anggota_ikhwaan: db.anggota[anggotaIndex].id_anggota_ikhwaan,
      no_ktm: db.anggota[anggotaIndex].no_ktm,
      no_kta: db.anggota[anggotaIndex].no_kta,
      passkey: db.anggota[anggotaIndex].passkey,
      id_jabatan: db.anggota[anggotaIndex].id_jabatan
    };

    db.anggota[anggotaIndex] = {
      ...db.anggota[anggotaIndex],
      ...pengajuan.data_baru,
      ...credentials // Ensure security parameters aren't overwritten by the user
    };
  }

  db.pengajuan_profil[pengajuanIndex].status_pengajuan = 'APPROVED';
  await writeDatabase(db);

  res.json({ message: 'Pengajuan disetujui, data anggota telah diperbarui' });
});

// Reject a profile change request
app.post('/api/pengajuan-profil/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { alasan_penolakan } = req.body;

  if (!alasan_penolakan) {
    return res.status(400).json({ message: 'Alasan penolakan wajib diisi' });
  }

  const db = await readDatabase();
  const pengajuanIndex = db.pengajuan_profil.findIndex(p => p.id_pengajuan === id);
  if (pengajuanIndex === -1) {
    return res.status(404).json({ message: 'Data pengajuan tidak ditemukan' });
  }

  if (db.pengajuan_profil[pengajuanIndex].status_pengajuan !== 'PENDING') {
    return res.status(400).json({ message: 'Pengajuan ini sudah diproses sebelumnya' });
  }

  db.pengajuan_profil[pengajuanIndex].status_pengajuan = 'REJECTED';
  db.pengajuan_profil[pengajuanIndex].alasan_penolakan = alasan_penolakan;
  await writeDatabase(db);

  res.json({ message: 'Pengajuan ditolak' });
});

// ==========================================
// 3. STRUKTUR ORGANISASI
// ==========================================

// Get list of all structure positions and assignees
app.get('/api/struktur', async (req, res) => {
  const db = await readDatabase();
  // Filter out positions and find who is assigned to them
  const result = db.jabatan
    .filter(j => j.id_jabatan !== "17") // Don't show regular "Anggota" in organizational structure tree
    .map(j => {
      const assigned = db.anggota.filter(a => a.id_jabatan === j.id_jabatan);
      return {
        id_jabatan: j.id_jabatan,
        nama_jabatan: j.nama_jabatan,
        level_akses: j.level_akses,
        assigned: assigned.map(a => ({
          id_anggota: a.id_anggota,
          nama_lengkap: a.nama_lengkap,
          no_ktm: a.no_ktm,
          no_kta: a.no_kta
        }))
      };
    });
  
  res.json(result);
});

// Assign a member to a position (Admin only)
app.post('/api/struktur/assign', async (req, res) => {
  const { id_anggota, id_jabatan, kelompok } = req.body;

  if (!id_anggota || !id_jabatan) {
    return res.status(400).json({ message: 'Anggota dan Jabatan wajib ditentukan' });
  }

  const db = await readDatabase();
  const anggotaIndex = db.anggota.findIndex(a => a.id_anggota === id_anggota);
  
  if (anggotaIndex === -1) {
    return res.status(404).json({ message: 'Anggota tidak ditemukan' });
  }

  db.anggota[anggotaIndex].id_jabatan = id_jabatan;
  
  // Jika ini PJ Kelompok (id_jabatan "12") dan ada input kelompok, perbarui kelompoknya juga
  if (id_jabatan === "12" && kelompok) {
    db.anggota[anggotaIndex].kelompok = kelompok;
  }
  
  await writeDatabase(db);

  res.json({ message: 'Jabatan organisasi berhasil diperbarui' });
});

// ==========================================
// 4. KEUANGAN & PEMBAYARAN ENDPOINTS
// ==========================================

// Get master payments catalog
app.get('/api/pembayaran/master', async (req, res) => {
  const db = await readDatabase();
  res.json(db.master_pembayaran);
});

// Add new master payment item (Bendahara only)
app.post('/api/pembayaran/master', async (req, res) => {
  const { kategori, nama_pembayaran, tahun_hijriyyah, nominal_tagihan, sifat_pembayaran } = req.body;

  if (!kategori || !tahun_hijriyyah || nominal_tagihan === undefined) {
    return res.status(400).json({ message: 'Kategori, Tahun Hijriyyah, dan Nominal wajib ditentukan' });
  }

  const db = await readDatabase();

  const newItem = {
    id_master_bayar: generateId('mb'),
    kategori,
    nama_pembayaran: kategori === 'MULAZAMAH' ? 'Mulazamah Bulanan' : nama_pembayaran,
    tahun_hijriyyah,
    nominal_tagihan: Number(nominal_tagihan),
    sifat_pembayaran: sifat_pembayaran || 'FIXED' // FIXED or SUKARELA
  };

  db.master_pembayaran.push(newItem);
  await writeDatabase(db);

  res.json({ message: 'Katalog pembayaran berhasil ditambahkan', data: newItem });
});

// Record a new transaction (Bendahara only)
app.post('/api/pembayaran/transaksi', async (req, res) => {
  const { id_anggota, id_master_bayar, bulan_hijriyyah, nominal_dibayar } = req.body;

  if (!id_anggota || !id_master_bayar || !nominal_dibayar) {
    return res.status(400).json({ message: 'Data transaksi tidak lengkap' });
  }

  const db = await readDatabase();
  const targetAnggota = db.anggota.find(a => a.id_anggota === id_anggota);
  const targetMaster = db.master_pembayaran.find(m => m.id_master_bayar === id_master_bayar);

  if (!targetAnggota || !targetMaster) {
    return res.status(404).json({ message: 'Anggota atau Jenis Pembayaran tidak valid' });
  }

  // If Mulazamah, check month
  if (targetMaster.kategori === 'MULAZAMAH' && (!bulan_hijriyyah || bulan_hijriyyah < 1 || bulan_hijriyyah > 12)) {
    return res.status(400).json({ message: 'Bulan Hijriyyah (1-12) wajib ditentukan untuk pembayaran Mulazamah' });
  }

  // Prevent double payment for the same month of Mulazamah
  if (targetMaster.kategori === 'MULAZAMAH') {
    const doubleCheck = db.transaksi_pembayaran.some(t => 
      t.id_anggota === id_anggota && 
      t.id_master_bayar === id_master_bayar && 
      t.bulan_hijriyyah === Number(bulan_hijriyyah)
    );

    if (doubleCheck) {
      return res.status(400).json({ message: `Anggota ini sudah membayar Mulazamah untuk bulan ke-${bulan_hijriyyah} pada tahun ${targetMaster.tahun_hijriyyah}` });
    }
  }

  const newTx = {
    id_transaksi: generateId('tx'),
    id_anggota,
    id_master_bayar,
    bulan_hijriyyah: targetMaster.kategori === 'MULAZAMAH' ? Number(bulan_hijriyyah) : null,
    nominal_dibayar: Number(nominal_dibayar),
    tanggal_bayar: new Date().toISOString()
  };

  db.transaksi_pembayaran.push(newTx);
  await writeDatabase(db);

  res.json({ message: 'Pembayaran berhasil dicatat', data: newTx });
});

// Get individual member bill and invoices (Kwitansi)
app.get('/api/pembayaran/tagihan/:id_anggota', async (req, res) => {
  const { id_anggota } = req.params;
  const { tahun_hijriyyah } = req.query;

  if (!tahun_hijriyyah) {
    return res.status(400).json({ message: 'Tahun Hijriyyah wajib disertakan dalam parameter query' });
  }

  const db = await readDatabase();
  const anggota = db.anggota.find(a => a.id_anggota === id_anggota);
  
  if (!anggota) {
    return res.status(404).json({ message: 'Anggota tidak ditemukan' });
  }

  // Filter master payments by year
  const masterPayments = db.master_pembayaran.filter(m => m.tahun_hijriyyah === tahun_hijriyyah);
  const txPayments = db.transaksi_pembayaran.filter(t => t.id_anggota === id_anggota);

  // 1. MULAZAMAH
  const mulazamahMaster = masterPayments.find(m => m.kategori === 'MULAZAMAH');
  const mulazamahList = [];
  let mulazamahLunasCount = 0;
  let mulazamahTotalHarus = 0;
  let mulazamahTotalSudah = 0;

  // Determine active month for billing
  const bulanAktif = db.pengaturan.bulan_aktif_mulazamah || 12;
  const tahunAktif = db.pengaturan.tahun_aktif_mulazamah || tahun_hijriyyah;
  const effectiveBulanAktif = (tahun_hijriyyah === tahunAktif) ? bulanAktif : (tahun_hijriyyah < tahunAktif ? 12 : 0);

  if (mulazamahMaster) {
    mulazamahTotalHarus = mulazamahMaster.nominal_tagihan * effectiveBulanAktif;
    for (let m = 1; m <= 12; m++) {
      const tx = txPayments.find(t => t.id_master_bayar === mulazamahMaster.id_master_bayar && t.bulan_hijriyyah === m);
      if (tx) {
        mulazamahLunasCount++;
        mulazamahTotalSudah += tx.nominal_dibayar;
        mulazamahList.push({ bulan: m, status: 'LUNAS', nominal: tx.nominal_dibayar, tanggal: tx.tanggal_bayar });
      } else if (m > effectiveBulanAktif) {
        mulazamahList.push({ bulan: m, status: 'BELUM JATUH TEMPO', nominal: 0, tanggal: null });
      } else {
        mulazamahList.push({ bulan: m, status: 'TUNGGAKAN', nominal: mulazamahMaster.nominal_tagihan, tanggal: null });
      }
    }
  } else {
    // If no master Mulazamah is set for this year, populate standard empty rows
    for (let m = 1; m <= 12; m++) {
      mulazamahList.push({ bulan: m, status: 'BELUM DI-GENERATE', nominal: 0, tanggal: null });
    }
  }
  const mulazamahTunggakan = mulazamahTotalHarus - mulazamahTotalSudah;

  // 2. WAJIB
  const wajibList = [];
  let wajibTotalHarus = 0;
  let wajibTotalSudah = 0;

  const wajibMasters = masterPayments.filter(m => m.kategori === 'WAJIB');
  wajibMasters.forEach(wm => {
    const txs = txPayments.filter(t => t.id_master_bayar === wm.id_master_bayar);
    const sudahBayar = txs.reduce((sum, t) => sum + t.nominal_dibayar, 0);
    
    // For Sukarela: tunggakan is 0, otherwise target - paid
    const isSukarela = wm.sifat_pembayaran === 'SUKARELA';
    let tunggakan = wm.nominal_tagihan - sudahBayar;
    if (isSukarela) {
      tunggakan = 0;
    }

    wajibTotalHarus += wm.nominal_tagihan;
    wajibTotalSudah += sudahBayar;

    wajibList.push({
      id_master_bayar: wm.id_master_bayar,
      nama_pembayaran: wm.nama_pembayaran,
      sifat: wm.sifat_pembayaran || 'FIXED',
      total_tagihan: isSukarela ? 0 : wm.nominal_tagihan,
      sudah_dibayar: sudahBayar,
      tunggakan: tunggakan > 0 ? tunggakan : 0,
      status: (isSukarela && sudahBayar > 0) ? 'LUNAS' : (sudahBayar >= wm.nominal_tagihan ? 'LUNAS' : 'SEBAGIAN/BELUM')
    });
  });
  const wajibTunggakan = wajibTotalHarus - wajibTotalSudah;

  // 3. SHODAQOH
  const shodaqohList = [];
  let shodaqohTotalHarus = 0;
  let shodaqohTotalSudah = 0;

  const shodaqohMasters = masterPayments.filter(m => m.kategori === 'SHODAQOH');
  shodaqohMasters.forEach(sm => {
    const txs = txPayments.filter(t => t.id_master_bayar === sm.id_master_bayar);
    const sudahBayar = txs.reduce((sum, t) => sum + t.nominal_dibayar, 0);
    
    // For Sukarela: tunggakan is 0, otherwise target - paid
    const isSukarela = sm.sifat_pembayaran === 'SUKARELA';
    let tunggakan = sm.nominal_tagihan - sudahBayar;
    if (isSukarela) {
      tunggakan = 0;
    }

    shodaqohTotalHarus += sm.nominal_tagihan;
    shodaqohTotalSudah += sudahBayar;

    shodaqohList.push({
      id_master_bayar: sm.id_master_bayar,
      nama_pembayaran: sm.nama_pembayaran,
      sifat: sm.sifat_pembayaran || 'FIXED',
      total_tagihan: isSukarela ? 0 : sm.nominal_tagihan,
      sudah_dibayar: sudahBayar,
      tunggakan: tunggakan > 0 ? tunggakan : 0,
      status: (isSukarela && sudahBayar > 0) ? 'LUNAS' : (sudahBayar >= sm.nominal_tagihan ? 'LUNAS' : 'SEBAGIAN/BELUM')
    });
  });
  const shodaqohTunggakan = shodaqohTotalHarus - shodaqohTotalSudah;

  // Total Outstanding
  const grandTotalTunggakan = mulazamahTunggakan + wajibTunggakan + shodaqohTunggakan;

  res.json({
    anggota: {
      id_anggota: anggota.id_anggota,
      nama_lengkap: anggota.nama_lengkap,
      no_ktm: anggota.no_ktm,
      no_kta: anggota.no_kta,
      id_anggota_ikhwaan: anggota.id_anggota_ikhwaan
    },
    tahun_hijriyyah,
    mulazamah: {
      list: mulazamahList,
      total_harus: mulazamahTotalHarus,
      total_sudah: mulazamahTotalSudah,
      total_tunggakan: mulazamahTunggakan
    },
    wajib: {
      list: wajibList,
      total_harus: wajibTotalHarus,
      total_sudah: wajibTotalSudah,
      total_tunggakan: wajibTunggakan
    },
    shodaqoh: {
      list: shodaqohList,
      total_harus: shodaqohTotalHarus,
      total_sudah: shodaqohTotalSudah,
      total_tunggakan: shodaqohTunggakan
    },
    grand_total_tunggakan: grandTotalTunggakan
  });
});

// Edit existing transaction from Rekapitulasi (Admin & Bendahara only)
app.put('/api/pembayaran/rekap-edit', async (req, res) => {
  const { id_anggota, id_master_bayar, bulan_hijriyyah, nominal_baru, is_mulazamah } = req.body;

  if (!id_anggota || !id_master_bayar || nominal_baru === undefined) {
    return res.status(400).json({ message: 'Data edit tidak lengkap' });
  }

  const db = await readDatabase();
  const targetAnggota = db.anggota.find(a => a.id_anggota === id_anggota);
  const targetMaster = db.master_pembayaran.find(m => m.id_master_bayar === id_master_bayar);

  if (!targetAnggota || !targetMaster) {
    return res.status(404).json({ message: 'Anggota atau Jenis Pembayaran tidak valid' });
  }

  if (is_mulazamah) {
    // Mulazamah Logic: Toggle LUNAS / BELUM LUNAS
    if (!bulan_hijriyyah || bulan_hijriyyah < 1 || bulan_hijriyyah > 12) {
      return res.status(400).json({ message: 'Bulan Hijriyyah tidak valid' });
    }

    const existingTxIndex = db.transaksi_pembayaran.findIndex(t => 
      t.id_anggota === id_anggota && 
      t.id_master_bayar === id_master_bayar && 
      t.bulan_hijriyyah === Number(bulan_hijriyyah)
    );

    if (nominal_baru > 0) {
      // Mark as paid
      if (existingTxIndex === -1) {
        db.transaksi_pembayaran.push({
          id_transaksi: generateId('tx'),
          id_anggota,
          id_master_bayar,
          bulan_hijriyyah: Number(bulan_hijriyyah),
          nominal_dibayar: Number(nominal_baru),
          tanggal_transaksi: new Date().toISOString()
        });
      }
    } else {
      // Mark as unpaid
      if (existingTxIndex !== -1) {
        db.transaksi_pembayaran.splice(existingTxIndex, 1);
      }
    }
  } else {
    // Wajib & Shodaqoh Logic: Overwrite total setoran
    // 1. Delete all existing transactions for this tagihan
    db.transaksi_pembayaran = db.transaksi_pembayaran.filter(t => 
      !(t.id_anggota === id_anggota && t.id_master_bayar === id_master_bayar)
    );

    // 2. Insert new total if nominal > 0
    if (nominal_baru > 0) {
      db.transaksi_pembayaran.push({
        id_transaksi: generateId('tx'),
        id_anggota,
        id_master_bayar,
        bulan_hijriyyah: null,
        nominal_dibayar: Number(nominal_baru),
        tanggal_transaksi: new Date().toISOString()
      });
    }
  }

  await writeDatabase(db);
  res.json({ message: 'Data rekapitulasi berhasil diperbarui' });
});

// Get overall payment rekapitulasi data (Bendahara & Penarikan menu)
app.get('/api/pembayaran/rekap', async (req, res) => {
  const { tahun_hijriyyah } = req.query;

  if (!tahun_hijriyyah) {
    return res.status(400).json({ message: 'Tahun Hijriyyah wajib ditentukan' });
  }

  const db = await readDatabase();
  const members = db.anggota;
  const masterPayments = db.master_pembayaran.filter(m => m.tahun_hijriyyah === tahun_hijriyyah);
  const txPayments = db.transaksi_pembayaran;

  // 1. Mulazamah Rekap
  const mulazamahMaster = masterPayments.find(m => m.kategori === 'MULAZAMAH');

  // Determine active month for billing
  const bulanAktif = db.pengaturan.bulan_aktif_mulazamah || 12;
  const tahunAktif = db.pengaturan.tahun_aktif_mulazamah || tahun_hijriyyah;
  const effectiveBulanAktif = (tahun_hijriyyah === tahunAktif) ? bulanAktif : (tahun_hijriyyah < tahunAktif ? 12 : 0);

  const mulazamahRekap = members.map(member => {
    const monthlyStatus = [];
    let totalSudah = 0;
    
    for (let m = 1; m <= 12; m++) {
      const tx = mulazamahMaster ? txPayments.find(t => 
        t.id_anggota === member.id_anggota && 
        t.id_master_bayar === mulazamahMaster.id_master_bayar && 
        t.bulan_hijriyyah === m
      ) : null;
      
      if (tx) {
        totalSudah += tx.nominal_dibayar;
        monthlyStatus.push({ bulan: m, lunas: true });
      } else if (m > effectiveBulanAktif) {
        monthlyStatus.push({ bulan: m, lunas: false, belum_jatuh_tempo: true });
      } else {
        monthlyStatus.push({ bulan: m, lunas: false });
      }
    }

    const totalHarus = mulazamahMaster ? mulazamahMaster.nominal_tagihan * effectiveBulanAktif : 0;

    return {
      id_anggota: member.id_anggota,
      nama_lengkap: member.nama_lengkap,
      no_ktm: member.no_ktm,
      no_kta: member.no_kta,
      kelompok: member.kelompok,
      bulanan: monthlyStatus,
      total_harus: totalHarus,
      total_sudah: totalSudah,
      tunggakan: Math.max(0, totalHarus - totalSudah)
    };
  });

  // 2. Wajib Rekap
  const wajibMasters = masterPayments.filter(m => m.kategori === 'WAJIB');
  const wajibRekap = members.map(member => {
    const listBayar = wajibMasters.map(wm => {
      const txs = txPayments.filter(t => t.id_anggota === member.id_anggota && t.id_master_bayar === wm.id_master_bayar);
      const sudah = txs.reduce((sum, t) => sum + t.nominal_dibayar, 0);
      return {
        id_master_bayar: wm.id_master_bayar,
        nama_pembayaran: wm.nama_pembayaran,
        nominal_tagihan: wm.nominal_tagihan,
        sudah_dibayar: sudah,
        tunggakan: Math.max(0, wm.nominal_tagihan - sudah)
      };
    });

    const totalHarus = listBayar.reduce((sum, i) => sum + i.nominal_tagihan, 0);
    const totalSudah = listBayar.reduce((sum, i) => sum + i.sudah_dibayar, 0);

    return {
      id_anggota: member.id_anggota,
      nama_lengkap: member.nama_lengkap,
      no_ktm: member.no_ktm,
      no_kta: member.no_kta,
      kelompok: member.kelompok,
      detail: listBayar,
      total_harus: totalHarus,
      total_sudah: totalSudah,
      tunggakan: totalHarus - totalSudah
    };
  });

  // 3. Shodaqoh Rekap
  const shodaqohMasters = masterPayments.filter(m => m.kategori === 'SHODAQOH');
  const shodaqohRekap = members.map(member => {
    const listBayar = shodaqohMasters.map(sm => {
      const txs = txPayments.filter(t => t.id_anggota === member.id_anggota && t.id_master_bayar === sm.id_master_bayar);
      const sudah = txs.reduce((sum, t) => sum + t.nominal_dibayar, 0);
      return {
        id_master_bayar: sm.id_master_bayar,
        nama_pembayaran: sm.nama_pembayaran,
        nominal_tagihan: sm.nominal_tagihan,
        sudah_dibayar: sudah,
        tunggakan: Math.max(0, sm.nominal_tagihan - sudah)
      };
    });

    const totalHarus = listBayar.reduce((sum, i) => sum + i.nominal_tagihan, 0);
    const totalSudah = listBayar.reduce((sum, i) => sum + i.sudah_dibayar, 0);

    return {
      id_anggota: member.id_anggota,
      nama_lengkap: member.nama_lengkap,
      no_ktm: member.no_ktm,
      no_kta: member.no_kta,
      kelompok: member.kelompok,
      detail: listBayar,
      total_harus: totalHarus,
      total_sudah: totalSudah,
      tunggakan: totalHarus - totalSudah
    };
  });

  res.json({
    tahun_hijriyyah,
    mulazamah_master: mulazamahMaster ? {
      id_master_bayar: mulazamahMaster.id_master_bayar,
      nominal_tagihan: mulazamahMaster.nominal_tagihan
    } : null,
    mulazamah: mulazamahRekap,
    wajib: {
      masters: wajibMasters.map(m => ({ id_master_bayar: m.id_master_bayar, nama_pembayaran: m.nama_pembayaran })),
      rekap: wajibRekap
    },
    shodaqoh: {
      masters: shodaqohMasters.map(m => ({ id_master_bayar: m.id_master_bayar, nama_pembayaran: m.nama_pembayaran })),
      rekap: shodaqohRekap
    }
  });
});

// ==========================================
// 5. BROADCAST PENGUMUMAN ENDPOINTS
// ==========================================

// Get announcements list
app.get('/api/pengumuman', async (req, res) => {
  const db = await readDatabase();
  res.json(db.pengumuman);
});

// Create new broadcast announcement (Admin only)
app.post('/api/pengumuman', async (req, res) => {
  const { judul, deskripsi, file_url, link_url } = req.body;

  if (!judul || !deskripsi) {
    return res.status(400).json({ message: 'Judul dan Deskripsi pengumuman wajib diisi' });
  }

  const db = await readDatabase();
  const newAnn = {
    id_pengumuman: generateId('ann'),
    judul,
    deskripsi,
    file_url: file_url || '',
    link_url: link_url || '',
    tanggal_publikasi: new Date().toISOString()
  };

  db.pengumuman.push(newAnn);
  await writeDatabase(db);

  res.json({ message: 'Pengumuman berhasil disebarluaskan', data: newAnn });
});

// Delete announcement (Admin only)
app.delete('/api/pengumuman/:id', async (req, res) => {
  const { id } = req.params;
  const db = await readDatabase();
  
  const index = db.pengumuman.findIndex(p => p.id_pengumuman === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Pengumuman tidak ditemukan' });
  }

  db.pengumuman.splice(index, 1);
  await writeDatabase(db);

  res.json({ message: 'Pengumuman berhasil dihapus' });
});

// ==========================================
// 6. GLOBAL SETTINGS & PROFILE KOP ENDPOINTS
// ==========================================

// Get global settings & Kop profil organisasi
app.get('/api/pengaturan', async (req, res) => {
  const db = await readDatabase();
  res.json(db.pengaturan);
});

// Update global settings & Kop profil organisasi (Admin only)
app.post('/api/pengaturan', async (req, res) => {
  const db = await readDatabase();
  db.pengaturan = {
    ...db.pengaturan,
    ...req.body
  };
  await writeDatabase(db);
  res.json({ message: 'Pengaturan organisasi berhasil diperbarui', data: db.pengaturan });
});

// Health check endpoint (untuk Railway/Render auto-deploy)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', app: 'Ikhwan 9 API', timestamp: new Date().toISOString() });
});

// Start backend server listener
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Backend Aplikasi Ikhwan 9 berjalan di http://0.0.0.0:${PORT}`);
});
