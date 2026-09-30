// Service worker do Estoque.
//
// DELIBERADAMENTE PEQUENO. O que este app mostra é saldo, fila e situação de
// equipamento: dado que muda a cada minuto e que, servido velho, faz alguém
// prometer uma máquina que já saiu. Então nada de HTML nem de resposta de API
// entra em cache — só o que é imutável.
//
// O ganho real está aí: os arquivos do Next em /_next/static/ têm hash no
// nome, então nunca mudam de conteúdo. Guardá-los tira do caminho toda a
// baixa de JS e CSS na segunda visita, que é a parte pesada de abrir o app.

const CACHE = "estoque-estatico-v1";

self.addEventListener("install", (e) => {
  // Assume o controle já nesta carga, sem esperar a aba antiga fechar.
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // Versão nova do worker joga fora o cache da anterior.
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

const imutavel = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icone-") ||
  url.pathname === "/logo.png" ||
  url.pathname === "/logo-branco.svg";

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Tudo que não for arquivo imutável passa direto para a rede. Sem fallback,
  // sem cache: offline o app não funciona mesmo, e fingir que funciona seria
  // pior que a tela de erro do navegador.
  if (!imutavel(url)) return;

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const guardado = await cache.match(req);
      if (guardado) return guardado;

      const resposta = await fetch(req);
      if (resposta.ok) cache.put(req, resposta.clone());
      return resposta;
    })(),
  );
});
