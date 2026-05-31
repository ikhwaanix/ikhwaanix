# 🔄 Tutorial Rilis Pembaruan (Update) Aplikasi Ikhwan 9

Karena Aplikasi Ikhwan 9 berjalan di dua perangkat berbeda (Windows & Android), maka cara mengirim pembaruannya ke pengguna juga dibagi menjadi dua langkah mudah.

Anda **wajib menaikkan versi** di file `package.json` (misalnya `"version": "1.0.0"` menjadi `"1.0.1"`) setiap kali sebelum melakukan pembaruan di bawah ini.

---

## A. Update Aplikasi Android (via Capgo OTA)

Sistem Android menggunakan Capgo. Ini sangat luar biasa karena pembaruan hanya berupa file web, sehingga akan terunduh secara senyap tanpa mengganggu pengguna dan tanpa peringatan "*Install Unknown Sources*".

**Langkah-langkah Rilis Android:**
1. Buka Terminal (CMD / VS Code).
2. Lakukan *build* UI web terbaru dengan perintah:
   ```bash
   npm run build
   ```
3. Kirim pembaruan ke HP anggota dengan perintah:
   ```bash
   npx @capgo/cli bundle upload com.ikhwaanix.app --channel production
   ```
*(Selesai! Saat anggota me-restart aplikasinya di HP, tampilannya otomatis berubah).*

---

## B. Update Aplikasi Windows EXE (via GitHub Releases)

Sistem Windows menggunakan GitHub. Aplikasi di komputer anggota akan otomatis mendownload file *installer* di latar belakang dan menginstal dirinya sendiri.

**Langkah-langkah Rilis Windows:**
1. Buka Terminal (CMD / VS Code).
2. Lakukan *build* file EXE dengan perintah:
   ```bash
   npm run build:electron
   ```
3. Buka folder `dist_electron` dan temukan file `Aplikasi Ikhwan 9 Setup x.x.x.exe`.
4. Buka *browser*, masuk ke akun GitHub Anda, lalu buka halaman repositori proyek ini.
5. Klik **Releases** -> **Draft a new release**.
6. Di bagian *Tag*, tuliskan versi baru Anda (contoh: `v1.0.1`). Pastikan depannya menggunakan huruf `v`.
7. Di bagian judul (*Release title*), tulis: `Versi 1.0.1`.
8. Di kotak deskripsi, tulis fitur apa saja yang baru.
9. *Drag & Drop* (Tarik) file `Aplikasi Ikhwan 9 Setup x.x.x.exe` ke kotak bagian bawah (Attach binaries).
10. Klik tombol **Publish release**.

*(Selesai! Semua PC anggota yang terkoneksi internet akan otomatis mendapat peringatan *update*).*

---

## 🛡️ Alur Kerja Aman (Safe Workflow)

Sangat penting untuk memastikan aplikasi yang sudah dipakai anggota tidak rusak saat Anda mengedit kode. Ikuti aturan ini:

### 1. Bereksperimenlah di Localhost (Aman 100%)
Saat Anda mengubah kode di VS Code, jalankan perintah ini di terminal:
```bash
npm run dev
```
Buka browser di `http://localhost:5173`. Semua perubahan yang Anda lihat di sini **TIDAK AKAN** merubah HP/PC anggota. Anda bebas mencoba warna, tombol, atau fitur baru tanpa takut merusak aplikasi utama. Pengaturan API juga akan otomatis menyesuaikan.

### 2. Apa yang Terjadi Saat Anda Menjalankan Build/Upload?
Selama Anda hanya menjalankan `npm run dev`, kode Anda belum pergi ke mana-mana. Namun, jika Anda mengeksekusi perintah di bawah ini, barulah sistem mulai mendistribusikan kode Anda:

- **`npm run build`**: Menyusutkan dan menggabungkan ribuan baris kode Anda menjadi satu paket kecil (folder `dist`). Ini **belum** dikirim ke mana-mana, baru dibungkus.
- **`npx @capgo/cli bundle upload...`**: Mengambil folder `dist` tadi, mengubahnya jadi `.zip`, dan menerbangkannya ke server *Cloud Capgo*. HP anggota akan langsung mendownload *zip* tersebut diam-diam.
- **`npm run build:electron`**: Mengambil folder `dist` dan memasukkannya ke dalam *cangkang* Chrome Mini menjadi file `Setup.exe`. File `.exe` ini tidak akan sampai ke PC anggota sampai Anda meng-uploadnya ke **GitHub Releases**.

**Kesimpulan:** Selalu tes kode Anda di `npm run dev`. Jika sudah sempurna, baru naikkan angka `"version"` di `package.json`, lalu lakukan *Build* dan *Upload*!
