/**
 * PORTAL GEEK - SUPREME EDITION v5.0
 * Integrado com Ponte Lavalink de Alta Performance
 */

const APP_STATE = {
    player: null,
    searchType: 'anime',
    favoritos: JSON.parse(localStorage.getItem('portal_geek_favs')) || [],
    animeCache: new Map(),
    // IMPORTANTE: O server.js enviará o IP correto para sua DM. Substitua abaixo.
    API_PONTE_URL: 'http://31.57.60.2:3000' 
};

const CONFIG = {
    TRANSLATIONS: {
        "Action": "Ação", "Adventure": "Aventura", "Comedy": "Comédia", "Drama": "Drama",
        "Fantasy": "Fantasia", "Horror": "Terror", "Mystery": "Mistério", "Romance": "Romance",
        "Sci-Fi": "Ficção Científica", "Slice of Life": "Cotidiano", "Supernatural": "Sobrenatural",
        "Finished Airing": "Finalizado", "Currently Airing": "Em Lançamento"
    }
};

// --- INICIALIZAÇÃO OTIMIZADA ---
const swiper = new Swiper('.favSwiper', {
    slidesPerView: 'auto',
    spaceBetween: 15,
    freeMode: true,
    grabCursor: true
});

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    renderFavoritos();
    checarStatusPonte();
});

// Helper para notificações visuais simples
const toast = (msg) => console.log(`[Portal Geek] ${msg}`);

// --- CONEXÃO COM O SERVER.JS (NOVA) ---
async function checarStatusPonte() {
    try {
        const res = await fetch(`${APP_STATE.API_PONTE_URL}/status`);
        const data = await res.json();
        if(data.online) console.log("✅ Ponte Lavalink conectada e pronta!");
    } catch (e) {
        console.warn("⚠️ Servidor Backend Offline. A busca de música não funcionará.");
    }
}

// --- BUSCA DE MÚSICA (AGORA VIA SERVER.JS / LAVALINK) ---
async function buscarMusica(query) {
    const list = document.getElementById('music-results');
    // Filtro automático para garantir Rap Geek de qualidade
    const searchQuery = encodeURIComponent(`${query} rap geek`);

    try {
        const response = await fetch(`${APP_STATE.API_PONTE_URL}/search?q=${searchQuery}`);
        const tracks = await response.json();

        if (!tracks || tracks.length === 0) {
            list.innerHTML = '<div class="p-8 text-center text-rose-500 font-bold uppercase tracking-tighter">Nenhuma música encontrada</div>';
            return;
        }

        list.innerHTML = tracks.map(t => `
            <div onclick="abrirPlayer('${t.id}', '${t.title.replace(/'/g, "")}', '${t.author}')" 
                 class="group flex items-center gap-4 p-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem] hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer">
                <div class="relative w-14 h-14 shrink-0">
                    <img src="${t.thumb}" class="w-full h-full object-cover rounded-2xl shadow-lg">
                    <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                        <i data-lucide="play" class="w-5 h-5 text-white fill-white"></i>
                    </div>
                </div>
                <div class="flex-1 overflow-hidden">
                    <h4 class="text-[11px] font-black text-white truncate uppercase leading-none mb-1">${t.title}</h4>
                    <p class="text-[9px] text-violet-400 font-bold uppercase tracking-widest italic">${t.author}</p>
                </div>
            </div>
        `).join('');
        
        lucide.createIcons();
    } catch (err) {
        list.innerHTML = '<div class="p-8 text-center text-rose-500 font-black">PONTE OFFLINE</div>';
    }
}

// --- BUSCA DE ANIME (SISTEMA DE FILAS) ---
async function realizarBusca() {
    const q = document.getElementById('search-input').value.trim();
    if (q.length < 2) return;

    const list = document.getElementById('music-results');
    list.innerHTML = `
        <div class="p-12 text-center flex flex-col items-center gap-3">
            <div class="loader-circle border-t-fuchsia-500 animate-spin"></div>
            <span class="text-[9px] font-black uppercase text-white/40 tracking-[0.3em]">Sincronizando...</span>
        </div>`;
    list.classList.remove('hidden');
    
    APP_STATE.searchType === 'music' ? buscarMusica(q) : buscarAnime(q);
}

