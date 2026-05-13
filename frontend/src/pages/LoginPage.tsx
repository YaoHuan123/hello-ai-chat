import { type FormEvent, useEffect, useRef, useState } from "react";
import { sendSmsCodeApi, smsLoginApi } from "../services/api";
import { getLastPhoneForForm, saveAuth } from "../services/storage";

type Props = {
  onSuccess: () => void;
};

const SMS_COOLDOWN_SEC = 60;

function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("86")) return digits.slice(2);
  return digits;
}

function isValidCnMobile(digits: string): boolean {
  return /^1\d{10}$/.test(digits);
}

export function LoginPage({ onSuccess }: Props) {
  const [phone, setPhone] = useState(getLastPhoneForForm);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(SMS_COOLDOWN_SEC);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimer.current) {
            clearInterval(cooldownTimer.current);
            cooldownTimer.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function onSendCode() {
    const digits = normalizePhoneInput(phone);
    if (!isValidCnMobile(digits)) {
      setError(true);
      setMsg("请输入 11 位中国大陆手机号");
      return;
    }
    setSending(true);
    setError(false);
    setMsg("");
    try {
      await sendSmsCodeApi(digits, "login");
      setError(false);
      setMsg("验证码已发送");
      startCooldown();
    } catch (err) {
      setError(true);
      setMsg(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = normalizePhoneInput(phone);
    if (!isValidCnMobile(digits)) {
      setError(true);
      setMsg("请输入 11 位中国大陆手机号");
      return;
    }
    if (!code.trim()) {
      setError(true);
      setMsg("请输入验证码");
      return;
    }
    setLoading(true);
    setError(false);
    setMsg("登录中…");
    try {
      const data = await smsLoginApi(digits, code.trim());
      saveAuth(data);
      setError(false);
      setMsg("登录成功");
      setTimeout(onSuccess, 200);
    } catch (err) {
      setError(true);
      setMsg(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  const digits = normalizePhoneInput(phone);
  const canSend = isValidCnMobile(digits) && cooldown === 0 && !sending;

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar" style={{ borderBottom: "none" }}>
        <h1>AIChat</h1>
        <p>使用手机号登录</p>
      </header>
      <div className="aichat-main" style={{ paddingTop: 8 }}>
        <div className="aichat-card">
          <div className="aichat-login-hero">
            <h2>欢迎</h2>
            <p>首次登录将自动注册账号</p>
          </div>
          <form onSubmit={onSubmit} className="aichat-form">
            <input
              className="aichat-input"
              placeholder="手机号"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                className="aichat-input"
                style={{ flex: 1 }}
                placeholder="验证码"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                className="aichat-btn-ghost"
                type="button"
                disabled={!canSend}
                onClick={onSendCode}
                style={{ flexShrink: 0, minWidth: 112 }}
              >
                {cooldown > 0 ? `${cooldown}s` : sending ? "发送中…" : "获取验证码"}
              </button>
            </div>
            {msg ? (
              <p className={error ? "aichat-form-msg err" : "aichat-form-msg"} style={error ? undefined : { color: "var(--aichat-muted)" }}>
                {msg}
              </p>
            ) : (
              <div className="aichat-form-msg" />
            )}
            <button className="aichat-btn-primary" type="submit" disabled={loading}>
              {loading ? "登录中…" : "登录"}
            </button>
            <p className="aichat-form-hint">验证码将以短信形式发送至该手机号。</p>
          </form>
        </div>
      </div>
    </div>
  );
}
