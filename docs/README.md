# 📚 Life OS Dokümantasyon

Bu klasör Life OS uygulaması için önemli dokümantasyon dosyalarını içerir.

## 📖 İçindekiler

### [I18N.md](./I18N.md)
**Çok dilli destek (Internationalization) rehberi**

Life OS'un 5 farklı dili (İngilizce, Türkçe, İspanyolca, Almanca, Fransızca) nasıl desteklediğini ve yeni dil ekleme adımlarını açıklar.

**Konular:**
- Desteklenen diller
- i18n mimarisi
- Temel kullanım örnekleri
- Yeni dil ekleme adımları
- En iyi pratikler

**Ne zaman kullanmalı:**
- Uygulamaya yeni dil eklemek istediğinizde
- Mevcut çevirileri güncellemek istediğinizde
- i18n sistemini anlamak istediğinizde

---

## 🚀 Hızlı Başlangıç

### Geliştirme Ortamı

```bash
# Bağımlılıkları yükle
bun install

# Veritabanını hazırla
bun run db:push

# Örnek veri ekle (isteğe bağlı)
bun run db:seed

# Geliştirme sunucusunu başlat
bun run dev
```

### Kullanışlı Komutlar

```bash
bun run dev         # Geliştirme sunucusu
bun run build       # Production derlemesi
bun run lint        # Kod kalitesi kontrolü
bun run db:push     # Veritabanı şemasını güncelle
bun run db:seed     # Demo veri ekle
```

### Docker ile Çalıştırma

```bash
bun run docker:up    # Uygulamayı Docker ile başlat
bun run docker:logs  # Logları görüntüle
bun run docker:down  # Durdur
```

---

## 🏗️ Proje Yapısı

```
life-os/
├── src/
│   ├── app/api/           # REST API endpoint'leri (32+)
│   ├── components/        # UI bileşenleri
│   │   ├── ui/           # shadcn/ui temel bileşenler
│   │   └── lifeos/       # Uygulama bileşenleri
│   ├── stores/           # Zustand state yönetimi
│   ├── hooks/            # Özel React hook'ları
│   └── lib/
│       ├── api/          # API client ve TanStack Query
│       ├── i18n/         # Çok dilli destek
│       └── utils.ts      # Yardımcı fonksiyonlar
├── prisma/
│   └── schema.prisma     # Veritabanı şeması
├── docs/                 # Bu klasör
└── README.md            # Ana dokümantasyon
```

---

## 🎨 Özellikler

### 11 Güçlü Modül
- 📊 Dashboard - Genel bakış ve istatistikler
- ✅ Tasks - Görev yönetimi ve Kanban board
- 📝 Notes - Not defteri ve klasörler
- 🔄 Habits - Alışkanlık takibi
- 📔 Journal - Günlük yazma
- 💰 Finance - Finans yönetimi
- 🎯 Goals - Hedef takibi
- 📚 Learning - Öğrenme yolları
- 📅 Calendar - Takvim
- ⏱️ Time Tracker - Zaman takibi ve Pomodoro
- ⚙️ Settings - Ayarlar

### Gelişmiş Tema Sistemi
- 🌓 Karanlık / Aydınlık / Sistem
- 🎨 10+ vurgu rengi + özel renk seçici
- 🌈 8 tema varyantı
- 🔤 Yazı boyutu kontrolü
- 📐 UI yoğunluk seçenekleri
- 🔘 Köşe yuvarlaklığı ayarı
- ✨ Animasyon açma/kapama

### Temel Yetenekler
- ⌘ Komut paleti (`⌘K`)
- 🔍 Global arama
- 🎯 Odak modu (`F11`)
- 📊 Haftalık değerlendirme
- ⌨️ Klavye kısayolları
- 💾 Veri dışa/içe aktarma
- 🌍 5 dil desteği

---

## 🛠️ Teknoloji Stack

| Kategori | Teknoloji |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Dil | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Veritabanı | Prisma ORM + SQLite |
| State | Zustand + TanStack Query |
| Animasyon | Framer Motion |
| Grafikler | Recharts |
| Sürükle-Bırak | @dnd-kit |
| İkonlar | Lucide React |

---

## 📝 Geliştirme Notları

### Veri Akışı
1. **REST API** - `src/app/api/` altındaki route handler'lar
2. **TanStack Query** - `src/lib/api/hooks.ts` içindeki data fetching hook'ları
3. **Zustand** - `src/stores/` içindeki UI state yönetimi

### Tema Sistemi
- `next-themes` ile karanlık/aydınlık mod
- `AccentProvider` ile vurgu rengi ve varyant yönetimi
- CSS değişkenleri ile dinamik renklendirme

### i18n Sistemi
- `src/lib/i18n/` altında tüm çeviriler
- `useTranslation` hook'u ile kullanım
- Parametre interpolasyonu desteği (`{count}`)
- Array değerleri desteği

---

## 🤝 Katkıda Bulunma

Projeye katkıda bulunmak için:

1. Repository'yi fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'feat: yeni özellik eklendi'`)
4. Branch'inizi push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request açın

---

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

## 🙏 Teşekkürler

Life OS aşağıdaki harika açık kaynak projeler sayesinde mümkün oldu:

- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Zustand](https://zustand.docs.pmnd.rs/)
- [TanStack Query](https://tanstack.com/query)
- Ve daha fazlası...

---

<div align="center">

**Life OS ile hayatınızı organize edin! 🧠**

</div>
