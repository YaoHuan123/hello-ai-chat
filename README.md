# AIChat

全栈工作区：**`frontend/`** 为 Vite+React 前端（Capacitor 包壳 Android），**`backend/`** 为 Node + Express 账号 API（短信登录 / 注销）。

## 结构

| 目录 | 说明 |
|------|------|
| `frontend/` | 聊天 App 前端（见该目录下 `README.md`）；`npm run android` 打开 Android Studio |
| `backend/` | 账号与鉴权 API（见 [backend/README.md](backend/README.md)） |
| `desktop/` | Electron 直播壳，供抖音直播伴侣窗口捕获（见 [desktop/README.md](desktop/README.md)） |
| `docs/` | 产品计划、界面风格、技术栈对齐说明 |

## 日常开发

```bash
cd frontend
npm install
npm run dev
```

```bash
cd backend
npm install
npm run dev
```

接口基址见 `frontend/.env.example`（`VITE_API_BASE`）。Android 模拟器联调可复制 `frontend/.env.android.example` 为 `.env.android` 后执行 `npm run build:android:debug`。前端连真实后端时请设置 `VITE_USE_MOCK=0`。

## 抖音直播（Electron 壳）

```bash
npm install --prefix desktop
npm run dev:backend    # 终端 A
npm run dev:frontend   # 终端 B
npm run live-shell     # 终端 C
```

在抖音直播伴侣中选择窗口 **AIChat Live** 进行窗口捕获。详见 [desktop/README.md](desktop/README.md)。
