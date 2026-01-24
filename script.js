/**
 * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 * ┃      PORTAL GEEK - NEBULA ENGINE v18.0             ┃
 * ┃    SWIPER UI | ANIME MODAL PRO | AUTO-PLAYER       ┃
 * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

const APP_STATE = {
    player: null,
    searchType: 'music',
    favorites: JSON.parse(localStorage.getItem('pg_favs')) || { music: [], anime: [] },
    playlist: JSON.parse(localStorage.getItem('pg_playlist')) || [],
    fila: [],
    filaIndex: 0,
    translationCache: new Map(),
    swiperInstance: null,

    // 🔗 LINK DO SERVER (Ajuste conforme o Tunnelmole informar)
    API_URL: 'https://zgsn6d-ip-31-57-60-2.tunnelmole.net',
    isSearching: false
};

/* ────────────────────────────────────────────── */
/* 1. INITIALIZATION & CORE */
/* ────────────────────────────────────────────── */

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

document.addEventListener('DOMContentLoaded', () => {
    initSwiper();
    setSearchType('music'); // Inicia em música
    renderFavoritos();
    lucide.createIcons();
});

// Inicializa o Carrossel (Swiper)
function initSwiper() {
    if (APP_STATE.swiperInstance) APP_STATE.swiperInstance.destroy();
    
    APP_STATE.swiperInstance = new Swiper('.favSwiper', {
        slidesPerView: 'auto',
        spaceBetween: 15,
        freeMode: true,
        grabCursor: true,
        navigation: {
            nextEl: '.swiper-button-next-fav',
            prevEl: '.swiper-button-prev-fav',
        },
    });
}

async function api(endpoint) {
    try {
        const r = await fetch(`${APP_STATE.API_URL}${endpoint}`);
        return r.ok ? await r.json() : null;
    } catch (e) {
        return null;
    }
}

/* ────────────────────────────────────────────── */
/* 2. TRADUÇÃO INTELIGENTE */
/* ────────────────────────────────────────────── */

async function traduzir(texto) {
    if (!texto || texto === "N/A") return 'Informação não disponível.';
    if (APP_STATE.translationCache.has(texto)) return APP_STATE.translationCache.get(texto);

    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(texto)}`);
        const data = await res.json();
        const traduzido = data[0].map(x => x[0]).join(''); // Junta parágrafos
        APP_STATE.translationCache.set(texto, traduzido);
        return traduzido;
    } catch { return texto; }
}

/* ────────────────────────────────────────────── */
/* 3. SISTEMA DE FAVORITOS & CARROSSEL */
/* ────────────────────────────────────────────── */

function renderFavoritos() {
    const wrapper = qs('#favorites-wrapper');
    if (!wrapper) return;

    // A lista mostrada no carrossel depende da aba ativa (Música ou Anime)
    const lista = APP_STATE.searchType === 'music' ? APP_STATE.playlist : APP_STATE.favorites.anime;
    
    if (lista.length === 0) {
        wrapper.innerHTML = `<div class="swiper-slide text-slate-500 text-[10px] font-bold p-10">LISTA VAZIA</div>`;
        return;
    }

    wrapper.innerHTML = lista.map((item, i) => `
        <div class="swiper-slide fav-card group" onclick="${APP_STATE.searchType === 'music' ? `abrirPlayerDaPlaylist(${i})` : `verDetalhesAnime('${item.id}')`}">
            <div class="relative overflow-hidden rounded-2xl aspect-[3/4]">
                <img src="${item.thumb}" class="w-full h-full object-cover transition-transform group-hover:scale-110">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <span class="text-[10px] font-black text-white truncate">${item.title}</span>
                </div>
                <button onclick="event.stopPropagation(); removerDaColecao(${i})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500">✕</button>
            </div>
        </div>
    `).reverse().join('');

    initSwiper(); // Re-inicia para calcular os novos slides
}

function removerDaColecao(index) {
    if (APP_STATE.searchType === 'music') {
        APP_STATE.playlist.splice(index, 1);
        localStorage.setItem('pg_playlist', JSON.stringify(APP_STATE.playlist));
    } else {
        APP_STATE.favorites.anime.splice(index, 1);
        localStorage.setItem('pg_favs', JSON.stringify(APP_STATE.favorites));
    }
    renderFavoritos();
}

/* ────────────────────────────────────────────── */
/* 4. BUSCA & ENGINE DE RENDERIZAÇÃO */
/* ────────────────────────────────────────────── */

async function buscar() {
    const q = qs('#search-input').value.trim();
    if (!q || APP_STATE.isSearching) return;

    APP_STATE.isSearching = true;
    qs('#music-results').innerHTML = Array(4).fill('<div class="skeleton"></div>').join('');

    try {
        if (APP_STATE.searchType === 'music') {
            const tracks = await api(`/search?q=${encodeURIComponent(q)}`);
            renderMusicas(tracks || []);
        } else {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=12`);
            const { data } = await res.json();
            renderAnimes(data || []);
        }
    } finally { 
        APP_STATE.isSearching = false; 
        lucide.createIcons();
    }
}

