import type { YiyiProfile } from "../types/yiyi";

type Props = {
  profile: YiyiProfile;
};

export function YiyiProfileBlock({ profile }: Props) {
  return (
    <section className="yiyi-profile-block" aria-label="YiYi">
      <div className="yiyi-dim">
        <span className="yiyi-dim__label">关注方向</span>
        <strong className="yiyi-dim__value">{profile.socialDirection}</strong>
        {profile.tags.social.length > 0 ? (
          <div className="yiyi-dim__chips">
            {profile.tags.social.map((t) => (
              <span key={t} className="yiyi-dim__chip">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="yiyi-dim">
        <span className="yiyi-dim__label">性格</span>
        <strong className="yiyi-dim__value">{profile.personality}</strong>
        {profile.tags.personality.length > 0 ? (
          <div className="yiyi-dim__chips">
            {profile.tags.personality.map((t) => (
              <span key={t} className="yiyi-dim__chip">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="yiyi-dim">
        <span className="yiyi-dim__label">其它</span>
        <strong className="yiyi-dim__value">{profile.other}</strong>
        {profile.tags.other.length > 0 ? (
          <div className="yiyi-dim__chips">
            {profile.tags.other.map((t) => (
              <span key={t} className="yiyi-dim__chip">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
