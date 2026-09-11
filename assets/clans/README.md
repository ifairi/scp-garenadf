# Menambahkan logo clan di Alliance Network

Logo tampil di menu **Tim → Alliance Network**. NOTS sudah dipasang memakai file asli dari pengguna. Ukuran tampilan dibatasi sekitar 92 px tinggi pada desktop dan 78 px pada ponsel, tanpa memotong atau mengubah warna logo.

## Cara manual

1. Simpan logo baru ke folder `assets/clans/`. Gunakan PNG transparan, WebP, atau SVG, dengan nama sederhana tanpa spasi, misalnya `nama-clan.png`.
2. Buka `index.html`, cari `assets/clans/nots.png`.
3. Salin seluruh kartu NOTS dari `<li class="clan-node clan-node--logo">` sampai `</li>`. Tempel di dalam `<ul class="clan-network__list">`, setelah kartu yang sudah ada. Kamu juga bisa mengganti satu baris kosong yang bertuliskan `CREST PENDING`.
4. Ganti nama file, nomor node, serta nama clan seperti contoh di bawah. Sesuaikan `width` dan `height` dengan ukuran asli gambar; CSS otomatis mengatur ukuran tampilannya.
5. Unggah `index.html` dan file logo baru ke GitHub dengan struktur folder yang sama. Tidak perlu mengunggah `dist/`.

```html
<li class="clan-node clan-node--logo">
  <img class="clan-node__logo"
       src="assets/clans/nama-clan.png"
       alt="" width="600" height="600"
       loading="lazy" decoding="async">
  <span class="clan-node__copy">
    <small>NODE / 02</small>
    <strong translate="no">NAMA CLAN</strong>
  </span>
</li>
```

`alt` dikosongkan karena nama clan sudah tertulis tepat di bawah logo. `translate="no"` menjaga nama clan tetap asli ketika bahasa website diganti. Kartu bisa digeser secara horizontal jika jumlahnya melebihi lebar layar.

Tidak perlu mengubah JavaScript, kamus bahasa, atau database saat menambahkan logo. Label registry tidak lagi memakai hitungan slot manual. Ukuran bersama semua logo dapat diatur melalui `.clan-node__logo` di `style.css`.