async function buscarAnime(query) {
    const list = document.getElementById('music-results');
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=8`);
        const { data } = await res.json();
        
        list.innerHTML = data.map(a => `
            <div class="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-violet-500/30 transition-all shadow-sm">
                <img src="${a.images.jpg.image_url}" class="w-14 h-14 object-cover rounded-2xl cursor-pointer hover:brightness-110" onclick="verDetalhesAnime(${a.mal_id})">
                <div class="flex-1 overflow-hidden cursor-pointer" onclick="verDetalhesAnime(${a.mal_id})">
                    <h4 class="text-[11px] font-bold text-slate-100 truncate uppercase">${a.title}</h4>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[8px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-black uppercase">Anime</span>
                        <span class="text-[8px] text-white/30 font-bold uppercase italic">Click para detalhes</span>
                    </div>
                </div>
                <button onclick='salvarFavorito(${JSON.stringify({id: a.mal_id, title: a.title, img: a.images.jpg.image_url})})' 
                        class="p-3 text-white/10 hover:text-rose-500 transition-colors">
                    <i data-lucide="heart" class="w-5 h-5"></i>
                </button>
            </div>`).join('');
        lucide.createIcons();
    } catch (e) { console.error("Erro Jikan"); }
}

// --- DETALHES COM TRADUÇÃO INTELIGENTE ---
async function verDetalhesAnime(id) {
    const modal = document.getElementById('anime-modal');
    const content = document.getElementById('anime-details-content');
    modal.classList.remove('translate-y-full');

    if (APP_STATE.animeCache.has(id)) {
        renderModalContent(APP_STATE.animeCache.get(id));
        return;
    }

    content.innerHTML = '<div class="py-40 text-center"><div class="loader-circle mx-auto mb-4 border-t-violet-500"></div><p class="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Processando Dados</p></div>';

    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
        const { data } = await res.json();
        
        // Tradução assíncrona da sinopse
        const sinopsePT = data.synopsis ? await traduzirTexto(data.synopsis) : "Sem descrição.";
        
        const refinedData = {
            ...data,
            sinopsePT,
            generosPT: data.genres.map(g => CONFIG.TRANSLATIONS[g.name] || g.name)
        };
        
        APP_STATE.animeCache.set(id, refinedData);
        renderModalContent(refinedData);
    } catch (e) { 
        content.innerHTML = '<p class="p-20 text-center font-black text-rose-500 uppercase tracking-widest">Falha na Conexão</p>'; 
    }
}

function renderModalContent(data) {
    document.getElementById('anime-details-content').innerHTML = `
        <div class="p-8">
            <div class="relative group w-full aspect-[2/3] max-w-[240px] mx-auto">
                <div class="absolute inset-0 bg-violet-600/20 blur-3xl group-hover:bg-violet-600/40 transition-all rounded-full"></div>
                <img src="${data.images.jpg.large_image_url}" class="relative z-10 w-full h-full object-cover rounded-[2.5rem] shadow-2xl border border-white/10">
            </div>
        </div>
        <div class="px-8 pb-20 space-y-8">
            <div class="text-center space-y-3">
                <h2 class="text-3xl font-black italic uppercase text-white leading-[0.9] tracking-tighter">${data.title}</h2>
                <div class="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <span class="text-amber-400">★ ${data.score || 'N/A'}</span>
                    <span class="text-white/20">|</span>
                    <span class="text-fuchsia-400">${data.status}</span>
                </div>
            </div>
            
            <div class="flex flex-wrap justify-center gap-2">
                ${data.generosPT.map(g => `<span class="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-slate-300 uppercase italic tracking-tighter">${g}</span>`).join('')}
            </div>

            <div class="relative bg-gradient-to-b from-white/[0.05] to-transparent p-6 rounded-[2.5rem] border border-white/10 shadow-inner">
                <span class="absolute -top-3 left-8 bg-violet-600 text-white text-[8px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">Sinopse</span>
                <div class="max-h-48 overflow-y-auto pr-2 custom-scrollbar text-[13px] text-slate-300 leading-relaxed font-medium">
                    ${data.sinopsePT}
                </div>
            </div>

            <button onclick="salvarFavorito({id: ${data.mal_id}, title: '${data.title.replace(/'/g, "")}', img: '${data.images.jpg.image_url}'})" 
                    class="w-full bg-white text-black py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-[0_10px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all hover:bg-fuchsia-500 hover:text-white">
                Adicionar à Coleção
            </button>
        </div>`;
    lucide.createIcons();
}

// --- PLAYER DE ALTA FIDELIDADE ---
function abrirPlayer(id, title, author) {
    const modal = document.getElementById('player-modal');
    modal.classList.remove('translate-y-full');
    document.getElementById('player-big-title').innerText = title;
    document.getElementById('player-author').innerText = author;
    
    // Efeito de Glassmorphism no fundo do player
    modal.style.background = `linear-gradient(to bottom, rgba(15, 15, 20, 0.95), #000)`;

    if(APP_STATE.player?.loadVideoById) {
        APP_STATE.player.loadVideoById(id);
    } else {
        // Se o player ainda não existe, inicializa
        APP_STATE.player = new YT.Player('youtube-player', {
            height: '100%', width: '100%',
            videoId: id,
            playerVars: { 'autoplay': 1, 'modestbranding': 1, 'rel': 0, 'controls': 1 }
        });
    }
}

// --- AUXILIARES ---
function fecharPlayer() {
    document.getElementById('player-modal').classList.add('translate-y-full');
    if(APP_STATE.player?.stopVideo) APP_STATE.player.stopVideo();
}

function fecharAnimeModal() { 
    document.getElementById('anime-modal').classList.add('translate-y-full'); 
}

function setSearchType(type) {
    APP_STATE.searchType = type;
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-violet-600', 'text-white');
        b.classList.add('text-white/40');
    });
    const activeBtn = document.getElementById(`type-${type}`);
    activeBtn.classList.add('active', 'bg-violet-600', 'text-white');
    document.getElementById('search-input').placeholder = type === 'music' ? "Buscar Rap Geek..." : "Buscar Anime...";
}

