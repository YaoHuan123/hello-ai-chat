import { type FormEvent, useEffect, useRef, useState } from "react";
import { PRODUCT } from "../constants/productCopy";
import { sendSmsCodeApi, smsLoginApi } from "../services/api";
import { getLastPhoneForForm, getLoginPhoneHistory, saveAuth } from "../services/storage";

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
  const [phoneHistory] = useState(() => getLoginPhoneHistory());
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
      setMsg("请输入 11 位手机号");
      return;
    }
    setSending(true);
    setError(false);
    setMsg("");
    try {
      await sendSmsCodeApi(digits, "login");
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
      setMsg("请输入 11 位手机号");
      return;
    }
    if (!code.trim()) {
      setError(true);
      setMsg("请输入验证码");
      return;
    }
    setLoading(true);
    setError(false);
    setMsg("");
    try {
      const data = await smsLoginApi(digits, code.trim());
      saveAuth(data);
      onSuccess();
    } catch (err) {
      setError(true);
      setMsg(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  const digits = normalizePhoneInput(phone);
  const canSend = cooldown === 0 && !sending;

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar aichat-topbar--plain">
        <h1>{PRODUCT.name}</h1>
      </header>
      <div className="aichat-main aichat-login-main">
        <form onSubmit={onSubmit} className="aichat-form">
          <input
            className="aichat-input"
            placeholder="手机号"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={13}
            list="login-phone-history"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <datalist id="login-phone-history">
            {phoneHistory.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          {phoneHistory.length > 0 ? (
            <div className="aichat-login-history">
              <div className="aichat-login-history__chips">
                {phoneHistory.map((p) => (
                  <button key={p} type="button" className="aichat-suggest-chip" onClick={() => setPhone(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="aichat-login-code-row">
            <input
              className="aichat-input"
              placeholder="验证码"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className="aichat-btn-ghost aichat-login-code-btn"
              type="button"
              disabled={!canSend}
              onClick={onSendCode}
            >
              {cooldown > 0 ? `${cooldown}s` : sending ? "发送中…" : "获取验证码"}
            </button>
          </div>
          {msg ? <p className={error ? "aichat-form-msg err" : "aichat-form-msg ok"}>{msg}</p> : null}
          <button className="aichat-btn-primary" type="submit" disabled={loading}>
            {loading ? "…" : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
