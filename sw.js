/* 소싱 노트 — 오프라인용 캐시
   시장 안에서 신호가 끊겨도 앱이 열리도록 필요한 파일을 담아둔다.
   화면(HTML)은 인터넷이 되면 항상 새로 받아오고(그래야 업데이트가 바로 반영된다),
   안 되면 담아둔 것을 쓴다. */
var VERSION = "v2";
var CACHE = "sourcing-" + VERSION;
var ASSETS = [
  "sourcing.html",
  "recover.html",
  "jsqr.min.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        return c.add(new Request(u, { cache: "reload" }))["catch"](function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches["delete"](k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  /* 번역·지도 같은 바깥 요청은 건드리지 않는다 */
  if (url.origin !== self.location.origin) return;

  var wantsPage = req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") > -1;

  if (wantsPage) {
    /* no-cache 로 받아야 서버에 바뀐 게 있으면 새로고침 한 번에 바로 반영된다
       (GitHub Pages 는 HTML 을 몇 분 동안 캐시하라고 알려준다).
       신호가 나쁠 때 하염없이 기다리지 않도록 2.5초가 지나면 담아둔 화면을 먼저 보여준다. */
    var fresh = new Request(req.url, { cache: "no-cache", credentials: "same-origin" });
    e.respondWith(new Promise(function (resolve) {
      var settled = false;
      function give(res) {
        if (settled || !res) return;
        settled = true;
        resolve(res);
      }
      var timer = setTimeout(function () {
        caches.match(req).then(function (hit) {
          if (hit) { give(hit); return; }
          /* 소싱 노트 화면일 때만 담아둔 것으로 대신한다 */
          if (url.pathname.indexOf("sourcing.html") > -1) caches.match("sourcing.html").then(give);
        });
      }, 2500);

      fetch(fresh).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        clearTimeout(timer);
        give(res);
      })["catch"](function () {
        clearTimeout(timer);
        caches.match(req).then(function (hit) {
          if (hit) { give(hit); return; }
          /* 소싱 노트 화면일 때만 담아둔 것으로 대신한다 (같은 주소의 다른 페이지는 건드리지 않게) */
          if (url.pathname.indexOf("sourcing.html") > -1) {
            caches.match("sourcing.html").then(function (h2) { give(h2 || Response.error()); });
          } else {
            give(Response.error());
          }
        });
      });
    }));
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        /* 담아둔 것을 바로 주고, 뒤에서 조용히 새 것으로 바꿔둔다 */
        fetch(req).then(function (res) {
          if (res && res.ok) caches.open(CACHE).then(function (c) { c.put(req, res); });
        })["catch"](function () {});
        return hit;
      }
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
