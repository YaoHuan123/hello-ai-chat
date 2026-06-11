import { useState } from "react";
import {
  GUARDIAN_CREATE_FEATURES,
  type GuardianCreateFeature,
} from "../../constants/guardianCreateFeatures";

type Props = {
  onBack: () => void;
  onContinue: (feature: GuardianCreateFeature | null) => void;
};

export function CreateGuardianGroupFeaturePage({ onBack, onContinue }: Props) {
  const [picked, setPicked] = useState<GuardianCreateFeature | null>(null);

  function toggleFeature(id: GuardianCreateFeature) {
    setPicked((prev) => (prev === id ? null : id));
  }

  return (
    <div className="aichat-shell guardian-create-feature">
      <header className="aichat-topbar aichat-topbar-flex guardian-create-feature__topbar">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          取消
        </button>
        <h1 className="guardian-create-feature__title">选择用途</h1>
        <span className="guardian-create-feature__topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main guardian-create-feature__main">
        <p className="guardian-create-feature__lead">选择群聊主要用途，便于推荐搭子。可不选，直接继续。</p>
        <ul className="guardian-create-feature__list" aria-label="群聊用途">
          {GUARDIAN_CREATE_FEATURES.map((f) => {
            const on = picked === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  className={`guardian-create-feature__row${on ? " guardian-create-feature__row--on" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggleFeature(f.id)}
                >
                  <span className={`guardian-contact-check${on ? " guardian-contact-check--on" : ""}`} aria-hidden>
                    {on ? "✓" : ""}
                  </span>
                  <span className="guardian-create-feature__row-body">
                    <strong className="guardian-create-feature__row-title">{f.id}</strong>
                    <span className="guardian-create-feature__row-hint">{f.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="guardian-create-feature__footer">
        <button type="button" className="aichat-btn-primary guardian-create-feature__continue" onClick={() => onContinue(picked)}>
          继续
        </button>
      </footer>
    </div>
  );
}
