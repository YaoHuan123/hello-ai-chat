# AIChat 前端

与 `E:\传记前端\frontend` 同栈：React 19、Vite 8、TypeScript、无 `react-router`（`App` 内 `RouteName` 切换全屏页）。

## Android 真机（Capacitor）

### 准备

1. 手机开启 **USB 调试**，用数据线连接电脑；终端执行 `adb devices` 应能看到设备。
2. 手机与电脑连接 **同一 Wi‑Fi**。
3. 复制 `.env.android.example` 为 `.env.android`，填写电脑局域网 IP：
   ```bash
   npm run android:lan-ip
   ```
   将输出的地址写入 `VITE_API_BASE`（例如 `http://192.168.1.23:4000`），`VITE_USE_MOCK=0`。
4. 若 Windows 防火墙拦截，允许 Node 监听 **4000** 端口的入站连接。

### 构建与安装

```bash
# 终端 1：backend/
npm run dev

# 终端 2：frontend/
npm run build:android:debug
npm run install:android:debug
```

或直接运行（需已连接真机）：

```bash
npm run run:android
```

- **Debug 明文 HTTP**：`android/app/src/debug/res/xml/network_security_config.xml` 允许局域网 HTTP 联调；Release 请改用 **HTTPS**。
- **打开 Android Studio**：`npm run android`

需本机安装 Android SDK / JDK、platform-tools（`adb`）；详见 [Capacitor Android 文档](https://capacitorjs.com/docs/android)。

## iOS 真机（Capacitor）

> **需要 macOS + Xcode**。Windows 上可生成 `ios/` 工程，但编译/真机调试须在 Mac 上完成；或用 Codemagic **ios-debug / ios-release** 工作流云端打包。

### 准备

1. Mac 安装 **Xcode** 与 Command Line Tools。
2. iPhone 与电脑连接 **同一 Wi‑Fi**（真机联调后端时）。
3. 复制 `.env.ios.example` 为 `.env.ios`，填写电脑局域网 IP：
   ```bash
   npm run ios:lan-ip
   ```
4. `Info.plist` 已开启 `NSAllowsLocalNetworking`，允许局域网 HTTP 联调；上架请改用 **HTTPS** 后端。

### 构建与运行

```bash
# 终端 1：backend/
npm run dev

# 终端 2：frontend/
npm run sync:ios
npm run ios          # 用 Xcode 打开 ios/App/App.xcodeproj
```

在 Xcode 中选择真机或模拟器，点击 **Run**。或：

```bash
npm run run:ios
```

详见 [Capacitor iOS 文档](https://capacitorjs.com/docs/ios)。

## 端到端联调（真短信）

1. **后端**：在仓库 `backend/` 复制 `.env.example` 为 `.env`，填写 `JWT_SECRET`、阿里云短信等配置。执行 `npm run dev`，监听 `4000` 端口。
2. **前端 Android**：配置 `.env.android`（见上），执行 `npm run build:android:debug` 与 `npm run install:android:debug`。
3. **前端 iOS**：配置 `.env.ios`，在 Mac 上执行 `npm run sync:ios` 并在 Xcode 中 Run。
4. **App 内流程**：手机号 → **获取验证码** → **登录** → 主导航 → **注销账号** → 再次获取验证码 → **确认注销** → 回到登录页。

## 开发

在**本目录**执行：

```bash
npm install
npm run dev
```

- **登录**：手机号 + 短信验证码，对接 `POST /api/auth/sms/send` 与 `POST /api/auth/sms/login`。
- **主导航**：右上角 **退出** 仅清除本地会话；功能列表含 **注销账号**（需短信验证码，调用 `DELETE /api/auth/me`）。
- **辅助聊天**（`chat-assist`）等业务页仍为既有实现或占位。

## 环境变量

复制 `.env.example` 为 `.env` 并按需修改：

- `VITE_API_BASE`：后端根地址（默认 `http://localhost:4000`）
- `VITE_USE_MOCK`：为 `1` 时跳过 `/health` 探活；**账号接口始终请求真实后端**。日常联调保持 `0`（与 `.env.example` 一致）。

Android 构建使用 **`.env.android`**，iOS 使用 **`.env.ios`**（`vite build --mode android|ios` 自动加载）。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | Web 开发 |
| `npm run build` | Web 生产构建 |
| `npm run android:lan-ip` / `ios:lan-ip` | 列出本机局域网 IP |
| `npm run sync:android` | Android 构建并 `cap sync` |
| `npm run sync:ios` | iOS 构建并 `cap sync` |
| `npm run run:android` | 同步后在 Android 设备上运行 |
| `npm run run:ios` | 同步后在 iOS 设备/模拟器上运行 |
| `npm run build:android:debug` | 打 Android Debug APK |
| `npm run install:android:debug` | adb 安装 Debug APK |
| `npm run android` | 用 Android Studio 打开 `android/` |
| `npm run ios` | 用 Xcode 打开 `ios/` |
| `npm run lint` | ESLint |
| `npm run preview` | 预览 `dist` |

## 文档

- [产品功能与工作计划](../docs/产品功能与工作计划.md)
- [传记技术栈与 AI 接口对齐](../docs/传记技术栈与AI接口对齐说明.md)
