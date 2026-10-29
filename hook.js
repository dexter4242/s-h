/*
 * Stream helper — mod TizenBrew
 *
 * Ruleaza in pagina reala, la domeniul real (injectie CDP, inainte de incarcare).
 * Prinde URL-ul streamului din traficul paginii si il trimite serviciului local
 * de pe 127.0.0.1:18080.
 */
(function () {
    "use strict";

    var SERVICIU = "http://127.0.0.1:18080/capture";
    var trimise = {};
    var ultimulText = "";
    var caseta = null;

    // ce arata ca un stream
    var ARATA_STREAM = /\.m3u8|\.mpd|\/hls\/|\/live\/|playlist|manifest|\.ts(\?|$)/i;

    /* Afiseaza in colt. La injectie (document-start) body NU exista inca,
     * deci amanam pana la DOMContentLoaded — altfel markerul e mut. */
    function arata(text) {
        ultimulText = text;
        try {
            if (!document.body) {
                document.addEventListener("DOMContentLoaded", function () { arata(ultimulText); });
                return;
            }
            if (!caseta || !caseta.parentNode) {
                caseta = document.getElementById("hls-note");
                if (!caseta) {
                    caseta = document.createElement("div");
                    caseta.id = "hls-note";
                    caseta.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;" +
                        "background:rgba(0,0,0,.88);color:#0f0;font:13px monospace;" +
                        "padding:8px 12px;border-radius:6px;max-width:92vw;word-break:break-all;" +
                        "pointer-events:none";
                }
                document.body.appendChild(caseta);
            }
            caseta.textContent = ultimulText;
        } catch (e) { /* fara DOM */ }
    }

    function semnaleaza(url) {
        if (!url || typeof url !== "string") return;
        if (url.indexOf("127.0.0.1:18080") !== -1) return;   // propriul POST
        if (!ARATA_STREAM.test(url)) return;
        if (trimise[url]) return;
        trimise[url] = 1;

        var complet = url;
        try { complet = new URL(url, location.href).href; } catch (e) { }

        try {
            var x = new XMLHttpRequest();
            x.open("GET", SERVICIU +
                "?u=" + encodeURIComponent(complet) +
                "&p=" + encodeURIComponent(location.href), true);
            x.send();
        } catch (e) { }

        console.log("[hls] capturat: " + complet);
        arata("CAPTURAT\n" + complet);
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

    /* ---- src pe <video>/<audio> ---- */
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

    /* ---- src prin setAttribute (iframe / source / video) ---- */
    try {
        var setAttrVechi = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (nume, valoare) {
            try {
                if (String(nume).toLowerCase() === "src") semnaleaza(String(valoare));
            } catch (e) {}
            return setAttrVechi.apply(this, arguments);
        };
    } catch (e) {}

    /* ---- marker: ne spune daca hook-ul a ajuns in pagina ---- */
    console.log("[hls] hook activ pe " + location.href);
    arata("hook activ\n" + location.href);
})();
