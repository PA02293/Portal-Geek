/**
 * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 * ┃      PORTAL GEEK - NEBULA ENGINE v19.0 (FINAL)      ┃
 * ┃   RAP GEEK MODE | DOWNLOADS | SWIPER | SMART UI     ┃
 * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

const APP_STATE = {
    // ⚙️ Core
    player: null,
    searchType: 'music',
    
    // 💾 Persistência (Salva no navegador)
    favorites: JSON.parse(localStorage.getItem('pg_favs')) || { music: [], anime: [] },
    playlist: JSON.parse(localStorage.getItem('pg_playlist')) || [],
    
    // 🎵 Estado da Fila
    fila: [],
    filaIndex: 0,
    isSearching: false,
    
    // 🛠️ Cache e Utils
    translationCache: new Map(),
    swiperInstance: null,
    searchTimeout: null, // Timer para o Debounce

    // 🔗 SEU BACKEND (Verifique se o Tunnelmole está ativo neste link)
    API_URL: 'https://j9zezo-ip-20-251-163-143.tunnelmole.net' 
};

/* ───────────────────────────────────────────────────────────── */
/* 1. SISTEMA DE NOTIFICAÇÃO & UTILS (TOAST)                     */
/* ───────────────────────────────────────────────────────────── */

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

// Sistema de Alerta Visual (Substitui o alert padrão)
function showToast(msg, type = 'info') {
    let container = qs('#toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;";
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = { success: '#10b981', error: '#ef4444', info: '#7c3aed', hype: '#d946ef' };
    
    toast.style.cssText = `
        background: rgba(7, 7, 8, 0.95); border: 1px solid rgba(255,255,255,0.1); 
        border-left: 4px solid ${colors[type] || colors.info}; color: white; 
        padding: 12px 24px; border-radius: 12px; font-size: 12px; font-weight: 700;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5); transform: translateX(100%); 
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex; align-items: center; gap: 10px; backdrop-filter: blur(10px); pointer-events: auto;
    `;
    
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.style.transform = 'translateX(0)');

    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

/* ───────────────────────────────────────────────────────────── */
/* 2. INICIALIZAÇÃO E EVENTOS                                    */
/* ───────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    initSwiper();
    setSearchType('music');
    renderFavoritos();
    lucide.createIcons();
    
    // Busca inteligente: espera você parar de digitar (Debounce)
    qs('#search-input').addEventListener('input', (e) => {
        clearTimeout(APP_STATE.searchTimeout);
        APP_STATE.searchTimeout = setTimeout(() => buscar(), 600);
    });
});

function initSwiper() {
    if (APP_STATE.swiperInstance) APP_STATE.swiperInstance.destroy();
    
    APP_STATE.swiperInstance = new Swiper('.favSwiper', {
        slidesPerView: 'auto',
        spaceBetween: 15,
        freeMode: true,
        grabCursor: true,
        navigation: { nextEl: '.swiper-button-next-fav', prevEl: '.swiper-button-prev-fav' },
    });
}

async function api(endpoint) {
    try {
        const r = await fetch(`${APP_STATE.API_URL}${endpoint}`);
        return r.ok ? await r.json() : null;
    } catch (e) {
        console.error("API Error:", e);
        return null;
    }
}

/* ───────────────────────────────────────────────────────────── */
/* 3. TRADUÇÃO GOOGLE (HACK CLIENT-SIDE)                         */
/* ───────────────────────────────────────────────────────────── */

async function traduzir(texto) {
    if (!texto || texto === "N/A") return 'Informação indisponível';
    if (APP_STATE.translationCache.has(texto)) return APP_STATE.translationCache.get(texto);

    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(texto)}`);
        const data = await res.json();
        const traduzido = data[0].map(x => x[0]).join(' ');
        APP_STATE.translationCache.set(texto, traduzido);
        return traduzido;
    } catch { return texto; }
}

/* ───────────────────────────────────────────────────────────── */
/* 4. CARROSSEL DE FAVORITOS (SWIPER UI)                         */
/* ───────────────────────────────────────────────────────────── */

function renderFavoritos() {
    const wrapper = qs('#favorites-wrapper');
    if (!wrapper) return;

    const lista = APP_STATE.searchType === 'music' ? APP_STATE.playlist : APP_STATE.favorites.anime;
    
    if (!lista.length) {
        wrapper.innerHTML = `<div class="swiper-slide text-slate-500 text-[10px] font-bold p-8 uppercase tracking-widest italic opacity-50">Sua lista está vazia</div>`;
        return;
    }

    wrapper.innerHTML = lista.map((item, i) => `
        <div class="swiper-slide fav-card group" onclick="${APP_STATE.searchType === 'music' ? `abrirPlayerDaPlaylist(${i})` : `verDetalhesAnime('${item.id}')`}">
            <div class="relative overflow-hidden rounded-2xl aspect-[3/4] border border-white/10 shadow-lg">
                <img src="${item.thumb}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <span class="text-[9px] font-black text-white truncate uppercase tracking-wider">${item.title}</span>
                </div>
                <button onclick="event.stopPropagation(); removerDaColecao(${i})" class="absolute top-2 right-2 w-7 h-7 bg-red-500/80 backdrop-blur-md rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg active:scale-90">✕</button>
            </div>
        </div>
    `).reverse().join('');

    initSwiper();
}

function removerDaColecao(index) {
    if (APP_STATE.searchType === 'music') {
        APP_STATE.playlist.splice(index, 1);
        localStorage.setItem('pg_playlist', JSON.stringify(APP_STATE.playlist));
        showToast('Música removida da playlist', 'info');
    } else {
        APP_STATE.favorites.anime.splice(index, 1);
        localStorage.setItem('pg_favs', JSON.stringify(APP_STATE.favorites));
        showToast('Anime removido dos favoritos', 'info');
    }
    renderFavoritos();
}

/* ───────────────────────────────────────────────────────────── */
/* 5. BUSCA & RENDERIZAÇÃO (ENGINE V19)                          */
/* ───────────────────────────────────────────────────────────── */

async function buscar() {
    const q = qs('#search-input').value.trim();
    if (!q) return;

    APP_STATE.isSearching = true;
    qs('#music-results').innerHTML = Array(4).fill('<div class="skeleton"></div>').join('');

    try {
        if (APP_STATE.searchType === 'music') {
            const tracks = await api(`/search?q=${encodeURIComponent(q)}`);
            if(!tracks || !tracks.length) throw new Error("Sem resultados");
            renderMusicas(tracks);
        } else {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=12&sfw`);
            const { data } = await res.json();
            if(!data || !data.length) throw new Error("Sem resultados");
            renderAnimes(data);
        }
    } catch (e) {
        qs('#music-results').innerHTML = `<div class="col-span-full text-center text-slate-500 py-10 font-bold uppercase tracking-widest text-[10px]">Nenhum resultado encontrado</div>`;
    } finally { 
        APP_STATE.isSearching = false; 
        lucide.createIcons();
    }
}

