import SevaiGoApp from "@/components/SevaiGoApp";
import { getSessionUser } from "@/lib/auth";
import { DEMO_LOCATION, getNearbyMechanics } from "@/lib/mechanics";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let shops: any[] = [];
  let user: any = null;

  try {
    const results = await Promise.all([
      getNearbyMechanics({ latitude: DEMO_LOCATION.latitude, longitude: DEMO_LOCATION.longitude, radiusKm: 5 }).catch((err) => {
        console.warn("[SevaiGo Home] getNearbyMechanics warning:", err);
        return [];
      }),
      getSessionUser().catch((err) => {
        console.warn("[SevaiGo Home] getSessionUser warning:", err);
        return null;
      }),
    ]);
    shops = results[0] || [];
    user = results[1] || null;
  } catch (err) {
    console.error("[SevaiGo Home] Server component error:", err);
  }

  return <SevaiGoApp initialShops={shops} initialUser={user} />;
}
