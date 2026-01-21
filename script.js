/**
 * PORTAL GEEK - ULTIMATE v10.0 ELGAE EDITION
 * Ajustado para comunicação direta com API Elgae Host
 */

const APP_STATE = {
    player: null,
    searchType: 'anime',
    favoritos: JSON.parse(localStorage.getItem('portal_geek_favs')) || [],
    filaMusica: [],
    indiceFila: 0,
    translationCache: new Map(),
    // URL OFICIAL DA SUA HOSPEDAGEM ELGAE
    API_PONTE_URL: 'http://elgae-sp1-b001.elgaehost.com.br:10182' 
};

const CONFIG = {
    ARTISTAS_GEEK: ['Blaxck', 'Daarui', 'Enygma', 'PeJota', 'Wlo', 'AniRap', 'M4rkim', 'Chrono', '7MZ', 'Tauz'],
};

// --- 1. INICIALIZAÇÃO ---
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

// --- 2. SISTEMA DE TOASTS ---
function showToast(msg, type = 'default') {
    const container = document.getElementById('toast-container') || criarContainerToast();
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 text-white shadow-2xl z-[200] transition-all duration-500`;
    
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

// --- 3. TRADUÇÃO HÍBRIDA ---
async function traduzirTexto(texto) {
    if (!texto || texto.length < 5) return "Sem descrição disponível.";
    if (APP_STATE.translationCache.has(texto)) return APP_STATE.translationCache.get(texto);

    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto.substring(0, 500))}&langpair=en|pt-BR`);
        const data = await res.json();
        if (data.responseData?.translatedText) {
            APP_STATE.translationCache.set(texto, data.responseData.translatedText);
            return data.responseData.translatedText;
        }
    } catch (e) { console.log("Erro tradução"); }
    return texto;
}

// --- 4. FAVORITOS ---
function toggleFavorito(item) {
    const index = APP_STATE.favoritos.findIndex(f => f.id == item.id);
    const element = document.querySelector(`[data-id="${item.id}"]`);

    if (index > -1) {
        APP_STATE.favoritos.splice(index, 1);
        showToast("Removido da Coleção");
    } else {
        APP_STATE.favoritos.push(item);
        if(element) showHeartAnimation(element);
        showToast("Adicionado à Coleção!", 'fav');
    }

    localStorage.setItem('portal_geek_favs', JSON.stringify(APP_STATE.favoritos));
    renderFavoritos();
    atualizarBotaoFavoritoModal(item.id);
}

function atualizarBotaoFavoritoModal(id) {
    const modalFavBtn = document.getElementById('modal-fav-btn');
    if (modalFavBtn) {
        const isFav = APP_STATE.favoritos.some(f => f.id == id);
        modalFavBtn.innerHTML = `<i data-lucide="heart" class="w-6 h-6 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-white'}"></i>`;
        lucide.createIcons();
    }
}

function showHeartAnimation(el) {
    const rect = el.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.style.left = `${rect.left + rect.width / 2}px`;
        heart.style.top = `${rect.top + rect.height / 2}px`;
        heart.style.setProperty('--dir', (Math.random() * 100 - 50) + 'px');
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1000);
    }
}

