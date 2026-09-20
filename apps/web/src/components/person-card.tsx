import Image from "next/image";
import Link from "next/link";
import { Pill } from "@/components/ui";

const AVATAR_TONES = ["bg-primary", "bg-secondary", "bg-accent"];

export function Avatar({
  name,
  image,
  index = 0,
  size = "md",
}: {
  name: string;
  image?: string | null;
  index?: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-16 text-lg" };
  const shell = `${sizes[size]} ${AVATAR_TONES[index % AVATAR_TONES.length]} flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-foreground font-mono font-bold shadow-stamp-sm`;

  // Initials stay the fallback rather than a grey silhouette — a coloured
  // monogram reads as a person, and most people won't have uploaded a photo.
  if (!image) return <div className={shell}>{name.slice(0, 2).toUpperCase()}</div>;

  return (
    <div className={shell}>
      <Image src={image} alt={name} width={128} height={128} className="size-full object-cover" />
    </div>
  );
}

export function PersonCard({
  person,
  index = 0,
  badge,
  reason,
}: {
  person: {
    id?: string;
    name: string;
    image?: string | null;
    social?: { url: string; platform: "linkedin" | "instagram" | "x"; handle: string } | null;
    age: number | null;
    city: string | null;
    occupation: string | null;
    vibeTags: string[];
    trustScore: number;
    plansAttended: number;
    sharedPlans?: number;
  };
  index?: number;
  badge?: string;
  reason?: string;
}) {
  const subtitle = [person.age, person.city, person.occupation].filter(Boolean).join(" · ");

  // These cards used to link nowhere, which is an odd thing in a product whose
  // principle is that people are the product.
  const card = (
    <div>
      <div className="paper-card p-4 transition-transform group-hover:-translate-y-0.5">
        <div className="flex gap-4">
          <Avatar name={person.name} image={person.image} index={index} />
          <div className="min-w-0">
            <h3 className="text-lg uppercase">{person.name}</h3>
            <p className="text-sm">{subtitle}</p>
          </div>
          <span className="ml-auto font-mono text-sm font-bold">
            ★ {person.trustScore.toFixed(1)}
          </span>
        </div>

        {person.vibeTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {person.vibeTags.map((v) => (
              <Pill key={v}>{v}</Pill>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-sm font-bold">
            {person.plansAttended} plans attended
            {person.sharedPlans ? ` · ${person.sharedPlans} with you` : ""}
          </p>
          {badge && <Pill tone={badge === "Host" ? "orange" : "plain"}>{badge}</Pill>}
        </div>
      </div>

      {reason && (
        <div className="border-x-2 border-b-2 border-foreground bg-muted p-3 text-sm">
          <strong>Why you might vibe:</strong> {reason}
        </div>
      )}
    </div>
  );

  if (!person.id) return card;

  return (
    <Link href={`/people/${person.id}`} className="group block">
      {card}
    </Link>
  );
}
