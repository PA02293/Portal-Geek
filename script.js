/**
 * PORTAL GEEK - SUPREME EDITION v8.5
 * Full Tech Stack: Cloudflare, LibreTranslate, YouTube Music & Jikan API
 */

const APP_STATE = {
    player: null,
    searchType: 'anime',
    favoritos: JSON.parse(localStorage.getItem('portal_geek_favs')) || [],
    historico: JSON.parse(localStorage.getItem('portal_geek_hist')) || [],
    filaMusica: [],
    indiceFila: 0,
    animeCache: new Map(),
    // ATENÇÃO: Substitua pela URL gerada no seu terminal da Elgae Host
    API_PONTE_URL: 'https://wayne-periodic-prime-televisions.trycloudflare.com' 
};

const CONFIG = {
    ARTISTAS_GEEK: ['Blaxck', 'Daarui', 'Enygma', 'PeJota', 'Wlo', 'AniRap', 'M4rkim', 'Chrono', '7MZ', 'Tauz'],
    GENERO_MAP: { "Ação": 1, "Aventura": 2, "Comédia": 4, "Drama": 8, "Fantasia": 10, "Romance": 22, "Terror": 14 }
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    renderFavoritos();
    renderSugestoes();
    checarStatusPonte();
    
    // Inicializa Swiper de Favoritos
    window.favSwiper = new Swiper('.favSwiper', {
        slidesPerView: 'auto',
        spaceBetween: 15,
        freeMode: true
    });
});

