const YIYI_AVATAR_SRC = "/yiyi-avatars/default.png";

type Props = {
  className?: string;
  alt?: string;
};

export function YiyiAvatar({ className = "yiyi-avatar", alt = "" }: Props) {
  return <img src={YIYI_AVATAR_SRC} alt={alt} className={className} draggable={false} />;
}
