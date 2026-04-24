# 92 KA MÊ RA · Deploy Guide

## Bước 1 — Tạo bảng Supabase

1. Vào https://supabase.com/dashboard → project của mày
2. Mở **SQL Editor** → paste nội dung file `supabase-setup.sql` → **Run**

## Bước 2 — Đẩy code lên GitHub

```bash
# Lần đầu
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/TÊN_MÀY/92kamera.git
git push -u origin main

# Các lần sau
git add .
git commit -m "update"
git push
```

## Bước 3 — Deploy lên Vercel

1. Vào https://vercel.com → **Add New Project** → chọn repo GitHub vừa push
2. Trong **Environment Variables** thêm 2 biến:
   - `VITE_SUPABASE_URL` = `https://gtgjixgcillbjwnnkavx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_AX7PyBZn-Wh1yMSxwshH6w_rhrm_yDa`
3. Nhấn **Deploy** → xong!

## Cấu trúc file

```
92kamera/
├── src/
│   ├── main.jsx        ← entry point
│   ├── App.jsx         ← toàn bộ app (không đổi logic/giao diện)
│   └── supabase.js     ← storage adapter (thay window.storage)
├── index.html
├── vite.config.js
├── vercel.json
├── .env                ← keys (KHÔNG push lên GitHub)
├── .env.example
├── .gitignore
└── supabase-setup.sql  ← chạy 1 lần trên Supabase
```

## Test local

```bash
npm install
npm run dev
```
