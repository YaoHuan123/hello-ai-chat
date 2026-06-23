import { YIYI } from "../constants/productCopy";
import { profileCompletenessFrom, profileDimStatus } from "../services/yiyiClient";
import type { YiyiProfile } from "../types/yiyi";

type Props = {
  profile: YiyiProfile;
};

type DimId = "social" | "personality" | "other";

function DimIcon({ id }: { id: DimId }) {
  switch (id) {
    case "social":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 6v3M12 15v3M6 12h3M15 12h3" />
        </svg>
      );
    case "personality":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
        </svg>
      );
    case "other":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
        </svg>
      );
  }
}

const DIMS: { id: DimId; label: string; value: (p: YiyiProfile) => string; tags: (p: YiyiProfile) => string[] }[] = [
  { id: "social", label: "关注方向", value: (p) => p.socialDirection, tags: (p) => p.tags.social },
  { id: "personality", label: "性格", value: (p) => p.personality, tags: (p) => p.tags.personality },
  { id: "other", label: "其它", value: (p) => p.other, tags: (p) => p.tags.other },
];

export function YiyiProfileBlock({ profile }: Props) {
  const completeness = profileCompletenessFrom(profile);

  return (
    <>
      <section className="yiyi-profile-hero" aria-label="画像概览">
        <div className="yiyi-profile-hero__row">
          <div className="yiyi-profile-hero__avatar" aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="8" r="3.5" />
            </svg>
          </div>
          <div className="yiyi-profile-hero__meta">
            <h2 className="yiyi-profile-hero__title">{YIYI.profileHero}</h2>
            <p className="yiyi-profile-hero__sub">
              完整度 {completeness}% · 仅用于对外表达
            </p>
          </div>
        </div>
        <div className="yiyi-profile-hero__progress">
          <div className="yiyi-profile-hero__progress-head">
            <span>画像完整度</span>
            <b>{completeness}%</b>
          </div>
          <div className="yiyi-profile-hero__track" role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100}>
            <div className="yiyi-profile-hero__fill" style={{ width: `${completeness}%` }} />
          </div>
        </div>
      </section>

      <section className="yiyi-profile-card" aria-label="画像维度">
        <ul className="yiyi-profile-dims">
          {DIMS.map((dim) => {
            const status = profileDimStatus(dim.value(profile), dim.tags(profile));
            return (
              <li key={dim.id}>
                <div className="yiyi-profile-dim">
                  <span className={`yiyi-profile-dim__icon yiyi-profile-dim__icon--${dim.id}`}>
                    <DimIcon id={dim.id} />
                  </span>
                  <span className="yiyi-profile-dim__label">{dim.label}</span>
                  <span className={`yiyi-profile-dim__status${status.filled ? " yiyi-profile-dim__status--filled" : ""}`}>
                    {status.text}
                  </span>
                  <span className="yiyi-profile-dim__chev" aria-hidden>
                    ›
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
