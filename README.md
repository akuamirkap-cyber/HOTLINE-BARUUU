# HOT//LINE

Game action top-down dengan gaya kristal, mode SUPERHOT, focus slow-motion, dan enam lantai.

## Jalankan

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Vite berjalan di port 3000. `npm run build` menghasilkan `dist/index.html` mandiri, termasuk font lokal.

## Kontrol PC

- WASD / panah: gerak; mouse: arahkan.
- Klik kiri: serang / tembak; F atau E: tendang.
- Spasi: sandera, lempar sandera, eksekusi atau sprint sesuai konteks.
- Klik kanan: ambil / lempar senjata; tahan C / roda mouse: focus.
- T: mode SUPERHOT; N: matikan semua slow-motion.
- Esc: pause / lanjut; Q saat pause: keluar; R: restart.

## Kontrol mobile

Kontrol muncul otomatis pada perangkat layar sentuh. Di PC, gunakan **PERLIHATKAN TOMBOL MOBILE** pada menu atau toolbar di dalam game untuk menampilkan atau menyembunyikannya.

- Joystick kiri: gerak analog.
- Joystick kanan: bidik sekaligus serang otomatis, termasuk pistol semi-otomatis dan combo tinju.
- Tombol TENDANG, AKSI, LEMPAR / AMBIL, serta FOKUS (tahan).
- Pause, lanjut, restart, hasil level dan keluar dapat disentuh langsung.

Perangkat sentuh dalam portrait menampilkan **PUTAR PERANGKATMU** dan membekukan gameplay sampai landscape. Fullscreen dan landscape-lock dicoba saat mulai/pilih lantai, tetapi dukungannya tergantung browser. Jika diblokir, putar perangkat secara manual. Input multi-touch memakai pointer capture dan dibersihkan saat pause, rotasi, kehilangan fokus atau kontrol disembunyikan.

## Baseball dan proporsi karakter

Pukulan baseball pertama melontarkan musuh tanpa membunuh. Pukulan baseball kedua atau benturan dengan tembok solid memecahkannya. Musuh yang terlempar baru menghantam musuh lain saat tubuhnya benar-benar menyentuh mereka; tidak ada damage area instan dari ayunan. Furnitur bukan tembok solid.

Kaki dipusatkan dari pinggul x=-1 ke telapak x=-6. Lengan lebih atletis, torso lebih kecil dan berpinggang ramping. Semua pose memakai telapak oval berskala 66%, jempol, lipatan buku jari dan highlight kristal.

## Rooftop / BIG BOSS

Lantai keenam terbuka setelah menyelesaikan PENTHOUSE. Save lama yang sudah menyelesaikan PENTHOUSE otomatis memperoleh akses.

Arena helipad memiliki kaca dekoratif, pilar `#` yang benar-benar menahan peluru dan pandangan, sniper `Z` di sisi terbuka, katana `K` di tengah dan shotgun `2` dekat pintu masuk. BIG BOSS `B` menghadap pintu masuk dan memakai M16 otomatis dengan burst akurat. Peluru rifle yang mengenai pemain membunuh dalam satu hit; gunakan pilar, focus dan dash-dodge. Spawn berada di bay masuk yang terlindung, dan arena ini tidak memberi starter loadout gratis.

## Pemeriksaan

```sh
npm run typecheck
npm test
npm run build
```

Tes mencakup baseball, benturan tubuh dan cover, input joystick, pembersihan input, serangan boss, akses pickup rooftop, proporsi tangan/kaki dan penyimpanan hasil level. Font SIL OFL disertakan beserta lisensi pada `src/assets/fonts/`.
