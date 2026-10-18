import SevaiGoApp from "@/components/SevaiGoApp";
import { getSessionUser } from "@/lib/auth";
import { DEMO_LOCATION, getNearbyMechanics } from "@/lib/mechanics";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [shops, user] = await Promise.all([
    getNearbyMechanics({ latitude: DEMO_LOCATION.latitude, longitude: DEMO_LOCATION.longitude, radiusKm: 5 }),
    getSessionUser(),
  ]);
  return <SevaiGoApp initialShops={shops} initialUser={user} />;
}
