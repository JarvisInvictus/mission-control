// Generate self-contained referral code: RANDOMCODE_BASE64(name::email)
export function generateReferralCode(name: string, email: string): string {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const encoded = btoa(`${name.trim()}::${email.toLowerCase().trim()}`);
  return `${randomPart}_${encoded}`;
}

// Decode referrer info from self-contained referral code
export function decodeReferralCode(code: string): { name: string; email: string } | null {
  const underscoreIdx = code.indexOf("_");
  if (underscoreIdx === -1) return null;
  const encoded = code.substring(underscoreIdx + 1);
  try {
    const decoded = atob(encoded);
    const [name, email] = decoded.split("::");
    if (name && email) return { name: name.trim(), email: email.trim() };
  } catch {}
  return null;
}
