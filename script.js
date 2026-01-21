/**
 * PORTAL GEEK - ULTIMATE v11.0 
 * Otimizado para Ngrok Static Domain + Bypass Security
 */

const APP_STATE = {
    player: null,
    searchType: 'anime',
    favoritos: JSON.parse(localStorage.getItem('portal_geek_favs')) || [],
    filaMusica: [],
    indiceFila: 0,
    translationCache: new Map(),
    // SEU DOMÍNIO ESTÁTICO NGROK
    API_PONTE_URL: 'https://utterly-unadept-pia.ngrok-free.dev' 
};

const CONFIG = {
    ARTISTAS_GEEK: ['Blaxck', 'Daarui', 'Enygma', 'PeJota', 'Wlo', 'AniRap', 'M4rkim', 'Chrono', '7MZ', 'Tauz'],
};

// --- 1. FUNÇÃO DE CONEXÃO COM BYPASS (CRUCIAL PARA NGROK) ---
async function fetchAPI(endpoint) {
    const response = await fetch(`${APP_STATE.API_PONTE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
            "ngrok-skip-browser-warning": "true",
            "Bypass-Tunnel-Reminder": "true",
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) throw new Error("Falha na ponte");
    return response.json();
}

// --- 2. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    renderFavoritos();
    checarStatusPonte();
    
    window.favSwiper = new Swiper('.favSwiper', {
        slidesPerView: 'auto',
        spaceBetween: 15,
        freeMode: true
    });
});

// --- 3. SISTEMA DE TOASTS ---
function showToast(msg, type = 'default') {
    const container = document.getElementById('toast-container') || criarContainerToast();
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 text-white shadow-2xl transition-all duration-500`;
    
    const icon = type === 'fav' ? 'heart' : (type === 'error' ? 'alert-circle' : 'info');
    const iconColor = type === 'fav' ? 'text-rose-500' : 'text-violet-400';
    
    toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 ${iconColor}"></i> ${msg}`;
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function criarContainerToast() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    div.className = 'fixed top-10 left-1/2 -translate-x-1/2 z-[250] flex flex-col gap-2 w-[90%] max-w-xs pointer-events-none';
    document.body.appendChild(div);
    return div;
}

// --- 4. FAVORITOS ---
function toggleFavorito(item) {
    const index = APP_STATE.favoritos.findIndex(f => f.id == item.id);
    if (index > -1) {
        APP_STATE.favoritos.splice(index, 1);
        showToast("Removido da Coleção");
    } else {
        APP_STATE.favoritos.push(item);
        showToast("Adicionado!", 'fav');
    }
    localStorage.setItem('portal_geek_favs', JSON.stringify(APP_STATE.favoritos));
    renderFavoritos();
}

function renderFavoritos() {
    const wrapper = document.getElementById('favorites-wrapper');
    if (!wrapper) return;
    if (!APP_STATE.favoritos.length) {
        wrapper.innerHTML = `<div class="swiper-slide !w-40"><div class="aspect-[3/4.5] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] text-white/10 italic text-[8px] font-black uppercase">Vazio</div></div>`;
    } else {
        wrapper.innerHTML = APP_STATE.favoritos.map(item => `
            <div class="swiper-slide !w-32 group relative">
                <img src="${item.img}" class="w-full aspect-[3/4.5] object-cover rounded-[2rem] border border-white/10 cursor-pointer" 
                     onclick="${item.type === 'music' ? `abrirPlayerAvulso('${item.id}', '${item.title.replace(/'/g, "")}', '${item.author}')` : `verDetalhesAnime(${item.id})`}">
            </div>`).reverse().join('');
    }
    lucide.createIcons();
}

// --- 5. BUSCA (ATUALIZADA) ---
async function realizarBusca() {
    const input = document.getElementById('search-input');
    const q = input.value.trim();
    if (!q) return;

    renderSkeletons();
    const list = document.getElementById('music-results');
    list.classList.remove('hidden');

    if (APP_STATE.searchType === 'music') {
        try {
            const tracks = await fetchAPI(`/search?q=${encodeURIComponent(q + ' rap geek')}`);
            renderizarMusicas(tracks);
        } catch (e) { 
            list.innerHTML = `<p class="p-8 text-center text-rose-500 font-black uppercase text-[10px]">API Offline</p>`;
        }
    } else {
        buscarAnime(q);
    }
}

async function buscarAnime(query) {
    const list = document.getElementById('music-results');
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=15`);
        const { data } = await res.json();
        list.innerHTML = data.map(a => `
            <div class="group flex items-center gap-4 p-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem]">
                <img src="${a.images.jpg.image_url}" onclick='verDetalhesAnime(${a.mal_id})' class="w-14 h-14 object-cover rounded-2xl cursor-pointer">
                <div class="flex-1 overflow-hidden" onclick='verDetalhesAnime(${a.mal_id})'>
                    <h4 class="text-[11px] font-black text-white truncate uppercase mb-1">${a.title}</h4>
                    <p class="text-[9px] text-fuchsia-400 font-black uppercase italic tracking-widest">★ ${a.score || 'N/A'}</p>
                </div>
            </div>`).join('');
        lucide.createIcons();
    } catch (e) { showToast("Erro Anime", "error"); }
}

