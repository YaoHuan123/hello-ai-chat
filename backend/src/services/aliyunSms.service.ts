import DypnsapiClient, {
  CheckSmsVerifyCodeRequest,
  SendSmsVerifyCodeRequest,
} from "@alicloud/dypnsapi20170525";
import { Config as OpenApiConfig } from "@alicloud/openapi-core/dist/utils";
import { logInfo, logWarn } from "../logger";
import type { SmsScene } from "./smsRateLimit.service";

export class AliyunSmsError extends Error {
  readonly code: string;
  readonly requestId?: string;

  constructor(code: string, message: string, requestId?: string) {
    super(message);
    this.name = "AliyunSmsError";
    this.code = code;
    this.requestId = requestId;
  }
}

const ALIYUN_SMS_REQUIRED_ENV_KEYS = [
  "ALIYUN_ACCESS_KEY_ID",
  "ALIYUN_ACCESS_KEY_SECRET",
  "ALIYUN_SMS_SIGN_NAME",
  "ALIYUN_SMS_TEMPLATE_CODE_LOGIN",
  "ALIYUN_SMS_TEMPLATE_CODE_DELETE_ACCOUNT",
] as const;

export const ALIYUN_SMS_DEV_MOCK_CODE = (process.env.ALIYUN_SMS_DEV_MOCK_CODE?.trim() || "123456").slice(0, 8);

/** 本地/预发调试用万能码；生产环境仅在显式设置 ALLOW_SMS_DEBUG_CODE=1 时生效 */
const SMS_DEBUG_BYPASS_CODE = "666666";

const OTP_VALID_SECONDS = 300;

type SmsTemplateMap = Record<SmsScene, string>;

type AliyunSmsEnv = {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  schemeName?: string;
  templates: SmsTemplateMap;
};

function trimEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function requiredEnv(name: string): string {
  const value = trimEnv(name);
  if (!value) {
    throw new Error(`MISSING_ENV:${name}`);
  }
  return value;
}

function readEnv(): AliyunSmsEnv {
  return {
    accessKeyId: requiredEnv("ALIYUN_ACCESS_KEY_ID"),
    accessKeySecret: requiredEnv("ALIYUN_ACCESS_KEY_SECRET"),
    signName: requiredEnv("ALIYUN_SMS_SIGN_NAME"),
    schemeName: trimEnv("ALIYUN_SMS_SCHEME_NAME") || undefined,
    templates: {
      login: requiredEnv("ALIYUN_SMS_TEMPLATE_CODE_LOGIN"),
      delete_account: requiredEnv("ALIYUN_SMS_TEMPLATE_CODE_DELETE_ACCOUNT"),
    },
  };
}

function listMissingEnvKeys(): string[] {
  return ALIYUN_SMS_REQUIRED_ENV_KEYS.filter((k) => !trimEnv(k));
}

