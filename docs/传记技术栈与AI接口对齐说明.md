# 与 `E:\传记前端` 技术栈及 AI 接口的对齐说明

> 目的：本仓库（AIChat 相关能力）在选型与调用方式上**与 `E:\传记前端` 保持一致**；不另起不兼容的栈。下文基于该仓库**当前**代码与配置整理，并给出 AI 调用的**唯一推荐路径**。

## 1. 前端（`E:\传记前端\frontend`）

| 项 | 选项 |
|----|------|
| 语言 | TypeScript（`~6.0`） |
| 运行框架 | **React 19.2** + `react-dom`（见 `frontend/package.json`） |
| 构建与开发 | **Vite 8**，`@vitejs/plugin-react` |
| 质量 | ESLint 9 + `typescript-eslint` + `eslint-plugin-react-hooks` |
| 路由 | **未使用** `react-router`；在 `src/App.tsx` 内用 `useState<RouteName>` 在多个全屏页之间切换 |
| HTTP 客户端 | 浏览器 **原生 `fetch`**，封装在 `src/services/api.ts` |
| 默认后端地址 | `export const API_BASE = "http://localhost:4000"`（与传记后端 `PORT` 默认一致，见下节） |
| 鉴权 | 在需登录的接口中通过 `Authorization: Bearer <token>` 传递，token 由登录流程写入并读取（见 `src/services/storage.ts`） |

**约定**：新功能优先在 `api.ts` 中按现有 `getJson` / `postJson` 风格增函数；页面组件不直接写散落的多套 `API_BASE` 常亮。

## 2. 后端（`E:\传记前端\backend`）

| 项 | 选项 |
|----|------|
| 语言 | TypeScript，编译目标由 `backend/tsconfig.json` 定义 |
| 运行方式 | `nodemon` + `ts-node` 开发；生产 `tsc` 后 `node dist` |
| 模块格式 | `"type": "commonjs"` |
| HTTP 框架 | **Express 5** |
| 主要依赖 | `cors`、`jsonwebtoken`、`bcryptjs`、`zod`、`dotenv`，数据目录见 `src/config.ts` 等 |
| 端口 | 默认 **`4000`**，可通过环境变量 `PORT` 覆盖（`src/config.ts`：`Number(process.env.PORT ?? 4000)`） |
| 入口 | `src/index.ts`：挂载 `/api/auth`、`/api/materials`、/api/texts` 等，无内置前端静态托管（前端由 Vite 自管） |

## 3. AI 接口在传记中的用法（对齐重点）

### 3.1 核心原则

- **浏览器前端不直接调用** Ark / 豆包 / OpenAI 等供应商 API。  
- **所有大模型与附属能力（对话形态、文生图等）均在传记后端**通过统一封装完成；前端只调传记的 **`/api/...` REST**。

### 3.2 对话/JSON 等：OpenAI 兼容 `chat/completions`

- 实现位置：`E:\传记前端\backend\src\services\openaiCompat.ts`。  
- 使用 **`POST {OPENAI_BASE_URL}/chat/completions`**，请求体含 `model`、`messages` 等，鉴权为 **`Authorization: Bearer <API Key>`**。  
- 默认 `OPENAI_BASE_URL` 指向**火山引擎方舟** OpenAI 兼容根路径（**并非**在仓库内写死唯一厂商，可换为其它兼容端点，前提是路径与鉴权方式一致）：

| 环境变量 | 作用（与传记 `.env.example` 一致） |
|----------|--------------------------------------|
| `OPENAI_API_KEY` | Bearer Token；未配置时 `chat()` 会直接抛错 |
| `OPENAI_BASE_URL` | 默认 `https://ark.cn-beijing.volces.com/api/v3`（**不要**在末尾多写 `/chat/completions`，代码里会拼接） |
| `OPENAI_MODEL` | 默认如 `doubao-seed-2-0-pro-260215`（以 `.env.example` 为准） |
| `OPENAI_GLOBAL_SYSTEM_PREFIX` | 传记业务里可为 system/文生图 prompt 自动加前缀，默认 on |
| `OPENAI_CHAT_STREAM_DEFAULT` | 是否默认走流式 `stream: true` 再拼接内容 |
| `OPENAI_FETCH_CONNECT_TIMEOUT_MS` 等 | 长请求、重试、Connection 策略等，见 `openaiCompat.ts` 与 `.env.example` |

- **TTS、文生图（TEXT2IMG_*)** 等使用**同一套 Key/网关思路**，细节以 `backend/.env.example` 中注释为准，不在此重复罗列。

### 3.3 本 AIChat 项目应如何对齐

1. **若与传记同一单体**：在后端**新增**面向「单向聊天 / 辅助推荐」的 `api` 路由，内部**复用** `openaiCompat.ts` 的 `chat`（或提炼的薄封装），不要复制另一套 `fetch` 到供应商。  
2. **若独立部署**：前端仍只访问**自己的后端** `API_BASE`；后端再按上表配置环境变量调用兼容端点。  
3. **密钥**：仅出现在服务器环境（如 `backend/.env`），**永不**写进前端仓库与浏览器。

## 4. 参考文件路径速查

| 说明 | 路径 |
|------|------|
| 前端依赖与脚本 | `E:\传记前端\frontend\package.json` |
| 默认 API 基址 | `E:\传记前端\frontend\src\services\api.ts` |
| 应用路由与页面切换 | `E:\传记前端\frontend\src\App.tsx` |
| 后端依赖与脚本 | `E:\传记前端\backend\package.json` |
| 服务端口与数据根 | `E:\传记前端\backend\src\config.ts` |
| 入口与路由前缀 | `E:\传记前端\backend\src\index.ts` |
| **AI 兼容层（chat/completions）** | `E:\传记前端\backend\src\services\openaiCompat.ts` |
| 环境变量模板 | `E:\传记前端\backend\.env.example` |

---

*文档随传记仓库变更可能过时，以 `E:\传记前端` 内代码与 `package.json` 为准，更新本段时请同步改日期。*

**最后更新：2026-04-24**
