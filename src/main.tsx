import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { setupPWA } from "./pwa";

// ✅ Portal do tutor: /a/<código> abre só a página de acompanhamento (sem login e sem o app da loja)
const codigoTutor = window.location.pathname.match(/^\/a\/([A-Za-z0-9]{20,40})\/?$/)?.[1];

const App = lazy(() => import("./app/App.tsx"));
const PortalTutor = lazy(() => import("./app/components/PortalTutor").then((m) => ({ default: m.PortalTutor })));

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={null}>
    {codigoTutor ? <PortalTutor codigo={codigoTutor} /> : <App />}
  </Suspense>,
);

// o tutor não precisa do app instalado no celular dele
if (!codigoTutor) setupPWA();
