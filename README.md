# S.C.P Alliance

Website komunitas Delta Force Mobile dengan tema Emerald Protocol. Enam menu, profil anggota, pencarian/filter, jadwal WIB, protokol komunitas beserta PDF, serta panel admin berbasis Supabase.

## Menjalankan

Website dapat langsung dihosting sebagai file statis. Untuk pratinjau lokal dan build gunakan Node.js 24.x:

```sh
npm run dev
```

Buka `http://127.0.0.1:4173`. Tidak ada dependensi yang perlu diinstal. Muat ulang browser setelah mengedit file.

```sh
npm run check
npm run build
```

Hasil siap hosting berada di `dist/`. Build hanya menyertakan file publik yang dibutuhkan, bukan gambar sumber besar atau berkas pemeriksaan.

## Deployment Vercel

`vercel.json` harus berada di root repository, sejajar dengan `package.json`. Konfigurasi tersebut menetapkan Framework Preset **Other**, Build Command **npm run build**, dan Output Directory **dist**, sehingga Vercel menggunakan hasil build yang benar. Versi Node ditetapkan ke **24.x** melalui `package.json`.

Jika memakai integrasi GitHub, unggah/commit `vercel.json` dan `package.json` terbaru ke branch yang terhubung dengan Vercel. Deployment berikutnya akan membaca konfigurasi baru; Redeploy pada commit lama tidak menyertakan file perbaikan. Root Directory proyek Vercel harus menunjuk folder yang berisi kedua file ini (root repo untuk susunan saat ini).

Pesan `No Output Directory named "public" found` berarti build selesai tetapi Vercel mencari folder output yang salah. Pengaturan `outputDirectory` di `vercel.json` menggantikan nilai Output Directory pada dashboard. Tidak perlu mengganti nama `dist` menjadi `public` atau mengunggah ulang seluruh aset. Tanda silang Vercel pada commit GitHub adalah status deployment yang gagal, bukan kegagalan unggahan GitHub.

