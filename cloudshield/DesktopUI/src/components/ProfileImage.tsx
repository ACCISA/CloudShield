export interface ProfileImageProps {
  /** User's name (used for alt text and fallback initials) */
  name?: string;
  /** User's email (used for fallback if no name) */
  email?: string;
  /** URL to the profile image */
  imageUrl?: string;
  /** Size of the profile image in pixels */
  size?: "sm" | "md" | "lg";
  /** Test ID for testing purposes */
  testId?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

/**
 * Extracts initials from a name or email
 */
function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || "?";
  }
  if (email) {
    const localPart = email.split("@")[0];
    return localPart?.substring(0, 2).toUpperCase() || "?";
  }
  return "?";
}

/**
 * Generates a consistent color based on the name/email
 */
function getColorFromString(str: string): string {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * ProfileImage component for displaying user profile pictures
 * Falls back to initials with a colored background if no image is provided
 */
export default function ProfileImage({
  name,
  email,
  imageUrl,
  size = "md",
  testId = "profile-image",
}: ProfileImageProps) {
  const initials = getInitials(name, email);
  const bgColor = getColorFromString(name || email || "user");
  const altText = name || email || "User avatar";

  if (imageUrl) {
    return (
      <div
        data-testid={testId}
        className={`${sizeClasses[size]} overflow-hidden rounded-full border border-white/10`}
      >
        <img
          src={imageUrl}
          alt={altText}
          data-testid={`${testId}-img`}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Hide the image on error and show fallback
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      className={`${sizeClasses[size]} ${bgColor} flex items-center justify-center rounded-full border border-white/10 font-semibold text-white`}
    >
      <span data-testid={`${testId}-initials`}>{initials}</span>
    </div>
  );
}
