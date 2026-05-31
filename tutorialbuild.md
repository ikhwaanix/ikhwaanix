# 🛠️ Tutorial Build (Kompilasi) Aplikasi

Dokumen ini berisi panduan untuk menghasilkan file aplikasi fisik (File `Setup.exe` untuk Windows dan File `.apk` untuk Android). 

**Catatan Penting:** 
Anda **HANYA PERLU MEM-BUILD FILE APK 1 KALI SAJA SELAMANYA**. Karena kita sudah memakai *Capgo Live Updates*, fitur/tampilan baru bisa langsung Anda kirim dari terminal (Lihat `tutorialupdate.md`). File APK hanya perlu di-build lagi jika Anda menghapus sistem atau menukar laptop ke PC yang sama sekali baru. 

Namun untuk file EXE Windows, Anda harus mem-buildnya setiap kali ada rilis versi baru.

---

## 1. Cara Build Aplikasi Android (File APK)

Karena file APK membutuhkan Java (JDK), kita akan menggunakan **Android Studio** yang sudah disiapkan khusus untuk itu oleh Google.

1. Buka aplikasi **Android Studio**.
2. Di halaman awal, klik **Open** (Ikon Folder).
3. Arahkan dan pilih folder `android` yang ada di dalam proyek Anda: 
   👉 `F:\WEBAPP\APLIKASI IKHWAN 9\android`
4. Tunggu beberapa menit hingga tulisan "*Importing 'android' Gradle Project*" di pojok kanan bawah selesai 100% dan hilang.
5. Arahkan *mouse* ke menu atas kiri (ikon garis empat ≡ atau tulisan **Build**).
6. Arahkan ke **Generate App Bundles or APKs >**
7. Klik **Build APK(s)**.
8. Tunggu hingga muncul notifikasi hijau di pojok kanan bawah bertuliskan "*APK(s) generated successfully*".
9. Klik tulisan **locate** berwarna biru di notifikasi tersebut. 
10. Folder akan terbuka, dan Anda akan melihat file **`app-debug.apk`**. Ganti namanya menjadi "Aplikasi Ikhwan 9.apk" lalu bagikan ke anggota.

---

## 2. Cara Build Aplikasi Windows (File EXE)

Proses pembuatan file EXE jauh lebih mudah karena bisa dilakukan langsung di Terminal (VS Code).

1. Buka Terminal VS Code di folder proyek (`F:\WEBAPP\APLIKASI IKHWAN 9`).
2. Jalankan perintah kompilasi:
   ```bash
   npm run build:electron
   ```
3. Tunggu hingga proses terminal selesai (bisa memakan waktu 1-3 menit).
4. Setelah beres, buka **File Explorer**.
5. Masuk ke folder: `F:\WEBAPP\APLIKASI IKHWAN 9\dist_electron\`
6. Anda akan menemukan file dengan nama **`Aplikasi Ikhwan 9 Setup [versi].exe`**.
7. File inilah yang Anda *upload* ke GitHub Releases untuk memberikan update ke PC anggota!
