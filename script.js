/**
 * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 * ┃  PORTAL GEEK - ULTIMATE ENGINE v14.0  ┃
 * ┃  PC + MOBILE COMPATIBILITY CORE      ┃
 * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 * Mobile-first ✔
 * Desktop-aware ✔
 * Zero bot, zero gambiarra ✔
 */

const APP_STATE = {
    player: null,
    searchType: 'music',

    favoritos: {
        music: JSON.parse(localStorage.getItem('pg_favs_music')) || [],
        anime: JSON.parse(localStorage.getItem('pg_favs_anime')) || []
    },

    fila: [],
    filaIndex: 0,

    translationCache: new Map(),

    API_URL: 'https://kjdrex-ip-31-57-60-2.tunnelmole.net',

    isSearching: false,
    isDesktop: window.matchMedia('(min-width: 1024px)').matches
};

/* ────────────────────────────────────────────── */
/* 1. CORE HELPERS */
/* ────────────────────────────────────────────── */

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

function api(endpoint) {
    return fetch(`${APP_STATE.API_URL}${endpoint}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);
}

/* ────────────────────────────────────────────── */
/* 2. RESPONSIVE AWARENESS (MOBILE x DESKTOP) */
/* ────────────────────────────────────────────── */

window.addEventListener('resize', () => {
    APP_STATE.isDesktop = window.matchMedia('(min-width: 1024px)').matches;
});

/* ────────────────────────────────────────────── */
/* 3. TRADUÇÃO COM CACHE */
/* ────────────────────────────────────────────── */

async function traduzir(texto) {
    if (!texto) return '';
    if (APP_STATE.translationCache.has(texto)) return APP_STATE.translationCache.get(texto);

    try {
        const res = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(texto)}`
        );
        const data = await res.json();
        const traduzido = data[0][0][0];
        APP_STATE.translationCache.set(texto, traduzido);
        return traduzido;
    } catch {
        return texto;
    }
}

/* ────────────────────────────────────────────── */
/* 4. ABAS (MÚSICA / ANIME) */
/* ────────────────────────────────────────────── */

function setSearchType(type) {
    APP_STATE.searchType = type;

    qsa('.tab-btn').forEach(b => b.classList.remove('active'));
    qs(`#type-${type}`)?.classList.add('active');

    qs('#search-input').placeholder =
        type === 'music' ? 'Buscar música ou artista...' : 'Buscar anime...';

    renderFavoritos();
}

/* ────────────────────────────────────────────── */
/* 5. FAVORITOS (SEPARADOS) */
/* ────────────────────────────────────────────── */

function renderFavoritos() {
    const wrapper = qs('#favorites-wrapper');
    if (!wrapper) return;

    const lista = APP_STATE.favoritos[APP_STATE.searchType];

    if (!lista.length) {
        wrapper.innerHTML = `<p class="empty">Coleção vazia</p>`;
        return;
    }

    wrapper.innerHTML = lista.map(item => `
        <div class="fav-card" onclick="${
            APP_STATE.searchType === 'music'
                ? `abrirPlayerAvulso('${item.id}','${item.title}','${item.author}')`
                : `verDetalhesAnime(${item.id})`
        }">
            <img src="${item.thumb}">
            <span>${item.title}</span>
            <button onclick="event.stopPropagation();toggleFavorito('${item.id}')">✕</button>
        </div>
    `).reverse().join('');
}

function toggleFavorito(id) {
    const type = APP_STATE.searchType;
    const list = APP_STATE.favoritos[type];
    const idx = list.findIndex(f => f.id == id);

    if (idx > -1) list.splice(idx, 1);
    localStorage.setItem(`pg_favs_${type}`, JSON.stringify(list));

    renderFavoritos();
}

/* ────────────────────────────────────────────── */
/* 6. BUSCA */
/* ────────────────────────────────────────────── */

async function buscar() {
    const q = qs('#search-input').value.trim();
    if (!q || APP_STATE.isSearching) return;

    APP_STATE.isSearching = true;
    renderSkeletons();

    try {
        if (APP_STATE.searchType === 'music') {
            const tracks = await api(`/search?q=${encodeURIComponent(q)}`);
            renderMusicas(tracks || []);
        } else {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${q}&limit=12`);
            const { data } = await res.json();
            renderAnimes(data || []);
        }
    } finally {
        APP_STATE.isSearching = false;
    }
}

/* ────────────────────────────────────────────── */
/* 7. RENDERIZAÇÃO */
/* ────────────────────────────────────────────── */

function renderMusicas(tracks) {
    APP_STATE.fila = tracks;
    const list = qs('#music-results');

    list.innerHTML = tracks.map((t, i) => `
        <div class="track-card" onclick="abrirPlayerFila(${i})">
            <img src="${t.thumb}">
            <div>
                <strong>${t.title}</strong>
                <small>${t.author}</small>
            </div>
        </div>
    `).join('');
}

async function renderAnimes(data) {
    const list = qs('#music-results');

    const html = await Promise.all(data.map(async a => `
        <div class="anime-card" onclick="verDetalhesAnime(${a.mal_id})">
            <img src="${a.images.jpg.image_url}">
            <div>
                <strong>${a.title}</strong>
                <small>${await traduzir(a.status)}</small>
            </div>
        </div>
    `));

    list.innerHTML = html.join('');
}

/* ────────────────────────────────────────────── */
/* 8. PLAYER (DESKTOP ≠ MOBILE) */
/* ────────────────────────────────────────────── */

function abrirPlayer(id, title, author) {
    qs('#player-title').innerText = title;
    qs('#player-author').innerText = author;

    if (APP_STATE.player) {
        APP_STATE.player.loadVideoById(id);
        return;
    }

    APP_STATE.player = new YT.Player('youtube-player', {
        videoId: id,
        playerVars: { autoplay: 1, controls: APP_STATE.isDesktop ? 1 : 0 },
        events: {
            onStateChange: e => {
                if (e.data === YT.PlayerState.ENDED) proxima();
            }
        }
    });

    if (!APP_STATE.isDesktop) abrirModalPlayer();
}

function abrirPlayerFila(i) {
    APP_STATE.filaIndex = i;
    const t = APP_STATE.fila[i];
    abrirPlayer(t.id, t.title, t.author);
}

function abrirPlayerAvulso(id, title, author) {
    APP_STATE.fila = [{ id, title, author }];
    APP_STATE.filaIndex = 0;
    abrirPlayer(id, title, author);
}

function proxima() {
    if (APP_STATE.filaIndex < APP_STATE.fila.length - 1)
        abrirPlayerFila(APP_STATE.filaIndex + 1);
}

/* ────────────────────────────────────────────── */
/* 9. DOWNLOAD */
/* ────────────────────────────────────────────── */

function baixar(formato) {
    const t = APP_STATE.fila[APP_STATE.filaIndex];
    if (!t) return;
    window.open(`${APP_STATE.API_URL}/download?id=${t.id}&type=${formato}`, '_blank');
}

/* ────────────────────────────────────────────── */
/* 10. UI HELPERS */
/* ────────────────────────────────────────────── */

function abrirModalPlayer() {
    qs('#player-modal')?.classList.remove('hidden');
}

function fecharModalPlayer() {
    qs('#player-modal')?.classList.add('hidden');
}

function renderSkeletons() {
    qs('#music-results').innerHTML =
        Array(5).fill(0).map(() => `<div class="skeleton"></div>`).join('');
}

/* ────────────────────────────────────────────── */
/* INIT */
/* ────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    setSearchType('music');
});