Dokumentasi: [konfigurasi output Vercel](https://vercel.com/docs/project-configuration/vercel-json#outputdirectory) dan [versi Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Mengedit konten

Setelah Supabase diaktifkan, buka `/admin/` untuk menambah, mengedit, mengurutkan, menerbitkan, dan menghapus anggota atau jadwal tanpa menyentuh kode. Foto anggota diunggah dari formulir yang sama. Ikuti panduan satu kali di `supabase/README.md` untuk memasang skema, data awal, akun admin, serta Environment Variables Vercel. Selama Supabase belum dikonfigurasi atau tidak dapat dijangkau, website publik tetap memakai 12 anggota dan tiga jadwal bawaan.

- `index.html`: isi menu, founder, kartu anggota dan jadwal cadangan, serta tautan komunitas.
- `team-data.js`: detail dossier cadangan ketika database belum tersedia.
- `roster-policy.js`: aturan status yang digunakan bersama oleh website dan admin; status Main memerlukan komitmen yang diisi.
- `membership.css`: tampilan Protokol, penjelasan roster, asal clan, dan komitmen.
- `assets/docs/scp-alliance-protocol-v1.pdf`: aturan komunitas versi 1.1, 7 September 2026; unduhan dari menu Protokol.
- `schedule.js`: data jadwal cadangan, jadwal dinamis, dan ekspor kalender.
- `data-runtime.js`: memuat data terbit dari Supabase dan mengganti konten cadangan secara aman.
- `admin/`: panel pengelolaan anggota, foto, dan jadwal.
- `supabase/`: skema aman, data awal, serta petunjuk aktivasi.
- `style.css`: warna, tipografi, layout responsif, dan efek glitch.
- `boot.js`: intro logo, persentase persiapan dan loading bar putih; Escape untuk melewati, dengan batas waktu otomatis 3,2 detik.
- `protocol.js`: transisi wipe enam lapis dan stroke responsif pada bingkai halaman/navigasi.
- `assets/fonts/`: salinan WOFF dari P-Bold dan P-Med yang diberikan pengguna; bentuk huruf dan metrik dipertahankan.
- `assets/`: gambar WebP desktop/ponsel. Gambar sumber asli tetap tersedia di direktori utama.

Supabase bersifat opsional dan hanya aktif setelah konfigurasi publik tersedia saat build. Pendaftaran tetap memakai formulir asli; pengajuan scrim diarahkan ke Discord. Kalender memakai UTC yang ekuivalen dengan WIB dan mendukung jadwal mingguan maupun tanggal khusus. Akhir pertandingan Sabtu bawaan sengaja tidak ditentukan.

## Keanggotaan dan roster kompetitif

Menu **Protokol** (`#rules`) menjelaskan identitas aliansi, alur bergabung, trial, kriteria seleksi, komitmen event, perilaku anggota, dan peninjauan keputusan. Aturan dapat dibaca langsung tanpa mengunduh dokumen. Versi 1.1 menyederhanakan bahasa tanpa mengubah aturan. SCP berdiri akhir Maret 2026; tanggal revisi dokumen tetap 7 September 2026. PDF memakai versi yang sama; saat mengubah kebijakan, perbarui keduanya dan umumkan kepada anggota.

**SCP Main Roster** menggantikan istilah Pure Roster. Posisi dipilih dari seluruh anggota berdasarkan performa sesuai peran, kerja sama, kehadiran, dan komitmen yang disepakati; asal clan dicatat terpisah. KPM 2.0+ merupakan acuan awal penyerang, bukan ambang wajib semua peran. **The Alliance** menampung anggota lainnya; kontribusi anggota awal tetap dihormati.

Semua 12 anggota bawaan tetap memiliki identitas dan statistik sebelumnya, dan sekarang tercatat sebagai The Alliance. Belum ada pemain yang dinyatakan lolos seleksi Main. Kolom clan dibiarkan kosong sampai dikonfirmasi; nickname bukan bukti asal clan. Galeri Main menampilkan penjelasan seleksi selama belum diisi.

Setelah Supabase tersedia, buka **Admin → Anggota → Edit**. Isi asal clan bila diketahui. Pilih **SCP Main Roster** hanya setelah seleksi dan persetujuan pemain, lalu isi **Periode / event komitmen**, misalnya nama event dan tanggal yang sudah disepakati. Isian ini tampil publik: jangan memasukkan kontak pribadi atau strategi. Setelah periode berakhir, evaluasi ulang dan ubah kembali ke Alliance bila komitmen tidak diperpanjang. Website tidak menafsirkan tanggal dari catatan tersebut secara otomatis.

Keanggotaan Main bukan penetapan starter untuk semua event. Pengurus tetap mengonfirmasi tim yang dibela, jadwal, peran, pemain utama/cadangan, dan ketentuan penyelenggara sebelum registrasi. Jadwal publik juga bukan daftar pemain yang sudah menyatakan hadir. Kelayakan DFNC harus diperiksa pada rulebook edisi yang dituju.

Untuk database lama, jalankan **schema.sql saja** sebelum menggunakan field baru. Migrasi mengubah nilai lama `pure` menjadi `alliance`, mempertahankan ID dan data anggota, serta menjaga Main yang sudah dikonfirmasi saat dijalankan ulang. Jangan menjalankan ulang seed hanya untuk upgrade; seed merupakan data awal dan dapat menimpa konten. Petunjuk lengkap ada di `supabase/README.md`.

## Berkas untuk GitHub

Unggah sumber terbaru: `index.html`, seluruh file `.js` dan `.css` aplikasi di root, `package.json`, `vercel.json`, folder `assets/` (termasuk `fonts/` dan `docs/`), `admin/`, dan `scripts/`. Sertakan `supabase/` dan README untuk persiapan database. Pertahankan `delta_force_logo.png` dan `og.png`. Jangan mengunggah `.env`, `qa/`, atau `node_modules/`. Folder `dist/` tidak diperlukan pada integrasi GitHub–Vercel karena dibuat oleh build. Website tetap berjalan tanpa akun Supabase; panel admin baru dapat menyimpan setelah setup selesai.

## Bahasa

Website publik memiliki pilihan **Indonesia**, **English**, dan **简体中文** (Mandarin dengan aksara sederhana). Pilihan berada di header, tersimpan pada perangkat, dan dapat dibagikan melalui `?lang=en#rules` atau `?lang=zh-CN#rules`. Bahasa awal tetap Indonesia. Pergantian bahasa mempertahankan halaman aktif dan pengaturan efek.

`i18n-data.js` menyimpan pasangan teks Indonesia, Inggris, dan Mandarin; `i18n.js` menerapkannya pada teks tanpa mengganti elemen interaktif. `i18n.css` menata kontrol bahasa dan menyediakan font sistem yang mendukung Mandarin sebagai pelengkap font SCP. Tidak ada layanan terjemahan atau font eksternal yang dipanggil.

Seluruh menu publik, aturan, profil bawaan, pencarian, pesan antarmuka, dan template scrim tersedia dalam tiga bahasa. Nama/nickname, alias, clan, ID dan angka statistik tetap asli. Semua jadwal tetap **WIB / UTC+7**, termasuk ekspor kalender; hanya bahasa tanggal dan keterangannya yang berubah. SCP disebut berbasis di Indonesia, tanpa mengklaim sebagai organisasi global.

Panel admin dan PDF unduhan masih berbahasa Indonesia. Tombol PDF menjelaskan bahasa dokumen pada tampilan Inggris dan Mandarin. Teks baru yang ditulis lewat admin ditampilkan sesuai bahasa penulisnya kecuali padanannya ditambahkan ke kamus; tidak ada terjemahan otomatis untuk data yang belum ditinjau.

Untuk update GitHub ini, sertakan file baru `i18n.js`, `i18n-data.js`, `i18n.css`, beserta perubahan `index.html`, `script.js`, `protocol.js`, `schedule.js`, `data-runtime.js`, `scripts/build.mjs`, `scripts/check.mjs`, `scripts/check-i18n.mjs`, dan README. Kamus disertakan dalam build statis, sehingga fitur tetap berjalan tanpa Supabase.

## Detail taktis Delta Force

`tactical.css` mengadaptasi panel gelap, aksen hijau, garis instrumen, dan respons hover dari referensi resmi [Delta Force](https://df.qq.com/cp/a20240906main/index.html). Bingkai header, foto komunitas, font P-Med/P-Bold, pilihan bahasa, dan interaksi roster tetap dipertahankan. Nomor bagian yang tipis bersifat dekoratif; ikon pada ringkasan Beranda memakai vektor.

Satu aset resmi berukuran 2,166 byte disimpan lokal di `assets/df/technical-divider.png`; sumbernya dicatat di `assets/df/README.md`. Website tidak memanggil server Tencent untuk memuat aset ini. Tidak ditambahkan video latar, framework, pelacak, atau skrip dari referensi. Efek hover kartu menggunakan transform kecil selama 350 ms dan tetap menghormati pengaturan efek serta reduced motion.

Untuk update visual ini, unggah `index.html`, `tactical.css`, `scripts/build.mjs`, folder `assets/df/`, dan `README.md`. Pertahankan struktur folder; Vercel membangun ulang `dist/` secara otomatis.

## Perilaku

Tautan `#hero`, `#about`, `#founders`, `#objectives`, `#scrim`, dan `#rules` dapat dibagikan langsung. Navigasi mendukung tombol Back/Forward browser dan highlight emerald pada menu aktif. Intro muncul saat pemuatan dokumen, bisa dilewati dengan Escape, dan memiliki batas 3,2 detik jika aset lambat. Profil memakai dialog native dengan fokus keyboard dan Escape; lima statistik tampil lebih dahulu, dengan animasi bar dan glitch ketika dibuka. Preferensi efek tersimpan lokal, sedangkan reduced motion perangkat selalu dihormati. Tanpa JavaScript, semua menu tetap dapat dibaca; intro dan fitur interaktif tambahan disembunyikan.

Tidak digunakan framework runtime karena halaman ini statis dan kebutuhan interaksinya kecil. CSS responsif, WebP, font WOFF lokal, lazy loading, dan skrip defer menjaga akses tetap ringan. Intro menunggu kesiapan aplikasi, gambar hero, dan dua font; tetap ditutup otomatis saat batas waktu tercapai. Efek nonaktif atau reduced motion melewati intro dan animasi profil.

Intro memakai logo ringkas, persentase, dan bar putih bersegmen dengan rel atas-bawah. Konten Beranda disiapkan di balik intro, lalu latar, judul, teks dan tombol muncul bertahap setelah dialog tertutup. Saat kembali lewat navigasi, urutan ini dimulai setelah wipe selesai. Perubahan halaman, efek nonaktif, dan tab tersembunyi membersihkan animasi agar konten tidak tertahan.

Perpindahan menu memakai wipe glitch sekitar 670 ms. Klik beruntun mengikuti tujuan terbaru; URL, panel, dan judul diperbarui ketika layar tertutup. Menonaktifkan efek atau berpindah tab langsung menyelesaikan transisi dan mengembalikan interaksi. Garis bingkai mengikuti ukuran halaman melalui ResizeObserver tanpa mengubah ketebalan stroke.

Highlight navigasi desktop memakai kontur SVG yang sama dengan bingkainya, dengan inset 4 px. Bentuk sisi miring dan lengkung tetap sejajar saat ukuran layar atau lebar teks berubah.

Galeri anggota memakai kartu ringkas dalam jalur horizontal. SCP Main Roster bergerak ke kiri dan The Alliance ke kanan; keduanya mendukung drag mouse serta swipe touchscreen dengan momentum. Hover atau fokus menghentikan jalur agar kartu mudah dibuka. Klik/tap dibedakan dari gerakan seret. Pencarian mencakup nickname, peran, ID, dan asal clan. Status kosong Main tetap menjelaskan proses seleksi; reduced motion memakai scroll horizontal biasa.

Profil mempertahankan ukuran akhirnya, masuk dengan fade dan pergeseran singkat 240 ms dari arah kartu. Identitas dan statistik menyusul bersamaan; gambar memakai aset yang sudah dimuat oleh kartu. X, Escape, dan klik backdrop menutupnya dalam 170 ms; fokus serta posisi scroll dipertahankan. Tidak ada animasi skala/potongan seluruh panel atau blur layar. Penutupan memiliki batas 240 ms, mendukung reduced motion, dan langsung selesai jika berpindah menu. Callback lama tidak memengaruhi profil yang baru dibuka. Visual taktis memakai aset pengguna sebagai dekorasi; data profil tetap berasal dari komunitas.

Dekorasi ambient mencakup beacon berdenyut, plus berputar dengan jeda, garis telemetri, glow SCP dan aksen kecil pada menu lain. Loop hanya mengubah opacity/transform; efek berhenti saat intro, halaman tersembunyi, tab tidak aktif, atau profil terbuka. Pengaturan efek nonaktif dan reduced motion menghentikan seluruh gerakan dekoratif.

Header dan setiap halaman menggunakan variabel jarak tepi yang sama. Ujung stroke kiri/kanan bertemu tepat pada batas header, dan stroke kanan memanjang sampai tepi atas; ukuran diperbarui ketika viewport berubah.
