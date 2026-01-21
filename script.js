/**
 * PORTAL GEEK - SUPREME EDITION v9.0
 * Inclui: Histórico, Sugestões, Tags de Gênero e Tradução LibreTranslate
 */

const APP_STATE = {
    player: null,
    searchType: 'anime',
    favoritos: JSON.parse(localStorage.getItem('portal_geek_favs')) || [],
    // Ideia 1: Histórico local para sugestões
    historico: JSON.parse(localStorage.getItem('portal_geek_hist')) || [],
    animeCache: new Map(),
    API_PONTE_URL: 'https://wayne-periodic-prime-televisions.trycloudflare.com' 
};

const CONFIG = {
    ARTISTAS_GEEK: ['Blaxck', 'Daarui', 'Enygma', 'PeJota', 'Wlo', 'AniRap', 'M4rkim', 'Chrono'],
    // Ideia 7: Mapa de IDs da API Jikan
    GENERO_MAP: { 
        "Ação": 1, "Aventura": 2, "Comédia": 4, "Drama": 8, 
        "Fantasia": 10, "Sobrenatural": 37, "Terror": 14, "Sci-Fi": 24 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    renderFavoritos();
    renderSugestoes(); // Carrega as sugestões ao abrir
    checarStatusPonte();
    
    window.favSwiper = new Swiper('.favSwiper', { slidesPerView: 'auto', spaceBetween: 15 });
});

// --- IDEIA 7: BUSCA POR GÊNERO/TAG ---
async function buscarPorTag(genero) {
    const id = CONFIG.GENERO_MAP[genero];
    setSearchType('anime');
    renderSkeletons();
    
    showToast(`Filtrando: ${genero}`);
    
    try {
        // Busca animes do gênero específico ordenados por nota
        const res = await fetch(`https://api.jikan.moe/v4/anime?genres=${id}&order_by=score&sort=desc&limit=10`);
        const { data } = await res.json();
        renderizarAnimes(data);
    } catch (e) {
        showToast("Erro ao filtrar por tag", "error");
    }
}

// --- IDEIA 1: HISTÓRICO E SUGESTÕES ---
function salvarNoHistorico(item) {
    // Evita duplicados
    APP_STATE.historico = APP_STATE.historico.filter(h => h.id !== item.id);
    // Adiciona no início
    APP_STATE.historico.unshift({
        id: item.id,
        title: item.title,
        img: item.img || item.thumb,
        type: item.type || 'anime'
    });
    
    // Mantém apenas os últimos 12 itens
    if (APP_STATE.historico.length > 12) APP_STATE.historico.pop();
    
    localStorage.setItem('portal_geek_hist', JSON.stringify(APP_STATE.historico));
    renderSugestoes();
}

function renderSugestoes() {
    const wrapper = document.getElementById('sugestoes-wrapper');
    if (!wrapper) return;

    if (APP_STATE.historico.length === 0) {
        wrapper.innerHTML = `<p class="text-[8px] text-white/20 uppercase font-black w-full text-center py-4">Sem histórico recente</p>`;
        return;
    }

    wrapper.innerHTML = APP_STATE.historico.map(item => `
        <div class="flex flex-col items-center gap-2 shrink-0 w-16 group animate-fade-in" 
             onclick="${item.type === 'music' ? `abrirPlayer('${item.id}', '${item.title}', 'Recent')` : `verDetalhesAnime(${item.id})`}">
            <div class="relative w-14 h-14">
                <img src="${item.img}" class="w-full h-full object-cover rounded-full border border-white/5 group-hover:border-violet-500 transition-all">
                <div class="absolute inset-0 bg-violet-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <span class="text-[7px] font-bold text-white/40 truncate w-full text-center uppercase">${item.title}</span>
        </div>
    `).join('');
}

// --- INTEGRAÇÃO NAS BUSCAS EXISTENTES ---
function renderizarAnimes(data) {
    const list = document.getElementById('music-results');
    list.innerHTML = data.map(a => {
        const itemObj = { id: a.mal_id, title: a.title, img: a.images.jpg.image_url, type: 'anime' };
        return `
        <div class="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-violet-500/30 transition-all" data-id="${a.mal_id}">
            <img src="${a.images.jpg.image_url}" class="w-14 h-14 object-cover rounded-2xl cursor-pointer" 
                 onclick='verDetalhesAnime(${a.mal_id}); salvarNoHistorico(${JSON.stringify(itemObj)})'>
            <div class="flex-1 overflow-hidden" onclick='verDetalhesAnime(${a.mal_id}); salvarNoHistorico(${JSON.stringify(itemObj)})'>
                <h4 class="text-[11px] font-bold text-slate-100 truncate uppercase">${a.title}</h4>
                <span class="text-[8px] text-violet-400 font-black uppercase tracking-tighter">★ ${a.score || 'N/A'}</span>
            </div>
            <button onclick='toggleFavorito(${JSON.stringify(itemObj)})' class="p-3">
                <i data-lucide="heart" class="w-5 h-5 ${APP_STATE.favoritos.some(f => f.id === a.mal_id) ? 'text-rose-500 fill-rose-500' : 'text-white/10'}"></i>
            </button>
        </div>`;
    }).join('');
    lucide.createIcons();
}

// --- TRADUÇÃO LIBRETRANSLATE (CORRIGIDA) ---
async function traduzirTexto(texto) {
    if (!texto) return "Sem descrição.";
    try {
        const res = await fetch("https://libretranslate.de/translate", {
            method: "POST",
            body: JSON.stringify({
                q: texto.substring(0, 1000),
                source: "en",
                target: "pt",
                format: "text"
            }),
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        return data.translatedText || texto;
    } catch (e) {
        return texto; // Fallback para inglês se a API cair
    }
}

// (As outras funções como abrirPlayer, renderFavoritos, showToast permanecem as mesmas da v8.5)

