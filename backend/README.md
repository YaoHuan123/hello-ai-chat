# aichat-backend

账号能力：短信验证码发送、登录（首次登录即注册）、当前用户查询、注销（需短信验证码）。联系人：已登录用户维护手机号联系人（对方须已注册）。

## 环境

复制 `.env.example` 为 `.env` 并填写 `JWT_SECRET`；生产环境须配置阿里云短信相关变量。

本地联调（不烧短信、固定验证码）：

```bash
set ALIYUN_SMS_DEV_MOCK=1
npm run dev
```

此时验证码固定为 `ALIYUN_SMS_DEV_MOCK_CODE`（默认 `123456`）。详见 `.env.example` 注释。

## 命令

```bash
npm install
npm run dev
```

默认 `PORT=4000`，SQLite 位于 `DATA_ROOT`（默认 `./data`）下的 `users.db`。

**聊天**：消息与群聊气泡**不写入数据库**，仅 WebSocket 转发；历史由各客户端 `localStorage` 保存。见仓库 `docs/聊天本地存储原则.md`。

## HTTP

- `GET /health`
- `POST /api/auth/sms/send` body: `{ "phone", "scene": "login" | "delete_account" }`
- `POST /api/auth/sms/login` body: `{ "phone", "code" }`
- `GET /api/auth/me` header: `Authorization: Bearer <token>`
- `DELETE /api/auth/me` header: Bearer + body: `{ "code" }`（需先 `sms/send` 且 `scene` 为 `delete_account`）

联系人（均需 `Authorization: Bearer <token>`）：

- `GET /api/contacts` → `{ "items": [{ "contactUserId", "phone", "remark", "createdAt" }] }`
- `POST /api/contacts` body: `{ "phone", "remark?" }`（对方手机号须已注册；`remark` 可选）
- `DELETE /api/contacts/:contactUserId`
- `PATCH /api/contacts/:contactUserId` body: `{ "remark": string | null }`