function renderFavoritos() {
    const wrapper = document.getElementById('favorites-wrapper');
    if (!wrapper) return;

    if (!APP_STATE.favoritos.length) {
        wrapper.innerHTML = `<div class="swiper-slide !w-40"><div class="aspect-[3/4.5] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] text-white/10 italic text-[8px] font-black uppercase">Vazio</div></div>`;
    } else {
        wrapper.innerHTML = APP_STATE.favoritos.map(item => {
            const safeTitle = item.title.replace(/'/g, "");
            return `
            <div class="swiper-slide !w-32 group relative" data-id="${item.id}">
                <img src="${item.img}" class="w-full aspect-[3/4.5] object-cover rounded-[2rem] border border-white/10 shadow-2xl transition-transform group-hover:scale-105 cursor-pointer" 
                     onclick="${item.type === 'music' ? `abrirPlayerAvulso('${item.id}', '${safeTitle}', '${item.author}')` : `verDetalhesAnime(${item.id})`}">
                <button onclick="toggleFavorito({id: '${item.id}'})" class="absolute -top-1 -right-1 bg-black/60 backdrop-blur-md text-rose-500 p-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i data-lucide="heart-off" class="w-3 h-3"></i>
                </button>
            </div>`}).reverse().join('');
    }
    lucide.createIcons();
    if(window.favSwiper) window.favSwiper.update();
}

// --- 5. BUSCA ---
async function realizarBusca() {
    const input = document.getElementById('search-input');
    const q = input.value.trim();
    if (!q) return;

    renderSkeletons();
    const list = document.getElementById('music-results');
    list.classList.remove('hidden');

    if (APP_STATE.searchType === 'music') {
        try {
            const res = await fetch(`${APP_STATE.API_PONTE_URL}/search?q=${encodeURIComponent(q + ' rap geek')}`);
            if(!res.ok) throw new Error("Servidor Offline");
            const tracks = await res.json();
            renderizarMusicas(tracks);
        } catch (e) { 
            list.innerHTML = `<p class="p-8 text-center text-rose-500 font-black uppercase text-[10px]">API Elgae Host Offline</p>`;
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
        
        list.innerHTML = data.map(a => {
            const isFav = APP_STATE.favoritos.some(f => f.id == a.mal_id);
            const safeTitle = a.title.replace(/'/g, "");
            const itemJson = JSON.stringify({id: a.mal_id, title: safeTitle, img: a.images.jpg.image_url, type: "anime"});
            return `
            <div class="group flex items-center gap-4 p-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem]" data-id="${a.mal_id}">
                <img src="${a.images.jpg.image_url}" onclick='verDetalhesAnime(${a.mal_id})' class="w-14 h-14 object-cover rounded-2xl cursor-pointer">
                <div class="flex-1 overflow-hidden" onclick='verDetalhesAnime(${a.mal_id})'>
                    <h4 class="text-[11px] font-black text-white truncate uppercase mb-1">${a.title}</h4>
                    <p class="text-[9px] text-fuchsia-400 font-black uppercase italic tracking-widest">★ ${a.score || 'N/A'}</p>
                </div>
                <button onclick='toggleFavorito(${itemJson})' class="p-3">
                    <i data-lucide="heart" class="w-5 h-5 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-white/10'}"></i>
                </button>
            </div>`;
        }).join('');
        lucide.createIcons();
    } catch (e) { showToast("Erro na busca de Anime", "error"); }
}

async function verDetalhesAnime(id) {
    const modal = document.getElementById('anime-modal');
    const content = document.getElementById('anime-details-content');
    modal.classList.remove('translate-y-full');
    content.innerHTML = `<div class="p-20 flex justify-center flex-col items-center gap-4"><div class="loader-circle"></div><p class="text-[8px] font-black uppercase text-violet-500">Sincronizando...</p></div>`;
    
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
        const { data } = await res.json();
        const sinopsePromise = traduzirTexto(data.synopsis);
        const isFav = APP_STATE.favoritos.some(f => f.id == data.mal_id);
        const safeTitle = data.title.replace(/'/g, "");
        const itemJson = JSON.stringify({id: data.mal_id, title: safeTitle, img: data.images.jpg.image_url, type: "anime"});

        content.innerHTML = `
            <div class="p-6 space-y-8">
                <div class="relative h-[45vh] rounded-[3rem] overflow-hidden border border-white/10">
                    <img src="${data.images.jpg.large_image_url}" class="w-full h-full object-cover">
                    <button id="modal-fav-btn" onclick='toggleFavorito(${itemJson})' 
                            class="absolute bottom-6 right-6 w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
                        <i data-lucide="heart" class="w-6 h-6 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-white'}"></i>
                    </button>
                </div>
                <div class="px-2 space-y-4">
                    <h2 class="text-3xl font-black italic uppercase text-white leading-none">${data.title}</h2>
                    <p id="synopsis-box" class="text-xs leading-relaxed text-slate-400 italic">Traduzindo sinopse...</p>
                </div>
            </div>`;
        lucide.createIcons();
        document.getElementById('synopsis-box').innerText = await sinopsePromise;
    } catch (e) { showToast("Erro ao carregar detalhes", "error"); }
}

// --- 6. MÚSICA & PLAYER ---
function renderizarMusicas(tracks) {
    APP_STATE.filaMusica = tracks;
    const list = document.getElementById('music-results');
    list.innerHTML = tracks.map((t, index) => {
        const isFav = APP_STATE.favoritos.some(f => f.id === t.id);
        const safeTitle = t.title.replace(/'/g, "");
        const itemJson = JSON.stringify({id: t.id, title: safeTitle, img: t.thumb, type: "music", author: t.author});
        return `
        <div class="group flex items-center gap-4 p-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem]" data-id="${t.id}">
            <div class="relative w-14 h-14 shrink-0 cursor-pointer" onclick="abrirPlayerDaFila(${index})">
                <img src="${t.thumb}" class="w-full h-full object-cover rounded-2xl">
                <i data-lucide="play" class="absolute inset-0 m-auto w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="flex-1 overflow-hidden" onclick="abrirPlayerDaFila(${index})">
                <h4 class="text-[11px] font-black text-white truncate uppercase mb-1">${t.title}</h4>
                <p class="text-[9px] text-violet-400 font-bold uppercase italic">${t.author}</p>
            </div>
            <button onclick='toggleFavorito(${itemJson})' class="p-3">
                <i data-lucide="heart" class="w-5 h-5 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-white/10'}"></i>
            </button>
        </div>`;
    }).join('');
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

function playProxima() {
    if (APP_STATE.indiceFila + 1 < APP_STATE.filaMusica.length) {
        abrirPlayerDaFila(APP_STATE.indiceFila + 1);
    } else { sortearMoodGeek(); }
}

function playAnterior() {
    if (APP_STATE.indiceFila - 1 >= 0) abrirPlayerDaFila(APP_STATE.indiceFila - 1);
}

// --- 7. SISTEMA DE DOWNLOAD ELGAE (FIX) ---
function toggleDownloadMenu() {
    const menu = document.getElementById('download-menu');
    menu.classList.toggle('hidden');
}

async function baixarMidia(formato) {
    const musicaAtual = APP_STATE.filaMusica[APP_STATE.indiceFila];
    
    if (!musicaAtual) {
        showToast("Nenhuma música ativa", "error");
        return;
    }

    showToast(`Iniciando Download via Elgae Host...`, 'info');
    toggleDownloadMenu(); 

    // URL Direta da API Elgae Host
    const downloadUrl = `${APP_STATE.API_PONTE_URL}/download?id=${musicaAtual.id}&type=${formato}`;
    
    // Método de download resiliente (âncora oculta)
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', ''); // O servidor cuida do nome do arquivo
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- AUXILIARES ---
function sortearMoodGeek() {
    const artista = CONFIG.ARTISTAS_GEEK[Math.floor(Math.random() * CONFIG.ARTISTAS_GEEK.length)];
    const input = document.getElementById('search-input');
    if(input) {
        input.value = artista;
        setSearchType('music');
        realizarBusca();
    }
}

function fecharAnimeModal() { document.getElementById('anime-modal').classList.add('translate-y-full'); }
function fecharPlayer() { 
    document.getElementById('player-modal').classList.add('translate-y-full');
    if(APP_STATE.player) APP_STATE.player.pauseVideo();
}

function setSearchType(type) {
    APP_STATE.searchType = type;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'bg-violet-600', 'text-white'));
    const btn = document.getElementById(`type-${type}`);
    if(btn) btn.classList.add('active', 'bg-violet-600', 'text-white');
}

function renderSkeletons() {
    document.getElementById('music-results').innerHTML = Array(4).fill(0).map(() => `<div class="h-20 bg-white/5 rounded-[1.5rem] animate-pulse"></div>`).join('');
}

async function checarStatusPonte() {
    try {
        const res = await fetch(`${APP_STATE.API_PONTE_URL}/status`);
        const statusIcon = document.getElementById('bridge-status');
        if (res.ok && statusIcon) statusIcon.classList.remove('opacity-30');
    } catch (e) {
        console.warn("API Elgae está offline.");
    }
}

async function sortearAnimeAleatorio() {
    try {
        const res = await fetch('https://api.jikan.moe/v4/random/anime');
        const { data } = await res.json();
        verDetalhesAnime(data.mal_id);
    } catch (e) {}
}
