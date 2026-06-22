# iOS 上线操作手册

本文档说明 **hello chat**（Capacitor iOS 工程）通过 **Codemagic** 编译、**香蕉云编** 管理证书，分别完成 **TestFlight**、**App Store 正式上架**、**Ad Hoc 内测分发** 的全流程。

> 说明：下文「Ad Hoc」即常见口语中的「HOC 包 / 内测包」，指不经过 App Store、按设备 UDID 安装的分发方式。

---

## 1. 项目与平台对照

| 项目信息 | 值 |
|---|---|
| 应用名称 | hello chat |
| Bundle ID | `com.aichat.app` |
| 前端工程 | `frontend/` |
| iOS 原生工程 | `frontend/ios/` |
| Web 构建产物 | `frontend/dist/` |
| CI 配置 | 仓库根目录 `codemagic.yaml`（需自行维护） |

---

## 2. 涉及文件一览

### 2.1 签名与证书相关

| 文件 | 格式 | 从哪里生成 | 存放在哪里 | 用途 |
|---|---|---|---|---|
| CSR | `.certSigningRequest` | **香蕉云编** | 仅上传 Apple，一般不长期保存 | 向 Apple 申请证书 |
| 分发证书 | `.cer` | **Apple Developer**（上传 CSR 后下载） | 上传到 **香蕉云编** 转 p12 | Apple 侧公钥证书 |
| 分发私钥证书 | `.p12` | **香蕉云编**（由 `.cer` 合成） | **Codemagic** Code signing identities | 云端签名打包 |
| 描述文件 | `.mobileprovision` | **Apple Developer**（或按香蕉云编教程生成） | **Codemagic** Code signing identities | 绑定 App ID、证书、设备/发布渠道 |
| App Store Connect API Key | `.p8` | **App Store Connect** | **Codemagic** Team integrations | 自动上传 TestFlight / 拉取 Profile |

### 2.2 构建与发布产物

| 文件 | 格式 | 从哪里生成 | 用途 |
|---|---|---|---|
| `codemagic.yaml` | YAML | 代码仓库 | 定义 Codemagic 编译流程 |
| `.ipa` | iOS 安装包 | **Codemagic** 构建产物 | TestFlight / 上架 / Ad Hoc 安装 |
| `ExportOptions.plist` | plist | Codemagic 脚本或 Xcode 导出配置 | 控制导出方式（app-store / ad-hoc） |
| dSYM | 符号文件 | Codemagic 构建产物 | Crash 符号化（可选上传） |

### 2.3 各渠道所需描述文件类型

| 发布渠道 | Apple Profile 类型 | Codemagic `distribution_type` |
|---|---|---|
| TestFlight | **App Store** | `app_store` |
| App Store 正式上架 | **App Store** | `app_store` |
| Ad Hoc 内测 | **Ad Hoc** | `ad_hoc` |

> TestFlight 与正式上架 **共用同一套 App Store 类型证书和描述文件**，区别在 App Store Connect 后续操作，不在签名文件。

---

## 3. 平台职责分工

| 平台 | 地址 | 一次性准备 | 每次发版要做的事 |
|---|---|---|---|
| **Apple Developer** | https://developer.apple.com/account | 注册开发者账号；创建 App ID；登记测试设备 UDID（Ad Hoc 必须） | 更新 Profile；证书到期续期 |
| **香蕉云编** | https://www.yunedit.com | 在线生成 CSR；`.cer` → `.p12` | 证书续期时重新生成 p12 |
| **Codemagic** | https://codemagic.io | 接入 Git 仓库；上传 p12 / mobileprovision / API Key | 触发构建；下载或自动发布 IPA |
| **App Store Connect** | https://appstoreconnect.apple.com | 创建 App 记录；配置 TestFlight；填写商店元数据 | 上传构建版本；提交审核；发布 |

---

## 4. 一次性初始化（所有渠道共用）

按顺序完成，后续三种发布方式都依赖此基础。

### 4.1 Apple Developer

