# RC Zone Samobor — Praćenje radova

Mobile-first PWA za praćenje radova na gradilištu RC Zone Samobor (Dilatacija 2).

## Tech stack
- React 18 + Vite + React Router
- Supabase (Postgres + Storage)
- PWA (offline-capable, installable)

## Lokalni development
```bash
npm install
npm run dev
```

## Deployment

### Opcija A — Vercel (preporučeno)
1. Otvori https://vercel.com/new
2. "Import" → uploadaj cijeli folder ILI poveži s GitHub repom
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy

### Opcija B — preko Vercel CLI
```bash
npm i -g vercel
vercel
```

## Supabase
- Projekt: `rc-zone-samobor`
- URL: `https://ssjpacijslnqfdiegaio.supabase.co`
- Connection već konfiguriran u `src/lib/supabase.js`

## Strukture u bazi
- `zone` — 5 najmoprimaca (MAPEI, EU92, Coca-Cola, Coca-Cola ADR, Empty)
- `osi` — referentne osi X (25b–49) i Y (A–T)
- `vrste_radova` — 21 grupa radova iz terminskog plana
- `aktivnosti` — 27 aktivnosti iz terminskog plana Dilatacija 2
- `dnevni_unosi` — glavna tablica za daily logs
- `fotografije` — povezane na unose
- `nacrti` — upload PDF/slika nacrta
