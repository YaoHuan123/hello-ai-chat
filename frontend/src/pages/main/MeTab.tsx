import { type FormEvent, useEffect, useRef, useState } from "react";
import type { RouteName } from "../../types/routes";
import { SUYAN } from "../../constants/suyanCopy";
import { AppIcon } from "../../components/AppIcons";
import {
  generateMeAvatarApi,
  getMeApi,
  updateMeNicknameApi,
  uploadMeAvatarApi,
} from "../../services/api";
import { readFileAsDataUrl, validateAvatarFile } from "../../lib/avatarUrl";
import { ContactAvatar } from "../../components/ContactAvatar";
import {
  getMaskedPhone,
  getMyAvatarContact,
  getMyDisplayName,
  getNickname,
  setAvatarCache,
  setNicknameCache,
} from "../../services/storage";
import { clearAllLocalChatRecords } from "../../services/clearAllLocalChatRecords";

type Props = {
  onNavigateFeature: (route: RouteName) => void;
  onLogout: () => void;
};

const PHRASE_MAX = 120;

const PHRASE_SUGGESTIONS = ["晚风与星尘", "晨光与绿意", "深海与微光", "简约几何"] as const;

export function MeTab({ onNavigateFeature, onLogout }: Props) {
  const [displayName, setDisplayName] = useState(getMyDisplayName);
  const [phoneMask] = useState(getMaskedPhone);
  const [avatarContact, setAvatarContact] = useState(getMyAvatarContact);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [phraseDraft, setPhraseDraft] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  function applyMeProfile(me: Awaited<ReturnType<typeof getMeApi>>) {
    setNicknameCache(me.nickname);
    setAvatarCache(me.avatarUrl, me.avatarUpdatedAt);
    setDisplayName(me.nickname?.trim() || getMaskedPhone());
    setDraft(me.nickname ?? "");
    setAvatarContact(getMyAvatarContact());
  }

  useEffect(() => {
    let cancelled = false;
    void getMeApi()
      .then((me) => {
        if (cancelled) return;
        applyMeProfile(me);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayName(getMyDisplayName());
          setAvatarContact(getMyAvatarContact());
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onConfirmClearChat() {
    setClearing(true);
    try {
      clearAllLocalChatRecords();
      setClearConfirmOpen(false);
      window.setTimeout(() => window.location.reload(), 400);
    } finally {
      setClearing(false);
    }
  }

  function openNicknameSheet() {
    setDraft(getNickname());
    setErr("");
    setSheetOpen(true);
  }

  async function onSaveNickname(e: FormEvent) {
    e.preventDefault();
    const next = draft.trim();
    setSaving(true);
    setErr("");
    try {
      const me = await updateMeNicknameApi(next === "" ? null : next);
      applyMeProfile(me);
      setSheetOpen(false);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function openAvatarPicker() {
    setAvatarMenuOpen(false);
    fileRef.current?.click();
  }

  function openGenerateSheet() {
    setAvatarMenuOpen(false);
    setPhraseDraft("");
    setErr("");
    setGenerateOpen(true);
  }

  async function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationErr = validateAvatarFile(file);
    if (validationErr) {
      setErr(validationErr);
      return;
    }

    setAvatarBusy(true);
    setErr("");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const me = await uploadMeAvatarApi(dataUrl);
      applyMeProfile(me);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "上传失败");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onGenerateAvatar(e: FormEvent) {
    e.preventDefault();
    const phrase = phraseDraft.trim();
    if (!phrase) {
      setErr("请输入一句话");
      return;
    }

    setGenerating(true);
    setErr("");
    try {
      const me = await generateMeAvatarApi(phrase);
      applyMeProfile(me);
      setGenerateOpen(false);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  const avatarLoading = avatarBusy || generating;

  return (
    <div className="aichat-main-shell-tab me-tab">
      <header className="aichat-topbar aichat-topbar--plain">
        <h1>我的</h1>
      </header>
      <div className="aichat-main">
        <div className="me-tab__hero">
          <button
            type="button"
            className="me-tab__avatar-btn"
            onClick={() => setAvatarMenuOpen(true)}
            disabled={avatarLoading}
            aria-label="更换头像"
          >
            <ContactAvatar contact={avatarContact} className="me-tab__avatar me-tab__avatar--letter" />
          </button>
          <button type="button" className="me-tab__hero-meta" onClick={openNicknameSheet} aria-label="设置昵称">
            <strong>{displayName}</strong>
            <span>{phoneMask}</span>
          </button>
          <span className="me-tab__hero-chev" aria-hidden>
            ›
          </span>
        </div>

        {err && !sheetOpen && !generateOpen ? <p className="aichat-form-msg err me-tab__err">{err}</p> : null}

        <section className="me-tab__group" aria-label="素颜">
          <button type="button" className="me-tab__row" onClick={() => onNavigateFeature("assist-mol-list")}>
            <span className="me-tab__row-icon me-tab__row-icon--mol" aria-hidden>
              <AppIcon name="mol" className="app-icon app-icon--mol" />
            </span>
            <span className="me-tab__row-body">
              <b>{SUYAN.my}</b>
              <span>{SUYAN.tagline}</span>
            </span>
            <span className="me-tab__row-chev" aria-hidden>
              ›
            </span>
          </button>
        </section>

        <section className="me-tab__group" aria-label="账号">
          <button type="button" className="me-tab__row" onClick={() => setClearConfirmOpen(true)}>
            <span className="me-tab__row-body">
              <b>清空聊天记录</b>
              <span>仅删除本机私聊、群聊与 YiYi 对话</span>
            </span>
            <span className="me-tab__row-chev" aria-hidden>
              ›
            </span>
          </button>
          <button type="button" className="me-tab__row" onClick={() => onNavigateFeature("delete-account")}>
            <span className="me-tab__row-body">
              <b>注销账号</b>
            </span>
            <span className="me-tab__row-chev" aria-hidden>
              ›
            </span>
          </button>
        </section>

        <button type="button" className="me-tab__logout" onClick={onLogout}>
          退出登录
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="me-tab__file-input"
        tabIndex={-1}
        aria-hidden
        onChange={onAvatarFileChange}
      />

      {avatarMenuOpen ? (
        <div className="contacts-sheet-overlay" role="presentation" onClick={() => !avatarLoading && setAvatarMenuOpen(false)}>
          <div className="contacts-sheet me-tab__avatar-sheet" role="dialog" aria-modal="true" aria-label="更换头像" onClick={(ev) => ev.stopPropagation()}>
            <div className="contacts-sheet__handle" aria-hidden />
            <ul className="me-tab__avatar-options">
              <li>
                <button type="button" className="me-tab__avatar-option me-tab__avatar-option--ai" disabled={avatarLoading} onClick={openGenerateSheet}>
                  <span className="me-tab__avatar-option-icon" aria-hidden>
                    ✦
                  </span>
                  <span className="me-tab__avatar-option-label">AI 生成头像</span>
                </button>
              </li>
              <li>
                <button type="button" className="me-tab__avatar-option" disabled={avatarLoading} onClick={openAvatarPicker}>
                  <span className="me-tab__avatar-option-icon" aria-hidden>
                    ◫
                  </span>
                  <span className="me-tab__avatar-option-label">{avatarBusy ? "处理中…" : "从相册选择"}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      {generateOpen ? (
        <div className="contacts-sheet-overlay" role="presentation" onClick={() => !generating && setGenerateOpen(false)}>
          <div className="contacts-sheet me-tab__gen-sheet" role="dialog" aria-modal="true" aria-labelledby="me-generate-title" onClick={(ev) => ev.stopPropagation()}>
            <div className="contacts-sheet__handle" aria-hidden />
            <div className="me-tab__gen-head">
              <div className={`me-tab__gen-preview${generating ? " me-tab__gen-preview--busy" : ""}`}>
                <ContactAvatar contact={avatarContact} className="me-tab__gen-preview-avatar" />
                {generating ? <span className="me-tab__gen-preview-ring" /> : null}
              </div>
              <h2 id="me-generate-title" className="me-tab__gen-title">
                AI 生成头像
              </h2>
              <p className="me-tab__gen-sub">用一句话描述意象或风格</p>
            </div>

            <form className="me-tab__gen-form" onSubmit={onGenerateAvatar}>
              <div className="me-tab__gen-chips" role="group" aria-label="描述示例">
                {PHRASE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`me-tab__gen-chip${phraseDraft === s ? " me-tab__gen-chip--on" : ""}`}
                    disabled={generating}
                    onClick={() => setPhraseDraft(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="me-tab__gen-field">
                <textarea
                  className="me-tab__gen-input"
                  placeholder="例如：晚风与星尘，温柔且自由"
                  maxLength={PHRASE_MAX}
                  rows={2}
                  value={phraseDraft}
                  onChange={(e) => setPhraseDraft(e.target.value)}
                  disabled={generating}
                  autoFocus
                  aria-label="头像描述"
                />
                <span className="me-tab__gen-count" aria-live="polite">
                  {phraseDraft.length}/{PHRASE_MAX}
                </span>
              </div>

              {err ? <p className="aichat-form-msg err me-tab__gen-err">{err}</p> : null}

              <div className="me-tab__gen-actions">
                <button className="aichat-btn-ghost me-tab__gen-btn" type="button" disabled={generating} onClick={() => setGenerateOpen(false)}>
                  取消
                </button>
                <button className="aichat-btn-primary me-tab__gen-btn" type="submit" disabled={generating || !phraseDraft.trim()}>
                  {generating ? "生成中…" : "生成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {clearConfirmOpen ? (
        <div className="contacts-sheet-overlay" role="presentation" onClick={() => !clearing && setClearConfirmOpen(false)}>
          <div className="contacts-sheet" role="dialog" aria-modal="true" aria-labelledby="me-clear-chat-title" onClick={(ev) => ev.stopPropagation()}>
            <div className="contacts-sheet__handle" aria-hidden />
            <h2 id="me-clear-chat-title" className="contacts-sheet__title">
              清空本机聊天记录
            </h2>
            <p className="me-tab__clear-desc">将删除本机全部私聊、群聊与 YiYi 对话记录，不可恢复。</p>
            <div className="contacts-sheet__actions">
              <button className="aichat-btn-ghost contacts-sheet__btn" type="button" disabled={clearing} onClick={() => setClearConfirmOpen(false)}>
                取消
              </button>
              <button className="aichat-btn-primary contacts-sheet__btn me-tab__clear-confirm" type="button" disabled={clearing} onClick={() => void onConfirmClearChat()}>
                {clearing ? "处理中…" : "清空"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sheetOpen ? (
        <div className="contacts-sheet-overlay" role="presentation" onClick={() => !saving && setSheetOpen(false)}>
          <div className="contacts-sheet" role="dialog" aria-modal="true" aria-labelledby="me-nickname-title" onClick={(ev) => ev.stopPropagation()}>
            <div className="contacts-sheet__handle" aria-hidden />
            <h2 id="me-nickname-title" className="contacts-sheet__title">
              设置昵称
            </h2>
            <form className="aichat-form contacts-sheet__form" onSubmit={onSaveNickname}>
              <input
                className="aichat-input"
                placeholder="昵称"
                maxLength={32}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={saving}
                autoFocus
              />
              {err ? <p className="aichat-form-msg err">{err}</p> : null}
              <div className="contacts-sheet__actions">
                <button className="aichat-btn-ghost contacts-sheet__btn" type="button" disabled={saving} onClick={() => setSheetOpen(false)}>
                  取消
                </button>
                <button className="aichat-btn-primary contacts-sheet__btn" type="submit" disabled={saving}>
                  {saving ? "保存中…" : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