function renderMusicas(tracks) {
    APP_STATE.fila = tracks; 
    qs('#music-results').innerHTML = tracks.map((t, i) => `
        <div class="track-card flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-violet-500/40 transition-all group animate-fade-in">
            <div class="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl cursor-pointer shadow-lg" onclick="abrirPlayerFila(${i})">
                <img src="${t.thumb}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                <div class="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-transparent transition-all">
                   <i data-lucide="play-circle" class="w-8 h-8 text-white drop-shadow-xl"></i>
                </div>
            </div>
            <div class="flex-1 overflow-hidden cursor-pointer" onclick="abrirPlayerFila(${i})">
                <strong class="block text-white text-sm truncate font-bold uppercase tracking-tight italic">${t.title}</strong>
                <small class="text-violet-400 font-bold uppercase text-[10px] tracking-widest">${t.author}</small>
            </div>
            <button onclick="adicionarAFila('${t.id}','${t.title}','${t.author}','${t.thumb}')" class="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors active:scale-90">
                <i data-lucide="plus" class="w-5 h-5 text-slate-300"></i>
            </button>
        </div>
    `).join('');
}

async function renderAnimes(data) {
    const html = await Promise.all(data.map(async a => `
        <div class="anime-card flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-fuchsia-500/40 transition-all cursor-pointer" onclick="verDetalhesAnime('${a.mal_id}')">
            <img src="${a.images.jpg.image_url}" class="w-14 h-20 rounded-xl object-cover shadow-md">
            <div class="flex-1 overflow-hidden">
                <strong class="block text-white text-sm font-bold uppercase truncate italic">${a.title}</strong>
                <div class="flex gap-2 mt-2">
                     <span class="text-[9px] bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-md font-bold uppercase">${a.type || 'TV'}</span>
                     <span class="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-md font-bold uppercase">${a.year || 'Retro'}</span>
                </div>
            </div>
        </div>
    `));
    qs('#music-results').innerHTML = html.join('');
}