1. 登录 [Apple Developer](https://developer.apple.com/account)。
2. **Identifiers → +** 创建 App ID：
   - Bundle ID：`com.aichat.app`
   - 按需勾选 Push、Associated Domains 等 Capability。
3. 记录 **Team ID**（Membership 页面可见，Codemagic 有时需要）。

### 4.2 香蕉云编：生成分发证书 `.p12`

1. 登录 [香蕉云编](https://www.yunedit.com) → **iOS 证书**。
2. 创建 **Apple Distribution**（发布证书，非 Development）。
3. 下载 **CSR**，到 Apple Developer → **Certificates → + → Apple Distribution** 上传 CSR。
4. 下载 Apple 返回的 **`.cer`**，回到香蕉云编上传 `.cer`，生成 **`.p12`**。
5. 设置 p12 密码并妥善保存（仅自己保管，勿提交 Git）。

参考教程：[香蕉云编 iOS 证书在线创建](https://www.yunedit.com/ioscert)

### 4.3 Apple Developer：创建描述文件

在 **Profiles** 中分别创建（如尚未创建）：

| Profile 名称（示例） | 类型 | 绑定 |
|---|---|---|
| `hello-chat-appstore` | **App Store** | App ID `com.aichat.app` + 上述 Distribution 证书 |
| `hello-chat-adhoc` | **Ad Hoc** | App ID + Distribution 证书 + **测试设备 UDID 列表** |

下载得到 `.mobileprovision` 文件。

### 4.4 App Store Connect：API Key（用于 Codemagic 自动发布）

1. 登录 [App Store Connect](https://appstoreconnect.apple.com) → **用户和访问 → 集成 → App Store Connect API**。
2. 新建 Key，权限建议 **App 管理**。
3. 下载 **`.p8`**（只能下载一次），记录 **Key ID**、**Issuer ID**。

### 4.5 Codemagic：上传签名与集成

1. **Team settings → codemagic.yaml settings → Code signing identities**
   - **iOS certificates**：上传 `.p12`，填写密码，设置 Reference name（如 `aichat-distribution`）。
   - **iOS provisioning profiles**：上传 App Store 与 Ad Hoc 两个 `.mobileprovision`，分别命名（如 `aichat-appstore`、`aichat-adhoc`）。
2. **Team settings → Team integrations → Developer Portal → Manage keys**
   - 上传 `.p8`，填写 Issuer ID、Key ID。
3. **Applications → Add application**：关联本 Git 仓库，扫描根目录 `codemagic.yaml`。

### 4.6 App Store Connect：创建 App 记录

1. **我的 App → +** 新建 App。
2. Bundle ID 选择 `com.aichat.app`。
3. 填写名称、主要语言、SKU 等基础信息（正式上架前需补全截图、隐私政策等）。

---

## 5. Codemagic 构建配置要点

仓库根目录维护 `codemagic.yaml`。Capacitor 项目典型流程：

```yaml
workflows:
  ios-testflight:
    name: iOS TestFlight
    max_build_duration: 60
    instance_type: mac_mini_m2
    working_directory: frontend
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: com.aichat.app
      vars:
        XCODE_SCHEME: App
        XCODE_WORKSPACE: ios/App/App.xcworkspace
    scripts:
      - name: Install dependencies
        script: npm ci
      - name: Build web assets
        script: npm run build
      - name: Sync Capacitor iOS
        script: npx cap sync ios
      - name: Install CocoaPods
        script: |
          cd ios/App && pod install
      - name: Set up code signing
        script: xcode-project use-profiles
      - name: Build IPA
        script: |
          xcode-project build-ipa \
            --workspace "$XCODE_WORKSPACE" \
            --scheme "$XCODE_SCHEME"
    artifacts:
      - frontend/build/ios/ipa/*.ipa
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true

  ios-adhoc:
    name: iOS Ad Hoc
    working_directory: frontend
    environment:
      ios_signing:
        distribution_type: ad_hoc
        bundle_identifier: com.aichat.app
    # scripts 同上，无需 app_store_connect publishing
    artifacts:
      - frontend/build/ios/ipa/*.ipa
```

> 首次使用前请在 Mac 或 Codemagic 上确认 `XCODE_SCHEME`、`XCODE_WORKSPACE` 与本地 Xcode 工程一致。

---

## 6. TestFlight 发布

**目标**：给内测用户安装测试版，走 Apple 官方 TestFlight 渠道。

### 6.1 用到的文件

| 文件 | 平台 |
|---|---|
| `.p12`（Distribution） | Codemagic |
| `.mobileprovision`（**App Store** 类型） | Codemagic |
| `.p8` API Key | Codemagic |
| 构建产出 `.ipa` | Codemagic → App Store Connect |

### 6.2 操作步骤

| 步骤 | 平台 | 操作 |
|---|---|---|
| 1 | 代码仓库 | 合并待测代码；确认 `frontend/capacitor.config.ts` 中 `appId` 仍为 `com.aichat.app`；递增版本号（Xcode / `Info.plist` 或 CI 脚本） |
| 2 | Codemagic | 运行 **ios-testflight** workflow（或等价配置） |
| 3 | Codemagic | 等待构建成功；若配置了 `submit_to_testflight: true`，IPA 自动上传 |
| 4 | App Store Connect | **TestFlight → 构建版本**，等待 Apple 处理（通常 5–30 分钟） |
| 5 | App Store Connect | **内部测试**：添加内部成员，无需 Beta 审核，处理完成后即可安装 |
| 6 | App Store Connect | **外部测试**（可选）：创建外部测试组，填写「测试内容」说明，提交 **Beta 版审核**（首次约 1 天） |
| 7 | 测试设备 | 安装 TestFlight App，接受邀请或输入兑换码，安装测试包 |

### 6.3 版本号要求

- **CFBundleShortVersionString**（Marketing Version）：用户可见，如 `1.0.1`
- **CFBundleVersion**（Build Number）：每次上传 TestFlight 必须递增，如 `42`

---

## 7. App Store 正式上架

**目标**：通过 App Store 公开发布。

### 7.1 用到的文件

与 TestFlight **完全相同**的签名文件；额外需要商店素材与合规信息（在 App Store Connect 填写，非证书文件）。

| 类型 | 说明 | 平台 |
|---|---|---|
| 签名 | `.p12` + App Store `.mobileprovision` | Codemagic |
| 构建 | `.ipa` | Codemagic → App Store Connect |
| 截图 | 6.7" / 6.5" / 5.5" 等尺寸 | App Store Connect 上传 |
| 图标 | 1024×1024 | App Store Connect |
| 隐私政策 URL | 必填（若采集数据） | App Store Connect |
| 出口合规、内容分级、隐私营养标签 | 表单 | App Store Connect |

### 7.2 操作步骤

| 步骤 | 平台 | 操作 |
|---|---|---|
| 1 | Codemagic | 用 **App Store 签名** 构建并上传 IPA（可与 TestFlight 同一构建） |
| 2 | App Store Connect | **App 信息 / 定价与销售范围**：补全描述、关键词、支持 URL、分类 |
| 3 | App Store Connect | **App 隐私**：填写数据收集问卷 |
| 4 | App Store Connect | **版本页 → 构建版本**：选择已通过 TestFlight 处理的构建 |
| 5 | App Store Connect | 填写「此版本更新内容」、截图、审核备注（如需测试账号，在备注中提供） |
| 6 | App Store Connect | 点击 **提交审核** |
| 7 | App Store Connect | 审核通过后，选择 **手动发布** 或 **自动发布** |

### 7.3 与 TestFlight 的关系

推荐流程：**先 TestFlight 验证 → 同一 Build 提交 App Store 审核**，避免重复打包。只有版本号或签名变更时才需重新在 Codemagic 构建。

---

## 8. Ad Hoc 内测分发（HOC）

**目标**：不经过 TestFlight，将 IPA 直接分发给已登记 UDID 的设备（适合小范围、指定设备内测）。

### 8.1 用到的文件

| 文件 | 平台 |
|---|---|
| `.p12`（Distribution，可与 App Store 共用） | Codemagic |
| `.mobileprovision`（**Ad Hoc** 类型，含设备 UDID） | Codemagic |
| 构建产出 `.ipa` | Codemagic 下载 |
| 测试设备 UDID | Apple Developer 登记 |

> Ad Hoc **不需要** App Store Connect API Key，也 **不会** 进入 TestFlight。

### 8.2 新增测试设备（每次加设备都要做）

| 步骤 | 平台 | 操作 |
|---|---|---|
| 1 | 测试机 | 获取 UDID（连接 Mac 的 Finder / 第三方工具 / 配置文件描述） |
| 2 | Apple Developer | **Devices → +** 注册 UDID |
| 3 | Apple Developer | **Profiles → Ad Hoc Profile → Edit** 勾选新设备 → 重新生成并 **Download** |
| 4 | Codemagic | **Code signing identities** 中 **替换** 为新的 `.mobileprovision` |

### 8.3 操作步骤

| 步骤 | 平台 | 操作 |
|---|---|---|
| 1 | Codemagic | 运行 **ios-adhoc** workflow（`distribution_type: ad_hoc`） |
| 2 | Codemagic | 构建完成后在 **Artifacts** 下载 `.ipa` |
| 3 | 分发渠道（任选） | 通过 **蒲公英 / fir.im / 自建 HTTPS** 等托管 IPA，生成安装链接 |
| 4 | 测试设备 | iOS 16+ 可能需在 **设置 → 通用 → VPN 与设备管理** 信任企业/开发者描述文件；Ad Hoc 需设备 UDID 已在 Profile 中 |

### 8.4 Ad Hoc 限制

- 每个 Ad Hoc Profile 最多绑定 **100 台设备** / 年。
- 设备未写入 Profile 的 IPA **无法安装**。
- 不适合大规模公测；公测请用 TestFlight。

---

## 9. 三种渠道对比

| 维度 | TestFlight | App Store 正式上架 | Ad Hoc（HOC） |
|---|---|---|---|
| 签名 Profile | App Store | App Store | Ad Hoc |
| Codemagic `distribution_type` | `app_store` | `app_store` | `ad_hoc` |
| 是否需要 ASC API Key | 推荐（自动上传） | 推荐 | 否 |
| 设备限制 | 测试员账号 | 无 | 仅 Profile 内 UDID |
| 审核 | 外部测试需 Beta 审核 | App 审核 | 无 |
| 典型用途 | 内测 / 灰度 | 公开发布 | 指定设备、小范围内测 |

---

## 10. 发版前检查清单

- [ ] Bundle ID 为 `com.aichat.app`，与 Apple Developer、Xcode 工程一致
- [ ] `npm run build` + `npx cap sync ios` 在本地或 CI 可成功
- [ ] Build Number 已递增
- [ ] Codemagic 中 p12 密码、Profile 未过期
- [ ] Ad Hoc：目标设备 UDID 已加入 Profile 且 Profile 已更新到 Codemagic
- [ ] TestFlight / 上架：App Store Connect 中隐私、截图、审核信息已就绪
- [ ] **切勿** 将 `.p12`、`.p8`、密码、`backend/.env` 等提交到 Git

---

## 11. 常见问题

### 证书与 Profile 不匹配

- 确认 Profile 绑定的 Distribution 证书与 Codemagic 上传的 p12 为同一证书。
- 在 Apple Developer 重新下载 Profile 并上传到 Codemagic。

### Codemagic 报 `No matching provisioning profiles`

- 检查 `distribution_type` 与 Profile 类型是否一致（App Store vs Ad Hoc）。
- 检查 `bundle_identifier` 是否为 `com.aichat.app`。

### TestFlight 看不到构建

- 等待 Apple 处理完成（状态由「处理中」变为可用）。
- 确认 IPA 使用 **App Store** 导出方式，且已成功上传。

### Ad Hoc 安装失败「无法安装」

- 设备 UDID 未加入 Ad Hoc Profile。
- Profile 或证书已过期。
- 使用了 App Store 类型 Profile 却按 Ad Hoc 方式分发。

---

## 12. 相关链接

- [Codemagic iOS 构建文档](https://docs.codemagic.io/yaml-quick-start/building-a-native-ios-app/)
- [Codemagic iOS 签名说明](https://docs.codemagic.io/partials/quickstart/code-signing-ios/)
- [香蕉云编 iOS 证书教程](https://www.yunedit.com/ioscert)
- [App Store Connect 帮助](https://developer.apple.com/help/app-store-connect/)
