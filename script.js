/**
 * PORTAL GEEK - ULTIMATE ENGINE v12.0
 * 1000x Otimizado: Tunnelmole + Busca de Música + Anime com Tradução
 */

const APP_STATE = {
    player: null,
    searchType: 'music',
    favoritos: JSON.parse(localStorage.getItem('portal_geek_favs')) || [],
    filaMusica: [],
    indiceFila: 0,
    translationCache: new Map(),
    // [IMPORTANTE] Substitua pela URL que seu Bot enviou no Discord:
    API_URL: 'https://hovvrb-ip-31-57-60-2.tunnelmole.net',
    isSearching: false
};

// --- 1. CORE API & TRADUÇÃO ---

async function apiCall(endpoint) {
    if (!APP_STATE.API_URL || APP_STATE.API_URL.includes('sua-url')) {
        showToast("Configure a URL da API", "error");
        throw new Error("URL não configurada");
    }
    const response = await fetch(`${APP_STATE.API_URL}${endpoint}`);
    if (!response.ok) throw new Error("Falha na API");
    return await response.json();
}

async function traduzirTexto(texto) {
    if (!texto) return '';
    if (APP_STATE.translationCache.has(texto)) return APP_STATE.translationCache.get(texto);

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(texto)}`;
        const res = await fetch(url);
        const data = await res.json();
        const traducao = data[0][0][0];
        APP_STATE.translationCache.set(texto, traducao);
        return traducao;
    } catch (e) { return texto; }
}

// --- 2. INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    renderFavoritos();
    syncBridgeStatus();
    
    window.favSwiper = new Swiper('.favSwiper', {
        slidesPerView: 'auto',
        spaceBetween: 12,
        freeMode: true
    });
});

// --- 3. UI & FEEDBACK (TOASTS) ---

function showToast(msg, type = 'default') {
    const container = document.getElementById('toast-container') || (() => {
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-[85%] max-w-xs pointer-events-none';
        document.body.appendChild(div);
        return div;
    })();

    const toast = document.createElement('div');
    toast.className = `p-4 rounded-3xl bg-black/90 backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center gap-3 transition-all duration-500 transform translate-y-[-10px] opacity-0`;
    
    const icon = type === 'fav' ? 'heart' : (type === 'error' ? 'alert-circle' : 'zap');
    const color = type === 'fav' ? 'text-rose-500' : (type === 'error' ? 'text-amber-500' : 'text-violet-400');

    toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 ${color}"></i> <span class="text-[10px] font-black uppercase text-white">${msg}</span>`;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- 4. SISTEMA DE BUSCA (MÚSICA & ANIME) ---

async function realizarBusca() {
    const q = document.getElementById('search-input').value.trim();
    if (!q || APP_STATE.isSearching) return;

    APP_STATE.isSearching = true;
    renderSkeletons();

    try {
        if (APP_STATE.searchType === 'music') {
            const tracks = await apiCall(`/search?q=${encodeURIComponent(q)}`);
            renderizarMusicas(tracks);
        } else {
            await buscarAnime(q);
        }
    } catch (e) {
        showToast("Conexão falhou", "error");
    } finally {
        APP_STATE.isSearching = false;
    }
}

