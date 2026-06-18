# 藥物標籤列印系統 (Med Label Printer)

一個專業的香港藥物標籤列印系統，專門為藥房及診所設計，用於在 A4 標籤紙上生成可列印的藥物標籤 PDF。

🚀 Supabase 數據庫已連接及配置。

## 功能特點

- **標籤生成** — 在 A4 標籤紙上生成多格藥物標籤 PDF
- **藥房資料** — 儲存藥房/診所基本資料到瀏覽器 Local Storage
- **藥物數據庫** — 透過 Supabase 管理藥劑製品資料庫
- **智能填充** — 輸入 Generic Name 自動填入預設用法及注意事項
- **多格式支援** — 支援 10/14/21/24/30/40 格等多種標籤紙格式
- **批量列印** — 一次過為多位病人生成整頁標籤
- **專業設計** — 清晰展示病人姓名、藥物資料、用法、注意事項及 HK 註冊編號

## 標籤內容

每張標籤包含：
- 病人姓名
- 配發日期（自動設定為今日）
- 藥房/醫生名稱及地址
- 藥物牌子名稱及通用名稱（學名）
- 單位劑量（mg 等）
- 用量及用法
- 注意事項（如適用）
- 香港註冊編號

## 技術棧

| 技術 | 用途 |
|------|------|
| [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | 前端框架 |
| [Vite](https://vitejs.dev) | 構建工具 |
| [Tailwind CSS v4](https://tailwindcss.com) | 樣式框架 |
| [jsPDF](https://github.com/parallax/jsPDF) | PDF 生成 |
| [Supabase](https://supabase.com) | 後端數據庫 (BaaS) |
| [React Router v6](https://reactrouter.com) | 路由 |
| [React Icons (Heroicons)](https://react-icons.github.io/react-icons) | 圖標 |

## 快速開始

### 1. 建立 Supabase 項目

1. 前往 [supabase.com](https://supabase.com) 建立新項目
2. 在 SQL Editor 中執行 `supabase/schema.sql` 建立資料表及種子數據
3. 前往 **Settings → API** 複製以下資料：
   - `Project URL`（例如 `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`）
   - `anon public` API key

### 2. 設定環境變數

```bash
cp .env.example .env
```

編輯 `.env` 檔案，填入你的 Supabase 資料：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### 3. 安裝及執行

```bash
# 安裝依賴
npm install

# 開發模式執行
npm run dev

# 構建生產版本
npm run build
```

### 4. 使用流程

1. **設定藥房資料** → 首次使用請到「藥房資料」頁面填寫你的藥房或診所資訊
2. **建立藥物數據庫** → 在「藥物數據庫」頁面加入常用藥物（如 Panadol、必理痛等）
3. **配發標籤** → 在主頁輸入病人姓名，選擇藥物，然後下載 PDF
4. **列印** → 使用 PDF 在 A4 標籤紙上列印

### 5. 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. 在 GitHub 建立新 Repository 並上傳此專案
2. 前往 [vercel.com](https://vercel.com) 匯入你的 GitHub Repository
3. 在 Vercel 項目設定中填入環境變數：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 部署完成即可使用

## 藥物數據庫智能填充

系統內置了以下常見藥物的預設用法：

| 成分 (Generic) | 預設用法 |
|---------------|---------|
| Paracetamol | 每日 3-4 次，每次 1-2 粒 |
| Ibuprofen | 每日 2-3 次，每次 1 粒，飽肚服用 |
| Amoxicillin | 每日 3 次，每次 1 粒 |
| Omeprazole | 每日 1 次，每次 1 粒，空腹服用 |
| Metformin | 每日 2-3 次，每次 1 粒，餐後服用 |
| Salbutamol | 需要時使用，每次 1-2 揿 |

選擇或輸入 Generic Name 時會自動填入對應的預設用法及注意事項。

## 標籤紙格式

系統支援多種常見的 A4 標籤紙格式：

| 格式 | 格數 | 適合標籤紙型號 |
|------|------|---------------|
| 2×5 | 10 格 | Avery L7160 / 標準藥物標籤 |
| 2×7 | 14 格 | Avery L7161 |
| 3×7 | 21 格 | Avery L7162 |
| 3×8 | 24 格 | Avery L7163 |
| 3×10 | 30 格 | 小型標籤 |
| 4×10 | 40 格 | 微型標籤 |

你可以在「標籤設定」頁面自訂邊距、間距及標籤尺寸。

## 專案結構

```
med-label-printer/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── DrugForm.tsx        # 藥物新增/編輯 Modal
│   │   ├── Layout.tsx          # 主版面佈局
│   │   └── Sidebar.tsx         # 側邊導航欄
│   ├── lib/
│   │   ├── pdfGenerator.ts     # PDF 生成核心邏輯
│   │   ├── storage.ts          # Local Storage 操作
│   │   └── supabase.ts         # Supabase 客戶端
│   ├── pages/
│   │   ├── DispenseLabels.tsx  # 配發標籤主頁
│   │   ├── DrugDatabase.tsx    # 藥物數據庫管理
│   │   ├── LabelSettings.tsx   # 標籤格式設定
│   │   └── PharmacyProfile.tsx # 藥房資料設定
│   ├── types/
│   │   └── index.ts            # TypeScript 類型定義
│   ├── App.tsx                 # 主應用 + 路由
│   ├── main.tsx                # 入口點
│   └── index.css               # 全域樣式 + Tailwind
├── supabase/
│   └── schema.sql              # 資料庫結構 + 種子數據
├── .env.example                # 環境變數範本
├── .gitignore
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## 開發

```bash
npm run dev      # 開發伺服器
npm run build    # 生產構建
npm run preview  # 預覽生產構建
```

## License

MIT
