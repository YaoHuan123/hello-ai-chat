import { type FormEvent, useEffect, useRef, useState } from "react";
import { deleteAccountApi, sendSmsCodeApi } from "../services/api";
import { clearAuth, getPhone, getMaskedPhone } from "../services/storage";

type Props = {
  onBack: () => void;
  /** 注销成功并已清本地会话 */
  onAccountDeleted: () => void;
};

const SMS_COOLDOWN_SEC = 60;

export function DeleteAccountPage({ onBack, onAccountDeleted }: Props) {
  const phone = getPhone().replace(/\D/g, "");
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
    if (!phone || phone.length !== 11) {
      setError(true);
      setMsg("无法读取当前账号手机号，请重新登录");
      return;
    }
    setSending(true);
    setError(false);
    setMsg("");
    try {
      await sendSmsCodeApi(phone, "delete_account");
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
    if (!code.trim()) {
      setError(true);
      setMsg("请输入验证码");
      return;
    }
    setLoading(true);
    setError(false);
    setMsg("");
    try {
      await deleteAccountApi(code.trim());
      clearAuth();
      onAccountDeleted();
    } catch (err) {
      setError(true);
      setMsg(err instanceof Error ? err.message : "注销失败");
    } finally {
      setLoading(false);
    }
  }

  const canSend = phone.length === 11 && cooldown === 0 && !sending;

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <h1 style={{ margin: 0, fontSize: 18 }}>注销账号</h1>
        <span style={{ width: 64 }} aria-hidden />
      </header>
      <div className="aichat-main" style={{ paddingTop: 8 }}>
        <div className="aichat-card">
          <p style={{ marginTop: 0, fontSize: 14, color: "var(--aichat-muted)" }}>
            当前账号：<strong>{getMaskedPhone()}</strong>
          </p>
          <p style={{ fontSize: 14, color: "var(--aichat-danger)", marginBottom: 16 }}>
            注销后账号数据将永久删除且不可恢复。
          </p>
          <form onSubmit={onSubmit} className="aichat-form">
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
            <button className="aichat-btn-primary" type="submit" disabled={loading} style={{ background: "var(--aichat-danger)" }}>
              {loading ? "处理中…" : "确认注销"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
