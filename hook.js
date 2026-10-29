/*
 * TVRON Captura — mod TizenBrew
 *
 * Rulează în pagina reală, la domeniul real (injecție CDP, înainte de încărcare).
 * Prinde URL-ul streamului din traficul paginii și îl trimite serviciului local
 * al aplicației TVRON, care îl folosește ca suprascriere pentru canal.
 */
(function () {
    "use strict";

    var SERVICIU = "http://127.0.0.1:18080/capture";
    var trimise = {};

    // ce arată ca un stream
    var ARATA_STREAM = /\.m3u8|\.mpd|\/hls\/|\/live\/|playlist|manifest|\.ts(\?|$)/i;

    // afiseaza in colt ce s-a prins (util la test, vizibil pe TV)
    function arata(text) {
        try {
            var d = document.getElementById("tvron-captura");
            if (!d) {
                d = document.createElement("div");
                d.id = "tvron-captura";
                d.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;" +
                    "background:rgba(0,0,0,.85);color:#0f0;font:13px monospace;" +
                    "padding:8px 12px;border-radius:6px;max-width:92vw;word-break:break-all;" +
                    "pointer-events:none";
                (document.body || document.documentElement).appendChild(d);
            }
            d.textContent = text;
        } catch (e) { /* fara DOM inca */ }
    }

    function semnaleaza(url) {
        if (!url || typeof url !== "string") return;
        // nu ne intercepta propriul POST (altfel recursie infinita)
        if (url.indexOf("127.0.0.1:18080") !== -1) return;
        if (!ARATA_STREAM.test(url)) return;
        if (trimise[url]) return;
        trimise[url] = 1;

        var complet = url;
        try { complet = new URL(url, location.href).href; } catch (e) { /* lasă cum e */ }

        try {
            var x = new XMLHttpRequest();
            x.open("GET", SERVICIU +
                "?u=" + encodeURIComponent(complet) +
                "&p=" + encodeURIComponent(location.href), true);
            x.send();
        } catch (e) { /* serviciul poate fi oprit */ }

        console.log("[tvron] capturat: " + complet);
        arata("TVRON: trimis\n" + complet);
    }

    /* ---- XMLHttpRequest ---- */
    try {
        var openVechi = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (metoda, adresa) {
            try { semnaleaza(String(adresa)); } catch (e) {}
            return openVechi.apply(this, arguments);
        };
    } catch (e) {}

    /* ---- fetch ---- */
    try {
        if (window.fetch) {
            var fetchVechi = window.fetch;
            window.fetch = function (intrare) {
                try {
                    semnaleaza(typeof intrare === "string" ? intrare : (intrare && intrare.url));
                } catch (e) {}
                return fetchVechi.apply(this, arguments);
            };
        }
    } catch (e) {}

    /* ---- src pe <video>/<audio>/<source> ---- */
    try {
        var d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
        if (d && d.set) {
            Object.defineProperty(HTMLMediaElement.prototype, "src", {
                configurable: true,
                get: d.get,
                set: function (v) {
                    try { semnaleaza(String(v)); } catch (e) {}
                    return d.set.call(this, v);
                }
            });
        }
    } catch (e) {}

    /* ---- <source src> introdus prin setAttribute ---- */
    try {
        var setAttrVechi = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (nume, valoare) {
            try {
                if (String(nume).toLowerCase() === "src") semnaleaza(String(valoare));
            } catch (e) {}
            return setAttrVechi.apply(this, arguments);
        };
    } catch (e) {}

    console.log("[tvron] hook activ pe " + location.href);
})();
