# S.C.P Alliance

Website komunitas Delta Force Mobile dengan tema Emerald Protocol. Lima menu, profil 12 anggota, pencarian/filter, dan jadwal rutin dalam WIB.

## Menjalankan

Website dapat langsung dihosting sebagai file statis. Untuk pratinjau lokal gunakan Node.js 20 atau lebih baru:

```sh
npm run dev
```

Buka `http://127.0.0.1:4173`. Tidak ada dependensi yang perlu diinstal. Muat ulang browser setelah mengedit file.

```sh
npm run check
npm run build
```

Hasil siap hosting berada di `dist/`. Build hanya menyertakan file publik yang dibutuhkan, bukan gambar sumber besar atau berkas pemeriksaan.

## Mengedit konten

- `index.html`: isi menu, founder, kartu anggota, jadwal, dan tautan komunitas.
- `team-data.js`: detail dossier anggota. Pertahankan ID agar cocok dengan kartu pada HTML.
- `schedule.js`: jadwal rutin dan ekspor kalender. Perubahan jam/hari juga harus disamakan dengan tampilan di HTML.
- `style.css`: warna, tipografi, layout responsif, dan efek glitch.
- `boot.js`: intro pembuka, tombol Lewati, dan batas waktu otomatis 3,2 detik.
- `protocol.js`: transisi wipe enam lapis dan stroke responsif pada bingkai halaman/navigasi.
- `assets/fonts/`: salinan WOFF dari P-Bold dan P-Med yang diberikan pengguna; bentuk huruf dan metrik dipertahankan.
- `assets/`: gambar WebP desktop/ponsel. Gambar sumber asli tetap tersedia di direktori utama.

Tidak ada backend atau pengiriman formulir otomatis. Pendaftaran memakai formulir asli; pengajuan scrim diarahkan ke Discord. Jadwal merupakan rutinitas, bukan konfirmasi pertandingan. Kalender memakai UTC yang ekuivalen dengan WIB, berulang mingguan, dengan status tentative. Akhir pertandingan Sabtu sengaja tidak ditentukan.

## Perilaku

Tautan `#hero`, `#about`, `#founders`, `#objectives`, dan `#scrim` dapat dibagikan langsung. Navigasi mendukung tombol Back/Forward browser. Intro muncul saat pemuatan dokumen, bisa dilewati, dan memiliki batas 3,2 detik jika aset lambat. Profil memakai dialog native dengan fokus keyboard dan Escape; lima statistik tampil lebih dahulu, dengan animasi bar dan glitch ketika dibuka. Preferensi efek tersimpan lokal, sedangkan reduced motion perangkat selalu dihormati. Tanpa JavaScript, semua menu tetap dapat dibaca; intro dan fitur interaktif tambahan disembunyikan.

Tidak digunakan framework runtime karena halaman ini statis dan kebutuhan interaksinya kecil. CSS responsif, WebP, font WOFF lokal, lazy loading, dan skrip defer menjaga akses tetap ringan. Intro menunggu kesiapan aplikasi, gambar hero, dan dua font; tetap ditutup otomatis saat batas waktu tercapai. Efek nonaktif atau reduced motion melewati intro dan animasi profil.

Perpindahan menu memakai wipe glitch sekitar 670 ms. Klik beruntun mengikuti tujuan terbaru; URL, panel, dan judul diperbarui ketika layar tertutup. Menonaktifkan efek atau berpindah tab langsung menyelesaikan transisi dan mengembalikan interaksi. Garis bingkai mengikuti ukuran halaman melalui ResizeObserver tanpa mengubah ketebalan stroke.

Galeri anggota memakai dua kolom di atas 800 px dan satu kolom di ponsel. Animasi mask, zoom gambar, dan teks masuk diputar saat kartu kembali terlihat; kolom kanan menyusul 100 ms. Scroll tetap alami, sementara penghitung dan tombol panah mengikuti baris yang terlihat, termasuk hasil pencarian berjumlah ganjil.

Profil mengembang dari kartu dan menampilkan lima statistik. X, Escape, dan klik backdrop menutupnya dengan animasi 420 ms kembali ke posisi kartu; fokus serta posisi scroll dipertahankan. Penutupan memiliki batas 500 ms, mendukung reduced motion, dan langsung selesai jika berpindah menu. Callback lama tidak memengaruhi profil yang baru dibuka. Visual taktis memakai aset pengguna sebagai dekorasi; data profil tetap berasal dari komunitas.

Header dan setiap halaman menggunakan variabel jarak tepi yang sama. Ujung stroke kiri/kanan bertemu tepat pada batas header, dan stroke kanan memanjang sampai tepi atas; ukuran diperbarui ketika viewport berubah.
