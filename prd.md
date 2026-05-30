ATAS BERKAT ROCHMAT ALLOH YANG MAHA KUASA

# Product Requirements Document (PRD) - Aplikasi Manajemen Organisasi

## 1. Pendahuluan

Dokumen ini mendefinisikan spesifikasi dan kebutuhan untuk pengembangan Aplikasi Manajemen Organisasi terpadu. Aplikasi ini bertujuan untuk mengelola data anggota, struktur organisasi, serta sistem administrasi keuangan (pembayaran dan tunggakan).

**Platform Target:**
Berbasis JavaScript (Web-based) yang di-compile menjadi:

* APK (Android)
* Aplikasi iOS
* EXE (Windows Desktop)
* Web Browser (Akses via Link)

---

## 2. Antarmuka & Tema (UI/UX)

Desain aplikasi mengusung konsep minimalis, elegan, dan profesional dengan penggunaan ikon-ikon premium/mewah. Terdapat sidebar navigasi dan dashboard berbasis *grid button*.

**Skema Warna:**

* **Tema Terang (Light Mode):** Warna dasar Putih, dengan kombinasi elemen Merah Maroon dan Kuning Emas.
* **Tema Gelap (Dark Mode):** Warna dasar Biru Gelap/Navy, dengan kombinasi elemen Merah Maroon dan Kuning Emas.

---

## 3. Sistem Autentikasi & Login

Sistem login menggunakan kombinasi identitas keanggotaan dan keamanan *Passkey* 6 digit.

1. **Pengguna Baru / Belum Punya Passkey:**
* Input **Nomor KTM** dan **Nomor KTA**.
* Sistem meminta pembuatan **Passkey 6 Digit**.
* Passkey tersimpan di database dan terikat pada profil pengguna.
* Jika menggunakan QR code maka tidak perlu memasukkan no ktm dan no kta langsung membuat passkey.


2. **Pengguna Ter-logout (Sesi Habis):**
* Wajib input **Nomor KTM**, **Nomor KTA**, dan **Passkey 6 Digit**.
* Bisa menggunakan scan QRcode yang di generate dari id anggota.


3. **Pengguna Aktif (Sesi Masih Ada):**
* Hanya perlu input **Passkey 6 Digit** untuk membuka kunci aplikasi.



---

## 4. Peran Pengguna (Role & Permissions)

Sistem menggunakan *Role-Based Access Control* (RBAC) berdasarkan jabatan. Setiap pengguna memiliki akses standar sebagai "Anggota", ditambah hak istimewa sesuai jabatannya:

| Role / Jabatan | Hak Akses Sistem |
| --- | --- |
| **Admin (Sekretaris)** | Akses penuh (View, Edit, Delete, Generate) ke seluruh menu aplikasi. |
| **Pembayaran (Bendahara)** | View semua fitur anggota + Menu Input Pembayaran, Rekap Pembayaran, dan Tunggakan (Bisa edit data pembayaran & generate tunggakan PDF). |
| **Penarikan** | View semua fitur anggota + Menu Tunggakan (bisa generate PDF) dan Rekap Pembayaran (Hanya *View/Read-Only*). |
| **Ketua (Umum, Sosial, Penunjang)** | View semua menu aplikasi (*Read-Only*, tidak bisa edit/input) + Menu Tunggakan (Bisa generate PDF). Tidak bisa melihat menu Input Pembayaran. |
| **Anggota (Tanpa Jabatan)** | Akses ke Dashboard Anggota (Profil, Tunggakan Pribadi, Pemberitahuan). |

---

## 5. Fitur Utama & Struktur Menu

### 5.1. Dashboard Anggota

Halaman utama bagi semua pengguna, berisi menu dengan desain minimalis:

* **Pemberitahuan (Ikon Lonceng):** Terletak di header. Menerima notifikasi dari sistem/admin. Pemberitahuan akan hilang otomatis setelah dibaca (tidak bisa dihapus manual oleh anggota).
* **Detail Profil:** Menampilkan data diri: Nama, Nomor KTM, Nomor KTA, Nomor Telpon, Tempat/Tanggal Lahir, Alamat lengkap (Desa, Kecamatan, Kabupaten/Kota, Provinsi), Pekerjaan, Kegiatan, Instansi, Keahlian 1 & 2, Organisasi di Lingkungan Shiddiqiyyah, Jabatan (Otomatis: "Anggota", atau sesuai struktur jika di-assign), Tanggal Pendasaran, Pemberi Pendasaran.
* *Tombol Edit Profil:* Mengubah data (bersifat **Pengajuan/Waiting List**, tidak langsung merubah DB sebelum disetujui Admin).
* *Tombol Ganti Passkey.*


* **Tunggakan Pribadi:** Menampilkan rekap kewajiban pembayaran milik pengguna yang login.

### 5.2. Data Anggota

Tabel master biodata seluruh anggota.

* **Kolom Tabel:** No, Id_anggotaIkhwaan, Nama, No KTM, No KTA, Passkey (Terenskripsi/Hidden), No Telpon, TTL, Alamat (Desa, Kec, Kab/Kota, Prov), Pekerjaan, Kegiatan, Instansi, Keahlian 1 & 2, Jabatan Organisasi Ikhwaan 9, Organisasi Shiddiqiyyah, Jabatan, Tgl Pendasaran, Pemberi Pendasaran.

### 5.3. Struktur Organisasi

