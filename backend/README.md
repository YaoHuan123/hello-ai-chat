# aichat-backend

账号能力：短信验证码发送、登录（首次登录即注册）、当前用户查询、注销（需短信验证码）。

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

默认 `PORT=3000`，SQLite 位于 `DATA_ROOT`（默认 `./data`）下的 `users.db`。

## HTTP

- `GET /health`
- `POST /api/auth/sms/send` body: `{ "phone", "scene": "login" | "delete_account" }`
- `POST /api/auth/sms/login` body: `{ "phone", "code" }`
- `GET /api/auth/me` header: `Authorization: Bearer <token>`
- `DELETE /api/auth/me` header: Bearer + body: `{ "code" }`（需先 `sms/send` 且 `scene` 为 `delete_account`）