// --- 6. MÚSICA & PLAYER ---
function renderizarMusicas(tracks) {
    APP_STATE.filaMusica = tracks;
    const list = document.getElementById('music-results');
    list.innerHTML = tracks.map((t, index) => `
        <div class="group flex items-center gap-4 p-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem]">
            <div class="relative w-14 h-14 shrink-0 cursor-pointer" onclick="abrirPlayerDaFila(${index})">
                <img src="${t.thumb}" class="w-full h-full object-cover rounded-2xl">
                <i data-lucide="play" class="absolute inset-0 m-auto w-5 h-5 text-white"></i>
            </div>
            <div class="flex-1 overflow-hidden" onclick="abrirPlayerDaFila(${index})">
                <h4 class="text-[11px] font-black text-white truncate uppercase mb-1">${t.title}</h4>
                <p class="text-[9px] text-violet-400 font-bold uppercase italic">${t.author}</p>
            </div>
        </div>`).join('');
    lucide.createIcons();
}

function abrirPlayer(id, title, author) {
    document.getElementById('player-modal').classList.remove('translate-y-full');
    document.getElementById('player-big-title').innerText = title;
    document.getElementById('player-author').innerText = author;

    if(APP_STATE.player && typeof APP_STATE.player.loadVideoById === 'function') {
        APP_STATE.player.loadVideoById(id);
    } else {
        APP_STATE.player = new YT.Player('youtube-player', {
            height: '100%', width: '100%', videoId: id,
            playerVars: { 'autoplay': 1, 'controls': 0, 'modestbranding': 1 },
            events: { 'onStateChange': (e) => { if(e.data === YT.PlayerState.ENDED) playProxima(); } }
        });
    }
}

function abrirPlayerDaFila(index) {
    APP_STATE.indiceFila = index;
    const t = APP_STATE.filaMusica[index];
    abrirPlayer(t.id, t.title, t.author);
}

function abrirPlayerAvulso(id, title, author) {
    APP_STATE.filaMusica = [{id, title, author}];
    APP_STATE.indiceFila = 0;
    abrirPlayer(id, title, author);
}

// --- 7. DOWNLOAD (SISTEMA DE ANCORA) ---
async function baixarMidia(formato) {
    const musicaAtual = APP_STATE.filaMusica[APP_STATE.indiceFila];
    if (!musicaAtual) return showToast("Selecione uma música", "error");

    showToast(`Baixando via Ngrok...`, 'info');
    const downloadUrl = `${APP_STATE.API_PONTE_URL}/download?id=${musicaAtual.id}&type=${formato}&ngrok-skip-browser-warning=1`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- AUXILIARES ---
async function checarStatusPonte() {
    try {
        const data = await fetchAPI('/status');
        const statusIcon = document.getElementById('bridge-status');
        if (data.online && statusIcon) statusIcon.classList.remove('opacity-30');
    } catch (e) { console.warn("Ponte desconectada."); }
}

function fecharPlayer() { 
    document.getElementById('player-modal').classList.add('translate-y-full');
    if(APP_STATE.player) APP_STATE.player.pauseVideo();
}

function setSearchType(type) {
    APP_STATE.searchType = type;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'bg-violet-600', 'text-white'));
    document.getElementById(`type-${type}`).classList.add('active', 'bg-violet-600', 'text-white');
}

function renderSkeletons() {
    document.getElementById('music-results').innerHTML = Array(4).fill(0).map(() => `<div class="h-20 bg-white/5 rounded-[1.5rem] animate-pulse"></div>`).join('');
}
