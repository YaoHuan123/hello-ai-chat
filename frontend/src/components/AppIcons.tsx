export type AppIconName =
  | "mail"
  | "mol"
  | "aiContact"
  | "usersGroup"
  | "user"
  | "usersEmpty"
  | "molSpark"
  | "explore"
  | "mine"
  | "hot";

type Props = {
  name: AppIconName;
  className?: string;
};

function IconPaths({ name }: { name: AppIconName }) {
  switch (name) {
    case "mail":
      return (
        <>
          <path d="M4 7l8 5 8-5" />
          <rect x="4" y="5" width="16" height="14" rx="2" />
        </>
      );
    case "mol":
      return (
        <>
          <path d="M12 3 4 7v10l8 4 8-4V7z" />
          <path d="M12 11v10M4 7l8 4 8-4" />
        </>
      );
    case "aiContact":
      return (
        <>
          <rect x="5" y="8" width="14" height="11" rx="2" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          <circle cx="9.5" cy="13" r="0.5" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="13" r="0.5" fill="currentColor" stroke="none" />
          <path d="M10 16h4" />
        </>
      );
    case "usersGroup":
    case "usersEmpty":
      return (
        <>
          <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
          <circle cx="9" cy="8" r="3" />
          <path d="M22 19v-1a4 4 0 0 0-3-3.87" />
          <path d="M16 4.13a4 4 0 0 1 0 7.75" />
        </>
      );
    case "user":
      return (
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="8" r="3.5" />
        </>
      );
    case "molSpark":
      return <path d="M12 3l1.2 4.2L17 8l-3.8 1.2L12 14l-1.2-4.8L7 8l3.8-0.8z" />;
    case "explore":
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
          <path d="M11 8v6M8 11h6" />
        </>
      );
    case "mine":
      return (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 10h8M8 14h5" />
        </>
      );
    case "hot":
      return <path d="M12 22c4-2.5 6-5.5 6-9a6 6 0 0 0-10.5-4 6 6 0 0 0-1.5 8c.5-.5 1.2-.8 2-.8 1.7 0 3 1.3 3 3 0 1.5-1 2.8-2.5 3.5" />;
  }
}

export function AppIcon({ name, className = "app-icon" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <IconPaths name={name} />
    </svg>
  );
}
