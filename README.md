# BEI Stock Screener (Supabase Edition)

Sistem screening saham Indonesia (BEI) untuk keperluan trading harian. **100% GRATIS** menggunakan Supabase + Vercel + GitHub Actions.

## Arsitektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Supabase     │◀────│  GitHub Actions │
│   (Vercel)      │     │  (PostgreSQL +  │     │  (Python        │
│   React + TS    │     │   Realtime)     │     │   Scraper)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Fitur

- **Realtime Updates** - Data saham update secara realtime via Supabase
- **Screening Otomatis** - Filter saham berdasarkan kriteria scalping
- **Foreign Flow** - Analisis aliran dana asing
- **Accumulation/Distribution** - Indikator akumulasi/distribusi
- **Order Book** - Informasi Bid/Ask
- **ARA/ARB** - Auto Reject limits
- **IEP/IEV** - Pre-opening/closing data
- **Dark Theme** - UI modern dan responsif

## Biaya: GRATIS!

| Platform | Komponen | Free Tier |
|----------|----------|-----------|
| **Supabase** | Database + Realtime | 500MB, unlimited API |
| **Vercel** | Frontend Hosting | Unlimited |
| **GitHub Actions** | Scheduled Scraper | 2000 menit/bulan |

## Quick Start

### 1. Setup Supabase

1. Buka [supabase.com](https://supabase.com) dan buat account
2. Create new project
3. Buka **SQL Editor** dan jalankan isi file `supabase/schema.sql`
4. Buka **Settings** > **API** dan catat:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. Setup Frontend (Vercel)

1. Fork/clone repository ini ke GitHub
2. Buka [vercel.com](https://vercel.com) dan import project
3. Set **Root Directory**: `frontend`
4. Tambahkan Environment Variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Deploy!

### 3. Setup Scraper (GitHub Actions)

1. Buka repository di GitHub
2. Go to **Settings** > **Secrets and variables** > **Actions**
3. Add secrets:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```
4. Scraper akan berjalan otomatis setiap 30 menit saat market buka

### 4. Enable Realtime di Supabase

1. Buka Supabase Dashboard
2. Go to **Database** > **Replication**
3. Enable replication untuk table `stocks` dan `market_status`

## Development Lokal

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env dengan Supabase credentials
npm run dev
```

### Scraper (Manual Run)

```bash
cd scraper
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env dengan Supabase SERVICE key
python scrape_stocks.py
```

## Struktur Project

```
index_screening/
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks (useStocks)
│   │   ├── services/       # Supabase client
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── vercel.json
├── scraper/                # Python scraper
│   ├── scrape_stocks.py    # Main scraper script
│   └── requirements.txt
├── supabase/
│   └── schema.sql          # Database schema
├── .github/
│   └── workflows/
│       └── scraper.yml     # GitHub Actions workflow
└── README.md
```

## Kriteria Screening

Saham yang lolos screening memenuhi kriteria:

| Kriteria | Nilai | Bobot |
|----------|-------|-------|
| Harga | Rp 100 - Rp 10.000 | 20 |
| Volume | > 1 juta lot | 25 |
| Volatilitas | > 2% | 20 |
| Price Change | > 0.5% | 15 |
| Spread | < 2% | 20 |

## Data Sources

- **Yahoo Finance** - Real-time price data
- **IDX Official API** - Foreign flow, order book, IEP/IEV

## Troubleshooting

### Data tidak update
- Pastikan GitHub Actions berjalan (cek tab Actions di repo)
- Pastikan Supabase secrets sudah di-set dengan benar
- Pastikan Realtime sudah di-enable untuk table stocks

### Frontend error
- Pastikan environment variables sudah di-set di Vercel
- Cek browser console untuk error message

### Scraper gagal
- Cek GitHub Actions logs untuk detail error
- IDX API kadang down, scraper akan retry otomatis

## Disclaimer

⚠️ **PERINGATAN**: Sistem ini hanya untuk tujuan **informasi dan edukasi**. Bukan merupakan rekomendasi investasi. Selalu lakukan riset sendiri (DYOR) sebelum melakukan trading.

## License

MIT License - Silakan gunakan dan modifikasi sesuai kebutuhan.

---

**Made with ❤️ for Indonesian Stock Traders**
