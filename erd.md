ATAS BERKAT ROCHMAT ALLOH YANG MAHA KUASA

Berikut adalah rancangan struktur database (Entity Relationship Diagram) yang difokuskan pada relasi antara entitas **Anggota** dan **Sistem Pembayaran**.

Struktur ini dirancang dengan pendekatan relasional (RDBMS) agar pencatatan tunggakan, rekapitulasi, histori pembayaran, serta validasi *role* dapat di-generate secara efisien dan akurat.

## 1. Tabel Inti (Organisasi & Keanggotaan)

Tabel ini menyimpan biodata utama serta relasinya dengan struktur jabatan untuk menentukan hak akses sistem.

### `tabel_jabatan` (Master Jabatan)

Menyimpan referensi hierarki dan perannya dalam aplikasi.

* **`id_jabatan`** (Primary Key)
* **`nama_jabatan`** (String) — *Contoh: Ketua Umum, Bendahara, Penarikan, Anggota.*
* **`level_akses`** (String) — *Menentukan menu apa saja yang terbuka (Admin, View-Only, dll).*

### `tabel_anggota` (Master Biodata)

Tabel utama yang memuat data personal dan *credential* login.

* **`id_anggota`** (Primary Key, UUID / Auto Increment)
* **`id_anggota_ikhwaan`** (String)
* **`no_ktm`** (String, Unique) — *Digunakan untuk verifikasi login.*
* **`no_kta`** (String, Unique) — *Digunakan untuk verifikasi login.*
* **`passkey`** (String, Hashed) — *Sandi 6 digit untuk login.*
* **`nama_lengkap`** (String)
* **`id_jabatan`** (Foreign Key) — *Bereslasi ke `tabel_jabatan`.*
* *Kolom tambahan lainnya:* `no_telp`, `tempat_lahir`, `tanggal_lahir`, `alamat_jalan`, `desa`, `kecamatan`, `kabupaten_kota`, `provinsi`, `pekerjaan`, `kegiatan`, `instansi`, `keahlian_1`, `keahlian_2`, `jabatan_ikhwaan_9`, `org_shiddiqiyyah`, `tanggal_pendasaran`, `pemberi_pendasaran`.

---

## 2. Tabel Sistem Keuangan (Pembayaran & Tunggakan)

Untuk mengakomodasi fleksibilitas jenis pembayaran (Mulazamah bulanan, Wajib, dan Shodaqoh), sistem tidak membuat puluhan kolom baru, melainkan menggunakan relasi dinamis antara **Master Tagihan** dan **Transaksi**.

### `tabel_master_pembayaran` (Katalog Tagihan)

Tabel ini mencatat setiap tagihan baru yang di-generate oleh Bendahara (tombol "Tambah Pembayaran").

* **`id_master_bayar`** (Primary Key)
* **`kategori`** (Enum: `'MULAZAMAH'`, `'WAJIB'`, `'SHODAQOH'`)
* **`nama_pembayaran`** (String, Nullable) — *Kosong jika kategori Mulazamah, wajib diisi untuk kategori Wajib/Shodaqoh.*
* **`tahun_hijriyyah`** (String) — *Contoh: "1446". Acuan untuk memfilter lembar tagihan.*
* **`nominal_tagihan`** (Decimal/Integer)

### `tabel_transaksi_pembayaran` (Riwayat & Tunggakan)

Tabel ini mencatat setiap uang yang disetorkan oleh anggota.

* **`id_transaksi`** (Primary Key)
* **`id_anggota`** (Foreign Key) — *Berelasi ke `tabel_anggota`.*
* **`id_master_bayar`** (Foreign Key) — *Berelasi ke `tabel_master_pembayaran`.*
* **`bulan_hijriyyah`** (Integer 1-12, Nullable) — *Hanya diisi jika tagihan adalah Mulazamah (1 = Muharrom, 2 = Shofar, dst). Kosongkan untuk kategori Wajib & Shodaqoh.*
* **`nominal_dibayar`** (Decimal/Integer)
* **`tanggal_bayar`** (Datetime)

---

## 3. Logika Sinkronisasi Data (Business Logic)

Struktur tabel di atas sangat mempermudah sistem dalam melakukan generate laporan:

1. **Generate Tabel Mulazamah (12 Bulan):** Saat Bendahara memilih tahun (misal: 1446), sistem akan mengambil `id_master_bayar` untuk Mulazamah 1446. Sistem kemudian mengecek `tabel_transaksi_pembayaran` untuk anggota tersebut. Jika `bulan_hijriyyah` 1 sampai 12 tidak ditemukan di tabel transaksi, bulan tersebut otomatis direkap sebagai **Tunggakan**.
2. **Generate Wajib & Shodaqoh:** Sistem mencocokkan total tagihan di `tabel_master_pembayaran` dengan total `nominal_dibayar` di tabel transaksi milik anggota. Selisihnya akan langsung muncul sebagai sisa kekurangan pembayaran.
3. **Waiting List Profil:** Karena perubahan biodata butuh validasi admin, Anda akan membutuhkan satu tabel tambahan yakni `tabel_pengajuan_profil` yang menyimpan `id_anggota`, `data_perubahan` (dalam format JSON), dan `status_pengajuan` (Pending/Disetujui/Ditolak).