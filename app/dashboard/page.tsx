import { listBookManifests } from "@/services/input/books";
import AppFrame from "@/app/components/AppFrame";
import DashboardClient from "@/app/dashboard/DashboardClient";

export default async function DashboardPage() {
  const manifests = await listBookManifests();

  return (
    <AppFrame>
      <DashboardClient manifests={manifests} />
    </AppFrame>
  );
}