/* ───────────────────────────────────────────────────────────── */
/* 6. PLAYER, DOWNLOADS & CONTROLES                              */
/* ───────────────────────────────────────────────────────────── */

function abrirPlayer(id, title, author) {
    qs('#player-title').innerText = title;
    qs('#player-author').innerText = author;

    if (APP_STATE.player) {
        APP_STATE.player.loadVideoById(id);
    } else {
        APP_STATE.player = new YT.Player('youtube-player', {
            videoId: id,
            playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0 },
            events: {
                onStateChange: e => {
                    if (e.data === YT.PlayerState.ENDED) proxima();
                    updatePlayerControlsUI(e.data);
                },
                onError: () => { showToast('Vídeo indisponível. Pulando...', 'error'); proxima(); }
            }
        });
    }
    abrirModalPlayer();
}

function updatePlayerControlsUI(state) {
    const btn = qs('#btn-pause');
    if (!btn) return;
    // 1 = playing, 2 = paused
    btn.innerHTML = state === 1 
        ? '<i data-lucide="pause" class="w-8 h-8 text-white"></i>' 
        : '<i data-lucide="play" class="w-8 h-8 text-white ml-1"></i>';
    lucide.createIcons();
}

function togglePlay() {
    if(!APP_STATE.player) return;
    const state = APP_STATE.player.getPlayerState();
    state === 1 ? APP_STATE.player.pauseVideo() : APP_STATE.player.playVideo();
}

function proxima() {
    if (APP_STATE.filaIndex < APP_STATE.fila.length - 1) {
        abrirPlayerFila(APP_STATE.filaIndex + 1);
    } else {
        showToast('Fim da playlist!', 'info');
    }
}