* **Preview:** Visualisasi hierarki menggunakan desain "kartu kotak" (Card) berisi: No, Nama, Jabatan, Nomor KTM, Nomor KTA.
* **Edit Struktur:** Form input untuk meng-assign anggota ke suatu jabatan (Ketua Umum, Ketua Misi, Ketua Penunjang, Sekretaris, Bendahara, Humas, Keilmuan, Dokumentasi, Pengarsipan, Spiritual, PJ Kelompok, Sosial Persaudaraan, FSIP, Mulazamah, Penarikan, Pengembangan Dana). Sistem otomatis menyusun tingkatan struktur berdasarkan input ini.

### 5.4. Alamat Saat Ini

* **Fungsi:** Direktori pencarian lokasi anggota.
* **Filter:** Dropdown berjenjang (Provinsi -> Kabupaten/Kota -> Kecamatan -> Desa).
* **Tabel:** No, Nama, Alamat, Desa, Kecamatan, Kabupaten/Kota, Provinsi.

### 5.5. Keahlian

* **Fungsi:** Pencarian anggota berdasarkan spesifikasi skill.
* **Filter:** Dropdown Nama Keahlian (diambil dinamis dari data yang ada).
* **Tabel:** No, Nama, No KTM, No KTA, Keahlian.

### 5.6. Menu Input Pembayaran

Form pencatatan keuangan tersentralisasi.

* **Alur Input:** Pilih Tahun Hijriyyah -> Pilih Nama Anggota -> Pilih Kategori (Mulazamah / Wajib / Shodaqoh).
* Jika *Mulazamah*: Nama pembayaran di-hide (otomatis bulanan).
* Jika *Wajib/Shodaqoh*: Pilih Nama Pembayaran -> Otomatis memunculkan Nominal.


* **Popup "Tambah Pembayaran":**
* Form: Kategori (Mulazamah/Wajib/Shodaqoh).
* Jika Wajib/Shodaqoh: Input Nama Pembayaran & Nominal.
* Jika Mulazamah: Input Tahun (Generate otomatis 12 bulan Hijriyyah: Muharrom, Shofar, Robi'ul Awwal, Robi'ul Akhir, Jumadil Ula, Jumadil Akhir, Rojab, Sya'ban, Syahru Romadlon, Syawwal, Dzul Qo'dah, Dzul Hijjah ditambah Tahun bersangkutan). Tahun ini masuk ke master data dropdown Tahun.



### 5.7. Menu Rekap Pembayaran

Halaman dengan 3 Tab utama:

1. **Tab Mulazamah:** Tabel per bulan Hijriyyah (berdasarkan filter tahun).
2. **Tab Pembayaran Wajib:** Tabel dinamis. Kolom bertambah otomatis jika ada nama pembayaran baru. Kolom akhir: *Total Harus Dibayar, Total Sudah Dibayar, Total Belum Dibayar*.
3. **Tab Pembayaran Shodaqoh:** Tabel dinamis dengan struktur identik seperti Tab Wajib.

### 5.8. Tagihan Pembayaran (Invoice/Kwitansi)

Lembar tunggakan interaktif untuk dicetak/didownload.

* **Filter:** Pilih Tahun & Nama Anggota.
* **Header Lembar:** Nama, No. KTM, No. KTA.
* **Body Lembar:**
* *Mulazamah:* Tabel 12 bulan (status bayar). Footer: Total Mulazamah (Harus Dibayar, Sudah Dibayar, Belum Dibayar).
* *Wajib:* Tabel daftar tunggakan dan nominal (Jika lunas tampil "-"). Footer: Total Tunggakan Wajib.
* *Shodaqoh:* Tabel daftar tunggakan dan nominal (Jika lunas tampil "-"). Footer: Total Tunggakan Shodaqoh.


* **Footer Lembar:** Total Keseluruhan Kekurangan (Mulazamah + Wajib + Shodaqoh) pada tahun tersebut.
* **Ekspor PDF:** Tombol download PDF. Ukuran kertas A4, layout menyerupai kwitansi resmi. Dilengkapi *timestamp* otomatis (Tanggal Generate) dan ruang tanda tangan "Tertanda Pengurus" di bagian paling bawah.

### 5.9. Menu Profil Organisasi

Pengaturan master data identitas lembaga:

* Upload Lambang & KOP Surat.
* Nama Organisasi, Alamat Organisasi.
* Hari & Tanggal Diresmikan (Masehi & Hijriyyah secara terpisah: Tgl/Bln/Thn).
* Nomor Ketua, Nomor Rekening 1, Nomor Rekening 2.

### 5.10. Waiting List Ubah Profil

Dashboard persetujuan perubahan data.

* **Tabel:** Nomor, Nama, KTM, KTA, Tanggal Pengajuan (Auto).
* **Aksi:**
* *Detail:* Melihat komparasi data lama dan usulan data baru.
* *Setujui (Centang):* Data DB berubah, kirim notifikasi berhasil ke anggota.
* *Tolak (Silang):* Muncul form input "Alasan Penolakan", kirim notifikasi gagal beserta alasan ke anggota.



### 5.11. Pengumuman

Sistem *broadcast* informasi.

* **Form Tambah:** Judul, Deskripsi, Upload File (PDF/JPG/PNG), Input Link/URL, Tanggal Publikasi (Auto).
* **Tampilan:** Tabel daftar pengumuman, akses buka file, tombol Hapus (khusus Admin).

### 5.12. Pengaturan

Konfigurasi teknis aplikasi:

* *Toggle* Tema Terang/Gelap manual.
* *Toggle* Mode Maintenance (Pemeliharaan sistem).
* Upload *Background* halaman login.
* Menampilkan Link/URL Login untuk akses via Browser.

---