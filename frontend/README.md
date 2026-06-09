# AIChat 前端

与 `E:\传记前端\frontend` 同栈：React 19、Vite 8、TypeScript、无 `react-router`（`App` 内 `RouteName` 切换全屏页）。

## Android（Capacitor）

- **联调地址**：复制 `.env.android.example` 为 `.env.android`，保持 `VITE_API_BASE=http://10.0.2.2:4000`（模拟器访问宿主机后端）、`VITE_USE_MOCK=0`。
- **明文 HTTP**：`android/app/src/main/res/xml/network_security_config.xml` 仅允许 `10.0.2.2` / `127.0.0.1` / `localhost` 的 cleartext，便于本地 HTTP 联调；上架生产请改为 **HTTPS** 并收紧网络安全策略。
- **构建调试 APK**：`npm run build:android:debug`（`vite build --mode android` → `cap sync` → `assembleDebug`）。产物一般在 `android/app/build/outputs/apk/debug/app-debug.apk`。
- **安装到模拟器**（示例）：`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
- **打开 Android Studio**：`npm run android`

需本机安装 Android SDK / JDK；详见 [Capacitor Android 文档](https://capacitorjs.com/docs/android)。

## 端到端联调（真短信）

1. **后端**：在仓库 `backend/` 复制 `.env.example` 为 `.env`，填写 `JWT_SECRET`、阿里云 `ALIYUN_ACCESS_KEY_*`、`ALIYUN_SMS_SIGN_NAME`、以及 **`ALIYUN_SMS_TEMPLATE_CODE_LOGIN`** 与 **`ALIYUN_SMS_TEMPLATE_CODE_DELETE_ACCOUNT`**（模板需包含验证码变量，与 Dysmsapi `SendSms` 一致）。执行 `npm run dev`，默认监听 `http://localhost:4000`。
2. **前端 Android 构建**：在本目录复制 `.env.android.example` → `.env.android`，执行 `npm run build:android:debug`。
3. **模拟器**：启动 Android 模拟器（建议 API 30+），`adb install -r` 安装上述 APK。
4. **App 内流程**：手机号 → **获取验证码**（收真实短信）→ **登录** → 主导航 → **注销账号** → 再次获取验证码（`delete_account` 场景）→ **确认注销** → 回到登录页。

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

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发 |
| `npm run build` | 生产构建 |
| `npm run build:android:debug` | Android 调试 APK（需 `.env.android`） |
| `npm run android` | 用 Android Studio 打开 `android/` |
| `npm run lint` | ESLint |
| `npm run preview` | 预览 `dist` |

## 文档

- [产品功能与工作计划](../docs/产品功能与工作计划.md)
- [传记技术栈与 AI 接口对齐](../docs/传记技术栈与AI接口对齐说明.md)