// --- SISTEMA DE TOASTS (Feedback Visual) ---
function showToast(msg, type = 'default') {
    const container = document.getElementById('toast-container') || criarContainerToast();
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-widest animate-bounce-in flex items-center gap-3 text-white shadow-2xl z-[100]`;
    
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
    div.className = 'fixed top-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-xs';
    document.body.appendChild(div);
    return div;
}

// --- MOOD GEEK & SORTEIOS ---
function sortearMoodGeek() {
    const artista = CONFIG.ARTISTAS_GEEK[Math.floor(Math.random() * CONFIG.ARTISTAS_GEEK.length)];
    const input = document.getElementById('search-input');
    input.value = artista;
    setSearchType('music');
    realizarBusca();
    showToast(`Mood: ${artista}`, 'info');
}

async function sortearAnimeAleatorio() {
    renderSkeletons();
    try {
        const res = await fetch('https://api.jikan.moe/v4/random/anime');
        const { data } = await res.json();
        verDetalhesAnime(data.mal_id);
        showToast("Anime Aleatório Sorteado!");
    } catch (e) { showToast("Erro no sorteio", "error"); }
}

// --- BUSCA E RENDERIZAÇÃO ---
async function realizarBusca() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;

    renderSkeletons();
    
    if (APP_STATE.searchType === 'music') {
        try {
            const res = await fetch(`${APP_STATE.API_PONTE_URL}/search?q=${encodeURIComponent(q + ' rap geek')}`);
            const tracks = await res.json();
            renderizarMusicas(tracks);
        } catch (e) { 
            document.getElementById('music-results').innerHTML = `<p class="p-8 text-center text-rose-500 font-black">PONTE OFFLINE</p>`;
        }
    } else {
        buscarAnime(q);
    }
}

function renderizarMusicas(tracks) {
    const list = document.getElementById('music-results');
    list.innerHTML = tracks.map(t => {
        const isFav = APP_STATE.favoritos.some(f => f.id === t.id);
        return `
        <div class="group flex items-center gap-4 p-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem] transition-all" data-id="${t.id}">
            <div class="relative w-14 h-14 shrink-0 cursor-pointer" onclick="abrirPlayer('${t.id}', '${t.title.replace(/'/g, "")}', '${t.author}')">
                <img src="${t.thumb}" class="w-full h-full object-cover rounded-2xl shadow-lg group-hover:brightness-50 transition-all">
                <i data-lucide="play" class="absolute inset-0 m-auto w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="flex-1 overflow-hidden" onclick="abrirPlayer('${t.id}', '${t.title}', '${t.author}')">
                <h4 class="text-[11px] font-black text-white truncate uppercase mb-1">${t.title}</h4>
                <p class="text-[9px] text-violet-400 font-bold uppercase tracking-widest italic">${t.author}</p>
            </div>
            <button onclick='toggleFavorito({id: "${t.id}", title: "${t.title.replace(/'/g, "")}", img: "${t.thumb}", type: "music", author: "${t.author}"})' 
                    class="p-3 transition-all active:scale-150">
                <i data-lucide="heart" class="w-5 h-5 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-white/10'}"></i>
            </button>
        </div>`;
    }).join('');
    lucide.createIcons();
}

// --- FAVORITOS & ANIMAÇÕES ---
function toggleFavorito(item) {
    const index = APP_STATE.favoritos.findIndex(f => f.id === item.id);
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
    document.getElementById('fav-count').innerText = APP_STATE.favoritos.length;
    
    if (!APP_STATE.favoritos.length) {
        wrapper.innerHTML = `<div class="swiper-slide !w-40"><div class="aspect-[3/4.5] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] text-white/10 italic text-[8px] font-black uppercase">Vazio</div></div>`;
    } else {
        wrapper.innerHTML = APP_STATE.favoritos.map(item => `
            <div class="swiper-slide !w-32 group relative" data-id="${item.id}">
                <img src="${item.img}" class="w-full aspect-[3/4.5] object-cover rounded-[2rem] border border-white/10 shadow-2xl transition-transform group-hover:scale-105 cursor-pointer" 
                     onclick="${item.type === 'music' ? `abrirPlayer('${item.id}', '${item.title}', '${item.author}')` : `verDetalhesAnime(${item.id})`}">
                <button onclick="toggleFavorito({id: '${item.id}'})" class="absolute -top-1 -right-1 bg-black/60 backdrop-blur-md text-rose-500 p-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i data-lucide="heart-off" class="w-3 h-3"></i>
                </button>
            </div>`).reverse().join('');
    }
    lucide.createIcons();
    if(window.favSwiper) window.favSwiper.update();
}

// --- TRADUÇÃO (LibreTranslate) ---
async function traduzirTexto(texto) {
    if (!texto) return "Sem descrição.";
    try {
        const res = await fetch("https://libretranslate.de/translate", {
            method: "POST",
            body: JSON.stringify({ q: texto.substring(0, 800), source: "en", target: "pt", format: "text" }),
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        return data.translatedText || texto;
    } catch (e) { return texto; }
}

// --- AUXILIARES UI ---
function renderSkeletons() {
    const list = document.getElementById('music-results');
    list.innerHTML = Array(4).fill(0).map(() => `
        <div class="flex items-center gap-4 p-4 bg-white/[0.03] rounded-[2rem] animate-pulse">
            <div class="w-14 h-14 bg-white/10 rounded-2xl"></div>
            <div class="flex-1 space-y-2"><div class="h-3 bg-white/10 rounded w-2/3"></div><div class="h-2 bg-white/5 rounded w-1/3"></div></div>
        </div>`).join('');
    list.classList.remove('hidden');
}

function setSearchType(type) {
    APP_STATE.searchType = type;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'bg-violet-600', 'text-white'));
    document.getElementById(`type-${type}`).classList.add('active', 'bg-violet-600', 'text-white');
    document.getElementById('search-input').placeholder = type === 'music' ? "Buscar Rap Geek..." : "Buscar Anime...";
}

async function checarStatusPonte() {
    try {
        const res = await fetch(`${APP_STATE.API_PONTE_URL}/status`);
        if (res.ok) document.getElementById('bridge-status').classList.remove('opacity-30');
    } catch (e) { console.warn("Ponte Offline"); }
}

// --- PLAYER & MODAIS ---
function abrirPlayer(id, title, author) {
    document.getElementById('player-modal').classList.remove('translate-y-full');
    document.getElementById('player-big-title').innerText = title;
    document.getElementById('player-author').innerText = author;

    if(APP_STATE.player?.loadVideoById) {
        APP_STATE.player.loadVideoById(id);
    } else {
        APP_STATE.player = new YT.Player('youtube-player', {
            height: '100%', width: '100%', videoId: id,
            playerVars: { 'autoplay': 1, 'modestbranding': 1, 'rel': 0 }
        });
    }
}

function fecharPlayer() {
    document.getElementById('player-modal').classList.add('translate-y-full');
    if(APP_STATE.player?.stopVideo) APP_STATE.player.stopVideo();
}

function renderSugestoes() {
    const wrapper = document.getElementById('sugestoes-wrapper');
    if (!wrapper) return;
    const items = APP_STATE.historico.length > 0 ? APP_STATE.historico : [{title: 'Portal Geek', id: 0, img: 'https://via.placeholder.com/150'}];
    wrapper.innerHTML = items.map(s => `
        <div class="flex flex-col items-center gap-2 shrink-0 w-20">
            <img src="${s.img}" class="w-14 h-14 object-cover rounded-full border border-violet-500/20">
            <span class="text-[7px] font-black uppercase text-center truncate w-full opacity-40">${s.title}</span>
        </div>`).join('');
}