function isDevMockForced(): boolean {
  const v = (process.env.ALIYUN_SMS_DEV_MOCK ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isProductionEnv(): boolean {
  return (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

function isSmsDebugBypassEnabled(): boolean {
  if (!isProductionEnv()) return true;
  const v = (process.env.ALLOW_SMS_DEBUG_CODE ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function decideMode(): { mode: "real" | "mock"; missing: string[] } {
  const missing = listMissingEnvKeys();
  if (isDevMockForced()) {
    return { mode: "mock", missing };
  }
  if (missing.length === 0) {
    return { mode: "real", missing };
  }
  if (!isProductionEnv()) {
    return { mode: "mock", missing };
  }
  return { mode: "real", missing };
}

/**
 * 阿里云号码认证（Dypnsapi）统一入口：
 * - 发送：SendSmsVerifyCode  → 阿里云生成并保存验证码（returnVerifyCode=false）
 * - 校验：CheckSmsVerifyCode → 校验通过返回 verifyResult==="PASS"
 *
 * 模板参数 templateParam 同时传 `code=##code##` 和 `min=<有效分钟>`：
 * - `code` 不传会报「模版变量code内容非法」
 * - `min` 不传会报「请检查模板内容与模板参数是否匹配」或 InternalError
 *
 * 与普通短信服务（Dysmsapi）相比，本接口直接接受控制台的 6 位模板编号（如 100001），
 * 不需要 `SMS_xxxxxxxxx` 形式。
 */
export class AliyunSmsService {
  private envCache: AliyunSmsEnv | null = null;
  private clientCache: DypnsapiClient | null = null;

  constructor() {
    const { mode, missing } = decideMode();
    if (mode === "mock") {
      logWarn("aliyun_sms.dev_mock.enabled", {
        forced: isDevMockForced(),
        production: isProductionEnv(),
        missingEnv: missing,
        fixedCode: ALIYUN_SMS_DEV_MOCK_CODE,
        note: "dev mock：sendSmsCode 不真发短信，checkSmsCode 仅接受 ALIYUN_SMS_DEV_MOCK_CODE。",
      });
    }
  }

  private isMockMode(): boolean {
    return decideMode().mode === "mock";
  }

  private getEnv(): AliyunSmsEnv {
    if (!this.envCache) {
      this.envCache = readEnv();
    }
    return this.envCache;
  }

  private getClient(): DypnsapiClient {
    if (!this.clientCache) {
      const env = this.getEnv();
      this.clientCache = new DypnsapiClient(
        new OpenApiConfig({
          accessKeyId: env.accessKeyId,
          accessKeySecret: env.accessKeySecret,
          regionId: "cn-qingdao",
        }),
      );
    }
    return this.clientCache;
  }

  async sendSmsCode(phone: string, scene: SmsScene): Promise<{ requestId?: string; bizId?: string }> {
    if (this.isMockMode()) {
      const requestId = `dev-mock-${Date.now()}`;
      logInfo("aliyun_sms.dev_mock.send", { phone, scene, requestId });
      return { requestId, bizId: requestId };
    }

    const env = this.getEnv();
    const templateCode = env.templates[scene];
    if (!templateCode) {
      throw new AliyunSmsError("SMS_TEMPLATE_NOT_CONFIGURED", `No template for scene: ${scene}`);
    }

    const validMinutes = String(Math.max(1, Math.round(OTP_VALID_SECONDS / 60)));
    const response = await this.getClient().sendSmsVerifyCode(
      new SendSmsVerifyCodeRequest({
        phoneNumber: phone,
        countryCode: "86",
        signName: env.signName,
        schemeName: env.schemeName,
        templateCode,
        templateParam: JSON.stringify({ code: "##code##", min: validMinutes }),
        codeLength: 6,
        codeType: 1,
        duplicatePolicy: 1,
        interval: 60,
        validTime: OTP_VALID_SECONDS,
        returnVerifyCode: false,
      }),
    );
    const body = response.body;
    logInfo("aliyun_sms.send.raw_response", {
      phone,
      scene,
      templateCode,
      signName: env.signName,
      schemeName: env.schemeName ?? null,
      body,
    });
    if (body?.code !== "OK") {
      throw new AliyunSmsError(
        body?.code || "ALIYUN_DYPNSAPI_FAILED",
        body?.message || "短信发送失败",
        body?.requestId ?? body?.model?.requestId,
      );
    }
    return { requestId: body.requestId ?? body.model?.requestId, bizId: body.model?.bizId };
  }

  async checkSmsCode(phone: string, _scene: SmsScene, code: string): Promise<void> {
    const submitted = code.trim();
    if (isSmsDebugBypassEnabled() && submitted === SMS_DEBUG_BYPASS_CODE) {
      logWarn("aliyun_sms.debug_bypass.accepted", { phone, scene: _scene });
      return;
    }
    if (this.isMockMode()) {
      logInfo("aliyun_sms.dev_mock.check", {
        phone,
        scene: _scene,
        accepted: submitted === ALIYUN_SMS_DEV_MOCK_CODE,
      });
      if (submitted !== ALIYUN_SMS_DEV_MOCK_CODE) {
        throw new AliyunSmsError("SMS_VERIFY_FAILED", "验证码错误或已过期");
      }
      return;
    }

    const env = this.getEnv();
    const response = await this.getClient().checkSmsVerifyCode(
      new CheckSmsVerifyCodeRequest({
        phoneNumber: phone,
        countryCode: "86",
        schemeName: env.schemeName,
        verifyCode: submitted,
        caseAuthPolicy: 1,
      }),
    );
    const body = response.body;
    if (body?.code !== "OK") {
      throw new AliyunSmsError(
        body?.code || "ALIYUN_DYPNSAPI_FAILED",
        body?.message || "验证码校验失败",
        body?.requestId,
      );
    }
    if (body?.success !== true || body.model?.verifyResult !== "PASS") {
      throw new AliyunSmsError("SMS_VERIFY_FAILED", "验证码错误或已过期");
    }
  }
}