function renderMusicas(tracks) {
    APP_STATE.fila = tracks;
    qs('#music-results').innerHTML = tracks.map((t, i) => `
        <div class="track-card flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/5 hover:border-violet-500/50 transition-all group">
            <div class="relative w-14 h-14 shrink-0 overflow-hidden rounded-2xl" onclick="abrirPlayerFila(${i})">
                <img src="${t.thumb}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i data-lucide="play" class="w-6 h-6 text-white fill-current"></i>
                </div>
            </div>
            <div class="flex-1 overflow-hidden" onclick="abrirPlayerFila(${i})">
                <strong class="block text-white text-sm truncate italic uppercase font-black">${t.title}</strong>
                <small class="text-violet-400 font-bold uppercase text-[9px] tracking-widest">${t.author}</small>
            </div>
            <div class="flex gap-2">
                <button onclick="adicionarAFila('${t.id}','${t.title}','${t.author}','${t.thumb}')" class="p-3 bg-white/5 rounded-2xl hover:bg-fuchsia-600 transition-colors">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function renderAnimes(data) {
    const html = await Promise.all(data.map(async a => `
        <div class="anime-card flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/5 hover:border-fuchsia-500/50 transition-all cursor-pointer" onclick="verDetalhesAnime('${a.mal_id}')">
            <img src="${a.images.jpg.image_url}" class="w-14 h-20 rounded-2xl object-cover">
            <div class="flex-1">
                <strong class="block text-white text-sm italic font-black uppercase">${a.title}</strong>
                <small class="text-fuchsia-400 font-bold uppercase text-[9px] tracking-widest italic">${await traduzir(a.status)}</small>
            </div>
        </div>
    `));
    qs('#music-results').innerHTML = html.join('');
}

/* ────────────────────────────────────────────── */
/* 5. PLAYER NEBULA (CONTROLES AVANÇADOS) */
/* ────────────────────────────────────────────── */

function abrirPlayer(id, title, author) {
    qs('#player-title').innerText = title;
    qs('#player-author').innerText = author;

    if (APP_STATE.player) {
        APP_STATE.player.loadVideoById(id);
    } else {
        APP_STATE.player = new YT.Player('youtube-player', {
            videoId: id,
            playerVars: { 
                autoplay: 1, 
                controls: 0, 
                disablekb: 1,
                modestbranding: 1,
                rel: 0
            },
            events: {
                onStateChange: e => {
                    if (e.data === YT.PlayerState.ENDED) proxima();
                    updatePlayerControlsUI(e.data);
                }
            }
        });
    }
    abrirModalPlayer();
}

function updatePlayerControlsUI(state) {
    const btn = qs('#btn-pause');
    if (!btn) return;
    // 1 = playing, 2 = paused
    btn.innerHTML = state === 1 ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
    lucide.createIcons();
}

function togglePlay() {
    const state = APP_STATE.player.getPlayerState();
    if (state === 1) APP_STATE.player.pauseVideo();
    else APP_STATE.player.playVideo();
}

function proxima() {
    if (APP_STATE.filaIndex < APP_STATE.fila.length - 1) {
        abrirPlayerFila(APP_STATE.filaIndex + 1);
    }
}

function anterior() {
    if (APP_STATE.filaIndex > 0) {
        abrirPlayerFila(APP_STATE.filaIndex - 1);
    }
}

function abrirPlayerFila(i) {
    APP_STATE.filaIndex = i;
    const t = APP_STATE.fila[i];
    if (t) abrirPlayer(t.id, t.title, t.author);
}

function abrirPlayerDaPlaylist(i) {
    APP_STATE.fila = APP_STATE.playlist;
    abrirPlayerFila(i);
}

/* ────────────────────────────────────────────── */
/* 6. MODAL DE ANIME (EXPERIÊNCIA COMPLETA) */
/* ────────────────────────────────────────────── */

async function verDetalhesAnime(id) {
    // Abrir modal de loading ou mostrar esqueleto
    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
    const { data } = await res.json();
    
    const sinopseTratada = await traduzir(data.synopsis);
    
    // Atualiza elementos do modal de anime (Crie estes IDs no seu HTML)
    qs('#anime-modal-title').innerText = data.title;
    qs('#anime-modal-sinopse').innerText = sinopseTratada;
    qs('#anime-modal-score').innerText = `⭐ ${data.score || 'N/A'}`;
    qs('#anime-modal-img').src = data.images.jpg.large_image_url;
    
    // Botão de Favoritar dentro do Modal
    qs('#anime-modal-fav-btn').onclick = () => {
        const item = { id: data.mal_id, title: data.title, thumb: data.images.jpg.image_url };
        toggleFavoritoAnime(item);
    };

    qs('#anime-modal').classList.remove('hidden');
}

function toggleFavoritoAnime(item) {
    const list = APP_STATE.favorites.anime;
    const idx = list.findIndex(f => f.id == item.id);

    if (idx > -1) {
        list.splice(idx, 1);
        alert("Removido dos favoritos!");
    } else {
        list.push(item);
        alert("Adicionado aos favoritos! ✨");
    }
    
    localStorage.setItem('pg_favs', JSON.stringify(APP_STATE.favorites));
    renderFavoritos();
}

/* ────────────────────────────────────────────── */
/* 7. UTILS & MOOD GEEK */
/* ────────────────────────────────────────────── */

function moodGeek(mood) {
    const moods = {
        'hype': 'shounen action',
        'sad': 'drama romance',
        'chill': 'slice of life',
        'dark': 'seinen horror'
    };
    qs('#search-input').value = moods[mood] || mood;
    setSearchType('anime');
    buscar();
}

async function sortearAnime() {
    qs('#music-results').innerHTML = `<div class="skeleton"></div>`;
    const res = await fetch('https://api.jikan.moe/v4/random/anime');
    const { data } = await res.json();
    renderAnimes([data]);
}

function setSearchType(type) {
    APP_STATE.searchType = type;
    qsa('.tab-btn').forEach(b => b.classList.remove('active'));
    qs(`#type-${type}`)?.classList.add('active');
    renderFavoritos();
}

function abrirModalPlayer() { qs('#player-modal')?.classList.remove('hidden'); }
function fecharModalPlayer() { 
    APP_STATE.player?.pauseVideo(); 
    qs('#player-modal')?.classList.add('hidden'); 
}

function fecharAnimeModal() { qs('#anime-modal').classList.add('hidden'); }

function adicionarAFila(id, title, author, thumb) {
    const track = { id, title, author, thumb };
    if (!APP_STATE.playlist.find(t => t.id === id)) {
        APP_STATE.playlist.push(track);
        localStorage.setItem('pg_playlist', JSON.stringify(APP_STATE.playlist));
        renderFavoritos();
        alert('Adicionado à playlist! 🎶');
    }
}

