import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { setupPWA } from "./pwa";

// ✅ Portal do tutor: /a/<código> abre só a página de acompanhamento (sem login e sem o app da loja)
const codigoTutor = window.location.pathname.match(/^\/a\/([A-Za-z0-9]{20,40})\/?$/)?.[1];
// ✅ Agendamento online: /agendar/<loja> (marcar) e /agendamento/<código> (acompanhar o pedido)
const lojaAgendar = window.location.pathname.match(/^\/agendar\/([a-z0-9-]{1,60})\/?$/)?.[1];
const codigoPedido = window.location.pathname.match(/^\/agendamento\/([A-Za-z0-9]{20,40})\/?$/)?.[1];
const paginaPublica = !!(codigoTutor || lojaAgendar || codigoPedido);

const App = lazy(() => import("./app/App.tsx"));
const PortalTutor = lazy(() => import("./app/components/PortalTutor").then((m) => ({ default: m.PortalTutor })));
const AgendarOnline = lazy(() => import("./app/components/agendamento/PaginaAgendamento").then((m) => ({ default: m.AgendarOnline })));
const AcompanharPedido = lazy(() => import("./app/components/agendamento/PaginaAgendamento").then((m) => ({ default: m.AcompanharPedido })));

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={null}>
    {codigoTutor ? <PortalTutor codigo={codigoTutor} />
      : lojaAgendar ? <AgendarOnline loja={lojaAgendar} />
      : codigoPedido ? <AcompanharPedido codigo={codigoPedido} />
      : <App />}
  </Suspense>,
);

// o tutor não precisa do app instalado no celular dele
if (!paginaPublica) setupPWA();
