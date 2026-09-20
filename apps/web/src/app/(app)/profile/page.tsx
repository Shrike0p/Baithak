import { getMe } from "@/lib/api";
import { ProfileEditor } from "@/components/profile-editor";

export default async function ProfilePage() {
  const me = await getMe();
  return <ProfileEditor me={me} />;
}
