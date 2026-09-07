# Supabase untuk SCP Alliance

Folder ini menyiapkan database anggota, jadwal, akun admin, dan penyimpanan foto. Website publik hanya dapat membaca data yang berstatus `published = true`. Akun yang tercatat di `admin_users` dapat melihat draf dan mengubah konten.

## 1. Buat project Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) lalu pilih **New project**.
2. Simpan database password di tempat aman.
3. Tunggu project selesai dibuat.

## 2. Pasang skema dan data awal

Di Supabase Dashboard, buka **SQL Editor**.

1. Buat query baru, salin seluruh isi `schema.sql`, lalu tekan **Run**.
2. Buat query baru lagi, salin seluruh isi `seed.sql`, lalu tekan **Run**.

Untuk database versi lama, jalankan **schema.sql saja**. Migrasi menambahkan `clan_origin` dan `commitment_scope`, mengganti status lama `pure` menjadi `alliance`, serta menjaga ID dan data anggota. Main Roster yang sudah dikonfirmasi tetap dipertahankan ketika skema dijalankan ulang. Jangan jalankan seed untuk upgrade.

`seed.sql` memindahkan 12 dossier dan tiga jadwal rutin yang saat ini ada di website. Menjalankannya ulang akan mengembalikan isi dossier dan jadwal pada baris yang sama; status roster, clan asal, dan komitmen yang sudah diisi tetap dipertahankan. Semua anggota baru dari seed masuk The Alliance, tanpa menyimpulkan clan asal dari nickname.

Setelah selesai, **Table Editor** akan menampilkan:

- `members`: dossier, jenis roster, kategori, statistik, urutan, foto, dan status publik.
- `schedule_entries`: jadwal mingguan atau acara satu kali.
- `admin_users`: daftar akun yang diizinkan mengelola konten.

Storage akan memiliki bucket publik `member-photos`. File dapat dilihat melalui URL publik, sedangkan daftar file, upload, penggantian, dan penghapusan hanya diperbolehkan untuk admin.

## 3. Buat admin pertama

Pendaftaran pengguna umum tidak diperlukan.

1. Buka **Authentication → Users → Add user → Create new user**.
2. Isi email dan password admin. Aktifkan konfirmasi email pada form tersebut jika tersedia.
3. Buka pengguna yang baru dibuat, lalu salin nilai **User UID**.
4. Di **SQL Editor**, jalankan query berikut setelah mengganti UUID dan nama:

```sql
insert into public.admin_users (user_id, display_name)
values ('GANTI-DENGAN-USER-UID'::uuid, 'Administrator SCP')
on conflict (user_id) do update
set display_name = excluded.display_name;
```

Pembuatan admin sengaja hanya dilakukan melalui SQL Editor. Pengunjung dan JavaScript browser tidak mempunyai izin untuk menambahkan dirinya sendiri sebagai admin.

Untuk mencabut akses admin tanpa menghapus akun login:

```sql
delete from public.admin_users
where user_id = 'GANTI-DENGAN-USER-UID'::uuid;
```

## 4. Ambil konfigurasi website

Buka dialog **Connect** pada project Supabase dan salin:

- **Project URL** sebagai `SUPABASE_URL`.
- **Publishable key** sebagai `SUPABASE_PUBLISHABLE_KEY`.

Jika ingin memilih atau membuat key tertentu, buka **Settings → API Keys**. Gunakan key berawalan `sb_publishable_...`; project lama juga dapat memakai legacy `anon` key, tetapi publishable key adalah pilihan terbaru.

Masukkan kedua nilai itu ke Environment Variables project Vercel untuk **Production**, **Preview**, dan **Development**, lalu lakukan deployment ulang satu kali. Publishable key memang digunakan oleh browser; pembatasan akses tetap dijaga oleh Row Level Security.

Jangan memasukkan secret key (`sb_secret_...`) atau legacy `service_role` key ke source code, file konfigurasi frontend, GitHub, maupun Vercel untuk website ini. Kunci tersebut melewati seluruh Row Level Security dan tidak dibutuhkan oleh panel admin.

