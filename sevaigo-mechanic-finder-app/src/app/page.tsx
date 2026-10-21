import SevaiGoApp from "@/components/SevaiGoApp";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser().catch((err) => {
    console.warn("[SevaiGo Home] getSessionUser warning:", err);
    return null;
  });

  return <SevaiGoApp initialShops={[]} initialUser={user} />;
}
