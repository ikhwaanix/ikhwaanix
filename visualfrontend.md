ATAS BERKAT ROCHMAT ALLOH YANG MAHA KUASA

Berikut adalah panduan rancangan antarmuka pengguna (UI/UX) untuk aplikasi manajemen organisasi. Panduan ini dirancang untuk memastikan konsistensi visual, keanggunan, dan fungsionalitas yang optimal di berbagai ukuran layar (Responsif).

---

## 1. Panduan Visual Global (Global Styles)

### Skema Warna (Color Palette)

Warna diterapkan untuk memberikan kesan mewah, bersih, dan profesional.

* **Tema Terang (Light Mode):**
* **Background Utama:** Putih Bersih (`#FFFFFF`)
* **Background Sekunder (Kartu/Sidebar):** Putih Tulang / Off-White (`#F8F9FA`)
* **Warna Aksen Utama:** Merah Maroon (`#800000` atau `#660000`) untuk tombol utama, header tabel, dan elemen aktif.
* **Warna Aksen Sekunder:** Kuning Emas (`#D4AF37` atau `#FFD700`) untuk ikon premium, border fokus, dan *badge* status (misal: "Disetujui", "Lunas").
* **Teks:** Abu-abu Gelap (`#333333`) untuk keterbacaan maksimal.


* **Tema Gelap (Dark Mode):**
* **Background Utama:** Biru Navy Gelap (`#0A192F` atau `#112240`)
* **Background Sekunder:** Biru Dongker (`#1A365D`)
* **Warna Aksen Utama:** Merah Maroon (sedikit lebih terang agar kontras, misal `#A52A2A`)
* **Warna Aksen Sekunder:** Kuning Emas (`#FFD700`)
* **Teks:** Putih Abu-abu (`#E2E8F0`).



### Tipografi & Ikonografi

* **Font:** Gunakan jenis *Sans-Serif* yang bersih dan modern seperti **Inter**, **Poppins**, atau **Montserrat**. Font ini memberikan kesan rapi dan mudah dibaca pada data tabel yang padat.
* **Ikonografi:** Gunakan *line icons* dengan ketebalan garis yang tipis dan elegan (contoh: *Feather Icons*, *Lucide*, atau *FontAwesome Pro Light/Regular*). Hindari ikon *solid* yang terlalu tebal kecuali untuk status aktif.

---

## 2. Struktur Tata Letak Berdasarkan Perangkat (Breakpoints)

Aplikasi ini menggunakan pendekatan tata letak yang beradaptasi secara otomatis (Responsive Web Design) karena akan dikompilasi ke Web, EXE, dan APK/iOS.

### A. Tampilan Desktop & Laptop (Lebar Layar > 1024px)

Fokus pada pemanfaatan ruang layar yang luas untuk menampilkan informasi detail tanpa perlu banyak navigasi.

* **Navigasi (Sidebar & Topbar):**
* **Sidebar Kiri:** Terbuka penuh (tetap). Menampilkan logo organisasi, nama pengguna, dan daftar menu vertikal (Data Anggota, Pembayaran, dsb) dengan indikator aktif bergaris pinggir Kuning Emas.
* **Topbar:** Bersih. Pojok kanan atas memuat ikon Lonceng (Pemberitahuan) dan *Dropdown* Profil (Ganti Passkey, Logout).


* **Area Konten Utama:**
* **Dashboard:** Menampilkan *Grid Buttons* (tombol-tombol menu minimalis) dengan susunan 4 kolom ke samping.
* **Tabel Data:** Tabel ditampilkan secara penuh dengan seluruh kolom terlihat. Menggunakan fitur *pagination* (halaman) agar tidak memanjang ke bawah.
* **Form Input:** Tampil berdampingan (misal 2 kolom grid) untuk efisiensi ruang.



### B. Tampilan Tablet (Lebar Layar 768px - 1024px)

Fokus pada aksesibilitas sentuhan (*touch-friendly*) dan penyederhanaan informasi visual.

* **Navigasi (Sidebar & Topbar):**
* **Sidebar Kiri:** Berubah menjadi *Mini Sidebar* (hanya menampilkan Ikon tanpa teks label) yang bisa di-*hover* atau di-klik untuk memunculkan teks. Ini memberi ruang lebih besar untuk tabel.
* **Topbar:** Sama seperti Desktop.


* **Area Konten Utama:**
* **Dashboard:** *Grid Buttons* berubah menjadi susunan 3 kolom ke samping. Tombol dibuat sedikit lebih besar agar mudah disentuh (*touch target* minimal 48x48px).
* **Tabel Data:** Tabel mungkin tidak muat secara keseluruhan. Gunakan teknik *Horizontal Scroll* (geser ke kanan) khusus pada area tabel, sementara header dan kolom pertama (No/Nama) di-freeze (*sticky column*).
* **Form Input:** Berubah menjadi 1 kolom vertikal (atas ke bawah).



### C. Tampilan Mobile / HP (Lebar Layar < 768px)

Fokus pada antarmuka vertikal (memanjang ke bawah) dan kemudahan navigasi dengan ibu jari.

* **Navigasi:**
* **Sidebar:** Dihilangkan, diganti menjadi *Hamburger Menu* (Garis tiga) di pojok kiri atas Topbar yang jika diklik akan memunculkan menu (*Drawer/Off-canvas*) menutupi sebagian layar.
* **Bottom Navigation (Opsional untuk APK/iOS):** Untuk navigasi cepat, pasang menu bawah khusus untuk menu inti: *Beranda*, *Notifikasi*, dan *Profil*.


* **Area Konten Utama:**
* **Dashboard:** *Grid Buttons* berubah menjadi susunan 2 kolom ke samping atau berupa *List* kotak memanjang ke bawah.
* **Tabel Data (Perubahan Drastis):** Tabel tidak lagi menggunakan format baris-kolom konvensional karena akan sangat sulit dibaca di HP. Ubah representasi tabel menjadi **Card View** (Daftar Kartu).
* *Contoh:* Setiap anggota ditampilkan sebagai 1 kotak (Kartu). Di dalam kartu tersebut tertulis Nama (Teks tebal), No KTM/KTA, dan sebuah tombol "Detail" untuk membuka informasi lengkapnya dalam bentuk *Popup/Modal*.


* **Lembar Tagihan / PDF:** Menampilkan ringkasan teks besar untuk total tunggakan, dengan tombol mengambang (*Floating Action Button*) di pojok kanan bawah untuk mengunduh PDF.



---

## 3. Interaksi Khusus & Animasi (Micro-interactions)

Untuk memperkuat kesan mewah dan *smooth*:

* **Transisi Tema:** Saat mengubah Terang ke Gelap, gunakan efek transisi warna memudar (*fade/crossfade*) sekitar 0.3 detik agar mata pengguna tidak kaget.
* **Efek Tombol Dashboard:** Saat tombol diklik atau disentuh, berikan efek sedikit tenggelam (*scale down 0.95*) atau efek riak air tipis (*ripple effect*) berwarna Kuning Emas.
* **Pemberitahuan:** Jika ada notifikasi baru, ikon lonceng akan memiliki titik kecil warna Merah Maroon yang berkedip pelan (*pulse animation*).

---