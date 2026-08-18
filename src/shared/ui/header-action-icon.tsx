type HeaderActionIconName = "delete" | "edit" | "redo" | "share" | "undo";

type HeaderActionIconProps = {
  name: HeaderActionIconName;
};

export function HeaderActionIcon({ name }: HeaderActionIconProps) {
  if (name === "edit") {
    return (
      <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 20 20">
        <path d="m4 16 1.2-4.2L13.9 3a2 2 0 0 1 2.8 2.8L8 14.6 4 16Z" />
        <path d="m12.3 4.6 3.1 3.1" />
      </svg>
    );
  }

  if (name === "share") {
    return (
      <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 20 20">
        <circle cx="7.25" cy="6.5" r="2.5" />
        <path d="M2.75 16c.55-2.55 2.18-4 4.5-4s3.95 1.45 4.5 4M14 8.5h4M16 6.5v4" />
      </svg>
    );
  }

  if (name === "delete") {
    return (
      <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 20 20">
        <path d="M4 5.5h12M8 5.5v-2h4v2M6.25 5.5l.7 10h6.1l.7-10M8.5 8.5v4M11.5 8.5v4" />
      </svg>
    );
  }

  if (name === "undo") {
    return (
      <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 20 20">
        <path d="M7.6 5.15 3.75 9l3.85 3.85" />
        <path d="M4.3 9h7.2a4.25 4.25 0 1 1 0 8.5H9.7" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 20 20">
      <path d="M12.4 5.15 16.25 9l-3.85 3.85" />
      <path d="M15.7 9H8.5a4.25 4.25 0 1 0 0 8.5h1.8" />
    </svg>
  );
}
