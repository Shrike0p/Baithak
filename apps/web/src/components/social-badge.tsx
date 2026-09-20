import { ExternalLink } from "lucide-react";
import type { Social } from "@/lib/api";

// lucide dropped brand marks, and shipping our own would imply an endorsement
// we don't have. The platform name in text does the same job.
const LABELS = { linkedin: "LinkedIn", instagram: "Instagram", x: "X" };

/**
 * A link someone gave, not a verified identity — we never checked they own it.
 * Worded as "linked", never "verified", so it isn't mistaken for a check we
 * didn't do.
 */
export function SocialBadge({ social, compact = false }: { social: Social; compact?: boolean }) {
  return (
    <a
      href={social.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={`${LABELS[social.platform]} linked — opens in a new tab. Not verified by us.`}
      className="inline-flex items-center gap-1.5 border-2 border-foreground bg-card px-2 py-1 font-mono text-xs font-bold hover:bg-muted"
    >
      <ExternalLink className="size-3.5" />
      {compact ? LABELS[social.platform] : `${LABELS[social.platform]} · @${social.handle}`}
    </a>
  );
}