Untuk pengujian lokal, salin `.env.example` menjadi `.env.local`, isi dua nilai tersebut, lalu jalankan `npm run dev`. File `.env.local` diabaikan Git. Setelah terhubung, panel tersedia di `http://127.0.0.1:4173/admin/`; pada domain produksi gunakan `/admin/`.

## 5. Aturan data

### Anggota

- `code` memakai format seperti `SCP-013`.
- `roster_type = main` menandai SCP Main Roster setelah seleksi dan kesepakatan komitmen. `alliance` adalah keanggotaan The Alliance dan menjadi nilai awal.
- `clan_origin` adalah nama clan yang dikonfirmasi pemain, maksimum 120 karakter; boleh kosong. Jangan mengambilnya otomatis dari nickname atau riwayat.
- `commitment_scope` mencatat periode/event yang disepakati, maksimum 240 karakter. Wajib berisi teks untuk Main Roster. Informasi ini tampil di dossier publik; jangan isi kontak pribadi.
- Susunan utama/cadangan dan ketersediaan setiap event tetap dikonfirmasi melalui pengurus sebelum pendaftaran. Label Main Roster tidak menggantikan konfirmasi tersebut.
- Aplikasi bisa membaca database lama tanpa kolom baru; untuk menyimpan perubahan admin, jalankan skema terbaru terlebih dahulu.
- `role_groups` berisi satu atau beberapa kategori: `vehicle`, `engineer`, `recon`, `assault`, `support`, `command`, atau `other`.
- `track`, `strengths`, dan `stats` adalah array JSON. Bentuk seed dipertahankan agar cocok dengan dossier website saat ini.
- `sort_order` menentukan urutan kartu. Angka lebih kecil tampil lebih awal.
- `published = false` menyimpan anggota sebagai draf.

### Jadwal

- `schedule_kind = weekly` memakai `weekday` dari `0` untuk Minggu sampai `6` untuk Sabtu. `event_date` harus kosong.
- `schedule_kind = event` memakai `event_date`. `weekday` harus kosong.
- Semua jam dibaca sebagai zona waktu `Asia/Jakarta` atau WIB.
- `end_open = true` berarti waktu selesai belum ditentukan dan `end_time` harus kosong.
- Status yang tersedia: `scheduled`, `seeking_opponent`, `confirmed`, `completed`, dan `cancelled`.
- `published = false` menyimpan jadwal sebagai draf.

## 6. Penyimpanan foto

Upload foto ke bucket `member-photos` dengan pola object key berikut:

```text
members/<kode-dossier>/<nama-file>.webp
```

Contoh:

```text
members/SCP-022/profile.webp
```

Simpan object key tersebut pada `members.photo_path`, bukan URL lengkap. Website membentuk URL publik dengan:

```js
const { data } = supabase.storage
  .from('member-photos')
  .getPublicUrl(member.photo_path);

const photoUrl = data.publicUrl;
```

Bucket menerima JPEG, PNG, WebP, dan AVIF dengan ukuran maksimum 8 MB. Gunakan WebP atau AVIF yang sudah diperkecil agar galeri tetap cepat di ponsel.

## 7. Pemeriksaan keamanan singkat

Sebelum menghubungkan panel admin, periksa hasil berikut:

1. Saat belum login, query `members` dan `schedule_entries` hanya mengembalikan baris terbit.
2. Saat login dengan akun biasa yang tidak ada di `admin_users`, operasi tambah, edit, dan hapus ditolak.
3. Saat login sebagai admin, draf terlihat dan operasi tambah, edit, hapus, serta upload foto berhasil.
4. Saat belum login, URL publik foto dapat dibuka tetapi daftar isi bucket tidak dapat diambil melalui API.

RLS tetap menjadi batas keamanan utama. Menyembunyikan tombol admin di tampilan bukan pengganti aturan database.
