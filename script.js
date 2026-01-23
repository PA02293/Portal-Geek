/**
 * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 * ┃      PORTAL GEEK - ULTIMATE ENGINE v17.0            ┃
 * ┃    PLAYER V2 | PLAYLISTS | ANIME CORE | MOOD       ┃
 * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

const APP_STATE = {
    player: null,
    searchType: 'music',
    
    // Armazenamento Local (Substitui Banco de Dados)
    favoritos: {
        music: JSON.parse(localStorage.getItem('pg_favs_music')) || [],
        anime: JSON.parse(localStorage.getItem('pg_favs_anime')) || []
    },
    playlist: JSON.parse(localStorage.getItem('pg_playlist')) || [],
    
    fila: [],
    filaIndex: 0,
    translationCache: new Map(),

    // 🔗 LINK DO SERVER (Ajuste conforme o Tunnelmole informar na DM do Bot)
    API_URL: 'https://zgsn6d-ip-31-57-60-2.tunnelmole.net',
    isSearching: false
};

/* ────────────────────────────────────────────── */
/* 1. CORE & API */
/* ────────────────────────────────────────────── */

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

async function api(endpoint) {
    try {
        const r = await fetch(`${APP_STATE.API_URL}${endpoint}`);
        return r.ok ? await r.json() : null;
    } catch (e) {
        console.error("❌ Erro de conexão com a API.");
        return null;
    }
}

/* ────────────────────────────────────────────── */
/* 2. TRADUÇÃO & ANIME CORE */
/* ────────────────────────────────────────────── */

async function traduzir(texto) {
    if (!texto || texto === "N/A") return 'Não informado';
    if (APP_STATE.translationCache.has(texto)) return APP_STATE.translationCache.get(texto);

    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(texto)}`);
        const data = await res.json();
        const traduzido = data[0][0][0];
        APP_STATE.translationCache.set(texto, traduzido);
        return traduzido;
    } catch { return texto; }
}

async function sortearAnime() {
    qs('#music-results').innerHTML = `<div class="skeleton"></div>`;
    try {
        const res = await fetch('https://api.jikan.moe/v4/random/anime');
        const { data } = await res.json();
        renderAnimes([data]);
    } catch (e) { alert("Erro ao sortear!"); }
}

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

/* ────────────────────────────────────────────── */
/* 3. SISTEMA DE PLAYLIST & FILA */
/* ────────────────────────────────────────────── */

function adicionarAFila(id, title, author, thumb) {
    const track = { id, title, author, thumb };
    APP_STATE.playlist.push(track);
    localStorage.setItem('pg_playlist', JSON.stringify(APP_STATE.playlist));
    alert('Adicionado à sua Playlist local! 🎶');
}

function renderFavoritos() {
    const wrapper = qs('#favorites-wrapper');
    const lista = APP_STATE.searchType === 'music' ? APP_STATE.playlist : APP_STATE.favoritos.anime;
    
    if (!lista.length) {
        wrapper.innerHTML = `<p class="empty">Lista vazia</p>`;
        return;
    }

    wrapper.innerHTML = lista.map((item, i) => `
        <div class="fav-card" onclick="abrirPlayerDaPlaylist(${i})">
            <img src="${item.thumb || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`}">
            <span>${item.title}</span>
            <button onclick="event.stopPropagation(); removerDaPlaylist(${i})">✕</button>
        </div>
    `).reverse().join('');
}

function removerDaPlaylist(index) {
    APP_STATE.playlist.splice(index, 1);
    localStorage.setItem('pg_playlist', JSON.stringify(APP_STATE.playlist));
    renderFavoritos();
}

/* ────────────────────────────────────────────── */
/* 4. BUSCA & RENDERIZAÇÃO */
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
    } finally { APP_STATE.isSearching = false; }
}

function renderMusicas(tracks) {
    APP_STATE.fila = tracks;
    qs('#music-results').innerHTML = tracks.map((t, i) => `
        <div class="track-card">
            <img src="${t.thumb}" onclick="abrirPlayerFila(${i})">
            <div onclick="abrirPlayerFila(${i})">
                <strong>${t.title}</strong>
                <small>${t.author}</small>
            </div>
            <div class="track-actions">
                <button onclick="adicionarAFila('${t.id}','${t.title}','${t.author}','${t.thumb}')">➕</button>
                <button onclick="abrirPlayerFila(${i})">▶️</button>
            </div>
        </div>
    `).join('');
}

async function renderAnimes(data) {
    const list = qs('#music-results');
    const html = await Promise.all(data.map(async a => `
        <div class="anime-card" onclick="verDetalhesAnime('${a.mal_id}')">
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
/* 5. PLAYER ULTIMATE (BLOQUEADO & CONTROLES) */
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
                controls: 0, // Bloqueia controles nativos
                disablekb: 1,
                modestbranding: 1,
                iv_load_policy: 3
            },
            events: {
                onStateChange: e => { if (e.data === YT.PlayerState.ENDED) proxima(); }
            }
        });
    }
    abrirModalPlayer();
}

// Funções do Modal de Controle
function togglePlay() {
    const state = APP_STATE.player.getPlayerState();
    state === 1 ? APP_STATE.player.pauseVideo() : APP_STATE.player.playVideo();
    qs('#btn-pause').innerText = state === 1 ? '▶️' : '⏸️';
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
/* 6. DOWNLOAD FIX (V17.0 COMPATIBLE) */
/* ────────────────────────────────────────────── */

function baixar(formato) {
    const t = APP_STATE.fila[APP_STATE.filaIndex];
    if (!t) return alert("Toque algo primeiro!");

    // O Server v17.0 já trata o nome e o formato MP4 unificado
    const url = `${APP_STATE.API_URL}/download?id=${t.id}&type=${formato}`;
    window.open(url, '_blank');
}

/* ────────────────────────────────────────────── */
/* 7. DETALHES ANIME (COM SINOPSE TRADUZIDA) */
/* ────────────────────────────────────────────── */

async function verDetalhesAnime(id) {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
    const { data } = await res.json();
    
    const sinopsePt = await traduzir(data.synopsis);
    
    // Aqui você abriria seu modal de anime com:
    // Título: data.title
    // Sinopse: sinopsePt
    // Nota: data.score
    console.log("Anime:", data.title, "Sinopse:", sinopsePt);
    alert(`🎬 ${data.title}\n\n${sinopsePt.slice(0, 200)}...`);
}

function abrirModalPlayer() { qs('#player-modal')?.classList.remove('hidden'); }
function fecharModalPlayer() { 
    APP_STATE.player?.stopVideo();
    qs('#player-modal')?.classList.add('hidden'); 
}

document.addEventListener('DOMContentLoaded', () => {
    setSearchType('music');
    renderFavoritos();
});

