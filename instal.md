# Panduan Instalasi Dependencies (NPM) Aplikasi Ikhwan 9

Aplikasi ini menggunakan arsitektur terpisah antara **Frontend** (React + Vite) dan **Backend** (Node.js + Express). Pastikan Anda telah menginstal [Node.js](https://nodejs.org/) di komputer Anda sebelum menjalankan perintah-perintah di bawah ini.

---

## 1. Instalasi Backend (Server API)

Buka terminal/Command Prompt, arahkan ke folder `server` (jika backend dipisah) atau jalankan di folder utama proyek (tergantung letak `server.js` dan `package.json` backend).

### Dependencies Utama:
Modul inti untuk menjalankan server dan menangani request.
```bash
npm install express cors
```
*Catatan:*
* `express`: Framework server Node.js.
* `cors`: Menangani masalah *Cross-Origin Resource Sharing* agar frontend bisa mengakses API.

### Dependencies Development (Opsional tapi disarankan):
```bash
npm install -D nodemon
```
*Catatan: `nodemon` digunakan agar server otomatis me-restart saat ada perubahan kode di `server.js`.*

---

## 2. Instalasi Frontend (React UI)

Buka terminal baru, arahkan ke folder root/frontend proyek tempat file `index.html` dan `vite.config.js` berada.

### Dependencies Utama (Fungsionalitas Aplikasi):
Jalankan perintah berikut untuk menginstal semua pustaka yang digunakan dalam komponen-komponen React:

```bash
npm install lucide-react sweetalert2 xlsx zustand
```

*Penjelasan Modul Frontend:*
* `lucide-react`: Pustaka ikon elegan dan ringan (digunakan di seluruh menu dan dashboard).
* `sweetalert2`: Membuat *popup alert* dan konfirmasi yang cantik (digunakan saat hapus data & logout).
* `xlsx`: Untuk membaca file Excel (Import) dan mengekspor tabel ke file Excel (Download Template).
* `zustand`: State management global yang ringan untuk menyimpan data sesi pengguna yang sedang login (`useAppStore`).

### Dependencies Tambahan (Sesuai PRD & Tech Stack):
Untuk fitur ekspor Kwitansi ke PDF dan Keamanan (Passkey Encryption) di masa mendatang, Anda juga perlu menginstal:

```bash
npm install jspdf jspdf-autotable crypto-js
```

---

## 3. Cara Menjalankan Aplikasi

Setelah semua instalasi selesai, Anda membutuhkan 2 terminal yang berjalan bersamaan:

1. **Terminal 1 (Menjalankan Backend):**
   `node server/server.js` (atau `nodemon server/server.js` jika menggunakan nodemon)

2. **Terminal 2 (Menjalankan Frontend):**
   `npm run dev`