// --- FAVORITOS (RECONSTRUÍDO) ---
function renderFavoritos() {
    const wrapper = document.getElementById('favorites-wrapper');
    const countTag = document.getElementById('fav-count');
    countTag.innerText = APP_STATE.favoritos.length;
    
    if (!APP_STATE.favoritos.length) {
        wrapper.innerHTML = `
            <div class="swiper-slide !w-40">
                <div class="aspect-[3/4.5] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] text-white/10">
                    <i data-lucide="plus-circle" class="w-8 h-8 mb-2"></i>
                    <span class="text-[8px] font-black uppercase tracking-widest text-center px-4">Sua coleção está vazia</span>
                </div>
            </div>`;
    } else {
        wrapper.innerHTML = APP_STATE.favoritos.map(item => `
            <div class="swiper-slide !w-32 group">
                <div class="relative">
                    <img src="${item.img}" class="w-full aspect-[3/4.5] object-cover rounded-[2rem] border border-white/10 shadow-2xl transition-transform group-hover:scale-105" onclick="verDetalhesAnime(${item.id})">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <button onclick="removerFavorito('${item.id}')" class="absolute -top-2 -right-2 bg-rose-500 text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg active:scale-75 transition-all">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>`).reverse().join('');
    }
    lucide.createIcons();
    swiper.update();
}

function salvarFavorito(obj) {
    if(!APP_STATE.favoritos.find(f => f.id === obj.id)) {
        APP_STATE.favoritos.push(obj);
        localStorage.setItem('portal_geek_favs', JSON.stringify(APP_STATE.favoritos));
        renderFavoritos();
        toast("Adicionado aos favoritos!");
    }
}

function removerFavorito(id) {
    APP_STATE.favoritos = APP_STATE.favoritos.filter(a => a.id != id);
    localStorage.setItem('portal_geek_favs', JSON.stringify(APP_STATE.favoritos));
    renderFavoritos();
}

async function traduzirTexto(texto) {
    if (!texto) return "Sem descrição.";
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto.substring(0, 500))}&langpair=en|pt-BR`);
        const data = await res.json();
        return data.responseData.translatedText || texto;
    } catch (e) { return texto; }
}