async function buscarAnime(query) {
    const list = document.getElementById('music-results');
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=12`);
    const { data } = await res.json();

    const animesPT = await Promise.all(data.map(async (a) => {
        const statusPT = await traduzirTexto(a.status);
        return `
            <div class="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-[1.8rem] active:scale-95 transition-all" onclick="verDetalhesAnime(${a.mal_id})">
                <img src="${a.images.jpg.image_url}" class="w-14 h-14 object-cover rounded-2xl shadow-lg">
                <div class="flex-1 min-w-0">
                    <h4 class="text-[11px] font-black text-white truncate uppercase">${a.title}</h4>
                    <p class="text-[9px] text-fuchsia-400 font-black italic uppercase">★ ${a.score || 'N/A'} • ${statusPT}</p>
                </div>
            </div>`;
    }));
    list.innerHTML = animesPT.join('');
    lucide.createIcons();
}

function renderizarMusicas(tracks) {
    APP_STATE.filaMusica = tracks;
    const list = document.getElementById('music-results');
    list.innerHTML = tracks.map((t, i) => `
        <div class="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-[1.8rem] active:scale-95 transition-all" onclick="abrirPlayerDaFila(${i})">
            <img src="${t.thumb}" class="w-14 h-14 object-cover rounded-2xl shadow-lg">
            <div class="flex-1 min-w-0">
                <h4 class="text-[11px] font-black text-white truncate uppercase">${t.title}</h4>
                <p class="text-[9px] text-violet-400 font-bold uppercase italic">${t.author}</p>
            </div>
            <button onclick="event.stopPropagation(); toggleFavorito({id:'${t.id}', title:'${t.title.replace(/'/g, "")}', author:'${t.author}', thumb:'${t.thumb}'})" class="p-2">
                <i data-lucide="heart" class="w-4 h-4 text-white/20"></i>
            </button>
        </div>`).join('');
    lucide.createIcons();
}

// --- 5. PLAYER & DOWNLOAD ---

function abrirPlayer(id, title, author) {
    document.getElementById('player-modal').classList.remove('translate-y-full');
    document.getElementById('player-big-title').innerText = title;
    document.getElementById('player-author').innerText = author;

    if (APP_STATE.player) {
        APP_STATE.player.loadVideoById(id);
    } else {
        APP_STATE.player = new YT.Player('youtube-player', {
            videoId: id,
            playerVars: { 'autoplay': 1, 'controls': 0, 'modestbranding': 1 },
            events: { 'onStateChange': (e) => { if (e.data === YT.PlayerState.ENDED) playProxima(); } }
        });
    }
}

function baixarMidia(formato) {
    const musica = APP_STATE.filaMusica[APP_STATE.indiceFila];
    if (!musica) return showToast("Dê play primeiro", "error");
    
    const url = `${APP_STATE.API_URL}/download?id=${musica.id}&type=${formato}`;
    window.open(url, '_blank');
    showToast("Baixando...", "default");
}

// --- 6. FAVORITOS & AUXILIARES ---

function toggleFavorito(item) {
    const idx = APP_STATE.favoritos.findIndex(f => f.id == item.id);
    if (idx > -1) {
        APP_STATE.favoritos.splice(idx, 1);
        showToast("Removido");
    } else {
        APP_STATE.favoritos.push(item);
        showToast("Adicionado!", "fav");
    }
    localStorage.setItem('portal_geek_favs', JSON.stringify(APP_STATE.favoritos));
    renderFavoritos();
}

function renderFavoritos() {
    const wrapper = document.getElementById('favorites-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = APP_STATE.favoritos.length ? APP_STATE.favoritos.map(f => `
        <div class="swiper-slide !w-32" onclick="abrirPlayerAvulso('${f.id}', '${f.title}', '${f.author}')">
            <img src="${f.thumb}" class="w-full aspect-[3/4.5] object-cover rounded-[2rem] border border-white/10 shadow-xl cursor-pointer">
        </div>`).reverse().join('') : '<p class="text-[9px] text-white/5 uppercase font-black p-4">Vazio</p>';
    if (window.favSwiper) window.favSwiper.update();
}

async function verDetalhesAnime(id) {
    showToast("Traduzindo detalhes...", "default");
    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
    const { data } = await res.json();
    const sinopsePT = await traduzirTexto(data.synopsis);
    alert(`${data.title}\n\n${sinopsePT}`); // Substitua por seu modal de detalhes
}

function renderSkeletons() {
    document.getElementById('music-results').innerHTML = Array(5).fill(0).map(() => `
        <div class="h-20 bg-white/5 rounded-[1.8rem] animate-pulse mb-3"></div>`).join('');
}

async function syncBridgeStatus() {
    try {
        const data = await apiCall('/status');
        if (data.online) document.getElementById('bridge-status')?.classList.replace('opacity-30', 'text-emerald-500');
    } catch (e) {}
}

function setSearchType(type) {
    APP_STATE.searchType = type;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'bg-violet-600', 'text-white'));
    document.getElementById(`type-${type}`).classList.add('active', 'bg-violet-600', 'text-white');
}

function abrirPlayerDaFila(index) {
    APP_STATE.indiceFila = index;
    const t = APP_STATE.filaMusica[index];
    abrirPlayer(t.id, t.title, t.author);
}

function abrirPlayerAvulso(id, title, author) {
    APP_STATE.filaMusica = [{id, title, author, thumb: ''}];
    APP_STATE.indiceFila = 0;
    abrirPlayer(id, title, author);
}

function playProxima() {
    if (APP_STATE.indiceFila < APP_STATE.filaMusica.length - 1) abrirPlayerDaFila(APP_STATE.indiceFila + 1);
}

function fecharPlayer() { 
    document.getElementById('player-modal').classList.add('translate-y-full');
    if(APP_STATE.player) APP_STATE.player.pauseVideo();
}

