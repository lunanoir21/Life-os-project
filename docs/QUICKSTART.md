# 🚀 Life OS - Hızlı Başlangıç

Life OS'u dakikalar içinde çalıştırmaya başlayın!

## ⚡ Hızlı Kurulum

### 1. Gereksinimleri Kontrol Edin

- [Bun](https://bun.sh/) (önerilen) veya Node.js 18+
- Git

### 2. Projeyi İndirin

```bash
git clone https://github.com/yourusername/life-os.git
cd life-os
```

### 3. Bağımlılıkları Yükleyin

```bash
bun install
```

### 4. Veritabanını Hazırlayın

```bash
# Veritabanı şemasını oluştur
bun run db:push

# (İsteğe bağlı) Demo veri ekle
bun run db:seed
```

### 5. Uygulamayı Başlatın

```bash
bun run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

---

## 🐳 Docker ile Çalıştırma

Docker kurulu ise tek komutla başlatabilirsiniz:

```bash
bun run docker:up
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

---

## 🎯 İlk Adımlar

### 1. Kurulum Sihirbazı

İlk açılışta karşınıza çıkacak kurulum sihirbazı ile:

- İsminizi girin
- Dilinizi seçin (TR/EN/ES/DE/FR)
- Tema ve vurgu rengini ayarlayın
- Kullanmak istediğiniz modülleri seçin

### 2. Dashboard'u Keşfedin

Ana sayfada:

- Günlük görevlerinizi görün
- Haftalık aktivitenizi takip edin
- Ruh halinizi kaydedin
- Hızlı kayıt ile yeni öğeler oluşturun

### 3. Modülleri Kullanın

Sol menüden erişebileceğiniz modüller:

- **Tasks** - Görev yönetimi ve Kanban board
- **Notes** - Not alma ve organize etme
- **Habits** - Günlük alışkanlıkları takip
- **Journal** - Günlük tutma
- **Finance** - Gelir-gider takibi
- **Goals** - Hedef belirleme ve takip
- **Learning** - Öğrenme yolları
- **Calendar** - Etkinlik planlama
- **Time Tracker** - Zaman takibi ve Pomodoro

---

## ⌨️ Klavye Kısayolları

| Kısayol | İşlev |
|---------|-------|
| `⌘K` veya `Ctrl+K` | Komut paletini aç |
| `F11` | Odak modunu aç/kapat |
| `⌘F` veya `Ctrl+F` | Global arama |
| `⌘N` veya `Ctrl+N` | Yeni öğe oluştur |
| `Escape` | Dialog'ları kapat |
| `?` | Klavye kısayollarını göster |

---

## 🎨 Temayı Özelleştirin

### Ayarlar Sayfası

`Settings` → `Appearance` bölümünden:

- **Tema**: Karanlık / Aydınlık / Sistem
- **Vurgu Rengi**: 10+ renk seçeneği + özel renk
- **Tema Varyantı**: 8 farklı varyant
- **Yazı Boyutu**: Küçük / Orta / Büyük
- **Yoğunluk**: Sıkışık / Rahat / Geniş
- **Animasyonlar**: Açık / Kapalı

---

## 📊 Verilerinizi Yönetin

### Dışa Aktarma

`Settings` → `Data` → `Export Data`

Tüm verilerinizi JSON formatında indirin.

### İçe Aktarma

`Settings` → `Data` → `Import Data`

Önceden dışa aktardığınız veriyi geri yükleyin.

### Sıfırlama

`Settings` → `Data` → `Reset All Data`

⚠️ Dikkat: Bu işlem geri alınamaz!

---

## 🌍 Dil Değiştirme

`Settings` → `Appearance` → `Language`

Desteklenen diller:
- 🇬🇧 English
- 🇹🇷 Türkçe
- 🇪🇸 Español
- 🇩🇪 Deutsch
- 🇫🇷 Français

---

## 🛠️ Faydalı Komutlar

```bash
# Geliştirme
bun run dev              # Geliştirme sunucusu
bun run build            # Production build
bun run start            # Production sunucu

# Veritabanı
bun run db:push          # Şemayı güncelle
bun run db:seed          # Demo veri ekle
bun run db:reset         # Veritabanını sıfırla

# Kod Kalitesi
bun run lint             # ESLint kontrolü

# Docker
bun run docker:up        # Başlat
bun run docker:down      # Durdur
bun run docker:logs      # Logları göster
```

---

## ❓ Sık Sorulan Sorular

### Veritabanı nerede saklanıyor?

SQLite veritabanı `prisma/dev.db` dosyasında lokal olarak saklanır.

### Internet bağlantısı gerekli mi?

Hayır, Life OS tamamen lokal çalışır. AI Insights özelliği hariç.

### Mobil uyumlu mu?

Evet, responsive tasarım sayesinde mobil cihazlarda da kullanılabilir.

### Verilerim güvende mi?

Evet, tüm veriler cihazınızda lokal olarak saklanır. Herhangi bir sunucuya gönderilmez.

### Birden fazla cihazda kullanabilir miyim?

Export/Import özelliği ile verilerinizi farklı cihazlara taşıyabilirsiniz.

---

## 📚 Daha Fazla Bilgi

- [Ana README](README.md) - Detaylı proje bilgisi
- [Dokümantasyon](docs/) - Teknik dokümantasyon
- [I18N Rehberi](docs/I18N.md) - Çok dilli destek

---

## 🆘 Yardıma mı İhtiyacınız Var?

Sorun mu yaşıyorsunuz? Şu adımları deneyin:

1. **Veritabanını sıfırlayın**: `bun run db:reset`
2. **Bağımlılıkları yeniden yükleyin**: `bun install`
3. **Cache'i temizleyin**: `.next` klasörünü silin
4. **GitHub Issues**: Sorun devam ederse issue açın

---

<div align="center">

**Life OS ile hayatınızı organize edin! 🧠**

[⬆ Başa Dön](#-life-os---hızlı-başlangıç)

</div>
