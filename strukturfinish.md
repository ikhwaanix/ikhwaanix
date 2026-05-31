# 🏗️ Struktur Final Aplikasi Ikhwan 9 (Versi Selesai)

Dokumen ini berisi rangkuman keseluruhan arsitektur dan sistem yang digunakan pada Aplikasi Ikhwan 9 setelah semua proses pengembangan selesai. Dokumen ini penting sebagai referensi jika di masa depan ada *developer* lain yang melanjutkan pengembangan aplikasi.

---

## 1. Tumpukan Teknologi (Tech Stack)

### A. Frontend (Antarmuka Pengguna)
- **Framework Utama:** React.js dengan Vite (`npm run dev`)
- **State Management:** Zustand (`src/store/useAppStore.js`)
- **Styling:** CSS Murni dengan CSS Variables (Premium Dark Mode & Glassmorphism)
- **Komponen Notifikasi:** SweetAlert2 & Toastify

### B. Backend & Database
- **API Server:** Node.js (Hosting di **Railway.app**)
- **Database:** MongoDB (Menyimpan profil, pengumuman, tagihan, dll)
- **Autentikasi:** Sistem token otomatis di klien (Tanpa password untuk kemudahan akses).

---

## 2. Platform Aplikasi

Aplikasi Ikhwan 9 menggunakan *Single Codebase* (Satu Kode Sumber) yang di-build menjadi dua *platform* berbeda:

### A. Aplikasi Desktop (Windows EXE)
- **Teknologi:** Electron.js (`electron/main.cjs`)
- **Sistem Update:** `electron-updater` (Auto-Update)
- **Distribusi:** File `.exe` didownload dan diinstal oleh pengguna di PC/Laptop Windows.
- **Cara Kerja Update:** Aplikasi secara otomatis mengecek rilis terbaru di **GitHub Releases** setiap kali aplikasi dibuka. Jika ada versi baru, aplikasi mengunduhnya di latar belakang dan meminta *restart*.

### B. Aplikasi Mobile (Android APK)
- **Teknologi:** Capacitor (`capacitor.config.json` & folder `android`)
- **Sistem Update:** Capgo Live Updates (OTA - Over The Air)
- **Distribusi:** File `app-debug.apk` dibagikan manual ke anggota (cukup 1 kali instalasi selamanya).
- **Cara Kerja Update:** Aplikasi mengecek pembaruan web/tampilan ke server **Capgo** di latar belakang. Saat aplikasi ditutup dan dibuka kembali, tampilan/fitur baru langsung diterapkan secara instan tanpa perlu anggota menginstal file APK baru dan tanpa muncul peringatan keamanan Android.

---

## 3. Direktori Penting

- `src/` → Berisi seluruh kode antarmuka aplikasi (React, CSS, Assets).
- `electron/` → Berisi konfigurasi untuk Desktop App (Windows).
- `android/` → Berisi kode *native* Android Studio (Tidak perlu diedit manual).
- `dist/` → Hasil *build* web yang siap dibungkus ke dalam EXE maupun APK.
- `package.json` → Daftar *library* pihak ketiga dan perintah terminal (`scripts`).

---
*Dokumen ini merupakan bentuk finalisasi pengembangan Aplikasi Ikhwan 9 pada Mei 2026.*
