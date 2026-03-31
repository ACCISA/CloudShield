// usernameUtil.ts
// Utility to derive username for VPN/RDP from JWT claims

export function deriveUsername(claims: { [key: string]: any }): string {
  let username = "";
  if (claims.username?.trim()) username = claims.username.trim();
  if (claims.email?.includes("@")) username = claims.email.split("@")[0].trim();
  if (claims.full_name?.trim())
    username = claims.full_name.trim().toLowerCase();
  let firstNameLetter = username.charAt(0);
  let lastName = username.split(" ")[1];
  return firstNameLetter + "_" + lastName;
}