function anterior() {
    if (APP_STATE.filaIndex > 0) abrirPlayerFila(APP_STATE.filaIndex - 1);
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

// ⬇️ SISTEMA DE DOWNLOAD (Requer Backend) ⬇️
function baixar(formato) {
    const track = APP_STATE.fila[APP_STATE.filaIndex];
    if (!track || !track.id) return showToast("Toque uma música primeiro!", "error");

    showToast(`Gerando link ${formato.toUpperCase()}...`, "success");
    const downloadUrl = `${APP_STATE.API_URL}/download?id=${track.id}&type=${formato}`;
    window.open(downloadUrl, '_blank');
}

/* ───────────────────────────────────────────────────────────── */
/* 7. MODAL DE ANIME PREMIUM                                     */
/* ───────────────────────────────────────────────────────────── */

async function verDetalhesAnime(id) {
    showToast('Carregando informações...', 'info');
    
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
        const { data } = await res.json();
        
        const sinopse = await traduzir(data.synopsis);
        const genres = data.genres ? data.genres.map(g => g.name).slice(0, 3).join(' • ') : 'Geral';

        qs('#anime-modal-title').innerText = data.title;
        qs('#anime-modal-sinopse').innerText = sinopse;
        qs('#anime-modal-score').innerText = `⭐ ${data.score || 'N/A'} • ${data.year || 'Clássico'} • ${genres}`;
        qs('#anime-modal-img').src = data.images.jpg.large_image_url;
        
        // Configura botão de Favoritar (Clona para limpar eventos antigos)
        const btnFav = qs('#anime-modal-fav-btn');
        const newBtn = btnFav.cloneNode(true);
        btnFav.parentNode.replaceChild(newBtn, btnFav);
        
        newBtn.onclick = () => {
            const item = { id: data.mal_id, title: data.title, thumb: data.images.jpg.image_url };
            toggleFavoritoAnime(item);
        };
        lucide.createIcons();

        qs('#anime-modal').classList.remove('hidden');
    } catch (e) {
        showToast('Erro ao carregar anime.', 'error');
    }
}

function toggleFavoritoAnime(item) {
    const list = APP_STATE.favorites.anime;
    const idx = list.findIndex(f => f.id == item.id);

    if (idx > -1) {
        list.splice(idx, 1);
        showToast("Anime removido da coleção", 'info');
    } else {
        list.push(item);
        showToast("Anime salvo com sucesso! ✨", 'success');
    }
    
    localStorage.setItem('pg_favs', JSON.stringify(APP_STATE.favorites));
    renderFavoritos();
}

/* ───────────────────────────────────────────────────────────── */
/* 8. RAP GEEK ROULETTE & HELPERS                                */
/* ───────────────────────────────────────────────────────────── */

function moodGeek(type) {
    // Lista de Lendas da Cena Rap Geek
    const lendas = [
        "Daarui", "Wlo", "AniRap", "Mhrap", "M4rkim", "PeJota", 
        "Blaxck", "Basara", "Enygma", "Chrono", "Rodrigo Zin", 
        "7 Minutoz", "Takeru", "Henrique Mendonça", "Ishida"
    ];

    // Sorteia e executa
    const artistaSorteado = lendas[Math.floor(Math.random() * lendas.length)];
    
    qs('#search-input').value = artistaSorteado;
    setSearchType('music');
    buscar();
    
    showToast(`Hype Mode: ${artistaSorteado} 🔥`, 'hype');
}

async function sortearAnime() {
    showToast('Buscando anime aleatório...', 'info');
    try {
        const res = await fetch('https://api.jikan.moe/v4/random/anime');
        const { data } = await res.json();
        
        qs('#search-input').value = ""; // Limpa busca
        setSearchType('anime');
        renderAnimes([data]);
    } catch(e) { showToast('Erro no sorteio', 'error'); }
}

function setSearchType(type) {
    APP_STATE.searchType = type;
    qsa('.tab-btn').forEach(b => b.classList.remove('active'));
    qs(`#type-${type}`)?.classList.add('active');
    renderFavoritos();
}

function abrirModalPlayer() { qs('#player-modal')?.classList.remove('hidden'); }
function fecharModalPlayer() { qs('#player-modal')?.classList.add('hidden'); }
function fecharAnimeModal() { qs('#anime-modal').classList.add('hidden'); }

function adicionarAFila(id, title, author, thumb) {
    const track = { id, title, author, thumb };
    if (!APP_STATE.playlist.find(t => t.id === id)) {
        APP_STATE.playlist.push(track);
        localStorage.setItem('pg_playlist', JSON.stringify(APP_STATE.playlist));
        renderFavoritos();
        showToast('Música adicionada à playlist! 💾', 'success');
    } else {
        showToast('Essa música já está salva', 'info');
    }
}

