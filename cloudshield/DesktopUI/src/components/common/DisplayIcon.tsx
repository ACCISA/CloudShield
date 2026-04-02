import { useMemo, useState } from "react";

type DisplayIconType = "workstation" | "user" | "group";
type DisplayIconSize = "small" | "medium" | "large";

type DisplayIconProps = {
  type?: DisplayIconType;
  data?: Record<string, unknown>;
  size?: DisplayIconSize;
  className?: string;
};

const sizeClassMap: Record<DisplayIconSize, string> = {
  small: "h-8 w-8 text-xs",
  medium: "h-10 w-10 text-sm",
  large: "h-14 w-14 text-base",
};

const colorByType: Record<DisplayIconType, string> = {
  workstation: "#4A90E2",
  user: "#7B68EE",
  group: "#50C878",
};

const readString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const getNameForType = (type: DisplayIconType, data: Record<string, unknown>) => {
  if (type === "workstation") {
    return (
      readString(data.name) ||
      readString(data.workstationName) ||
      readString(data.hostname) ||
      "Unknown Workstation"
    );
  }

  if (type === "group") {
    return readString(data.name) || readString(data.groupName) || "Unknown Group";
  }

  const first = readString(data.firstName) || "";
  const last = readString(data.lastName) || "";
  return (
    `${first} ${last}`.trim() ||
    readString(data.full_name) ||
    readString(data.name) ||
    readString(data.username) ||
    readString(data.email) ||
    "Unknown User"
  );
};

const getInitialsFromName = (name: string) => {
  const tokens = (name.match(/[A-Za-z0-9]+/g) || []).filter(Boolean);

  if (tokens.length >= 2) {
    return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return "??";
};

const resolveImage = (data: Record<string, unknown>) => {
  const candidates = [
    data.profileImage,
    data.profile_image,
    data.profilePicture,
    data.avatar,
    data.image,
    data.group_image,
  ];

  for (const candidate of candidates) {
    const src = readString(candidate);
    if (src) return src;
  }

  return null;
};

export default function DisplayIcon({
  type = "workstation",
  data = {},
  size = "medium",
  className = "",
}: DisplayIconProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const name = useMemo(() => getNameForType(type, data), [type, data]);
  const initials = useMemo(() => getInitialsFromName(name), [name]);
  const imageSrc = useMemo(() => resolveImage(data), [data]);
  const bgColor = readString(data.color) || colorByType[type];

  return (
    <div
      title={name}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#0f0f0f] ${sizeClassMap[size]} ${className}`.trim()}
    >
      {imageSrc && !imageFailed ? (
        <img
          src={imageSrc}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-semibold text-white"
          style={{ backgroundColor: bgColor }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
