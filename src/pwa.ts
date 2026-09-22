import { registerSW } from 'virtual:pwa-register'

export function setupPWA() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // nova versão detectada → ativa e recarrega
      updateSW(true)
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // verifica atualização a cada 60s e ao voltar para a aba
      setInterval(() => registration.update(), 60_000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update()
      })
    },
  })
}
