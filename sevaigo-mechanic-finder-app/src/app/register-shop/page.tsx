import type { Metadata } from "next";
import RegisterShopFlow from "@/components/RegisterShopFlow";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Register Your Workshop | SEVAIGO Roadside Partner Network",
  description:
    "Join SEVAIGO as a verified mechanic or workshop owner. Connect with stranded motorists in real time, define your vehicle specializations, and grow your garage business.",
};

export default async function RegisterShopPage() {
  const user = await getSessionUser();
  return <RegisterShopFlow initialUser={user} />;
}
