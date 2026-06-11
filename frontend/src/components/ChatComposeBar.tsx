import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { SUYAN } from "../constants/suyanCopy";
import { AppIcon } from "./AppIcons";

type ComposeBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  mol?: ReactNode;
};

export function ChatComposeBar({
  value,
  onChange,
  onSend,
  placeholder = "输入消息",
  disabled = false,
  sendDisabled = false,
  inputRef,
  mol,
}: ComposeBarProps) {
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSend();
  }

  const sendBlocked = disabled || sendDisabled || !value.trim();

  return (
    <div className="msg-chat-c1-compose-row">
      <input
        ref={inputRef}
        className="msg-chat-c1-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      {mol}
      <button type="button" className="msg-chat-c1-send" onClick={onSend} disabled={sendBlocked} aria-label="发送">
        <AppIcon name="sendPlane" className="app-icon app-icon--sm msg-chat-c1-compose-icon msg-chat-c1-compose-icon--fill" />
      </button>
    </div>
  );
}

type MolButtonProps = {
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function MolComposeButton({ pressed, disabled, onClick }: MolButtonProps) {
  return (
    <button
      type="button"
      className="msg-chat-c1-mol-btn"
      aria-pressed={pressed}
      aria-label={SUYAN.name}
      onClick={onClick}
      disabled={disabled}
    >
      <AppIcon name="suyanHorn" className="app-icon msg-chat-c1-mol-horn-icon" />
    </button>
  );
}
