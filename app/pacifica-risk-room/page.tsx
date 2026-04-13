import { Suspense } from "react";
import PacificaRiskRoomPage from "@/components/PacificaRiskRoom/PacificaRiskRoomPage";

export default function PacificaRiskRoomRoute() {
  return (
    <Suspense fallback={null}>
      <PacificaRiskRoomPage />
    </Suspense>
  );
}
