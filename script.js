/**
 * PORTAL GEEK - ULTIMATE ENGINE v13.0
 * Dual Database: Favoritos separados por categoria (Música/Anime)
 */

const APP_STATE = {
    player: null,
    searchType: 'music', // 'music' ou 'anime'
    // Separação dos bancos de dados locais
    favoritosMusica: JSON.parse(localStorage.getItem('pg_favs_music')) || [],
    favoritosAnime: JSON.parse(localStorage.getItem('pg_favs_anime')) || [],
    
    filaMusica: [],
    indiceFila: 0,
    translationCache: new Map(),
    // [IMPORTANTE] Atualize sua URL do Tunnelmole aqui:
    API_URL: 'https://nzujpy-ip-31-57-60-2.tunnelmole.net', 
    isSearching: false
};

// --- 1. CORE API & TRADUÇÃO ---

async function apiCall(endpoint) {
    if (!APP_STATE.API_URL || APP_STATE.API_URL.includes('sua-url')) return null;
    try {
        const response = await fetch(`${APP_STATE.API_URL}${endpoint}`);
        return response.ok ? await response.json() : null;
    } catch (e) { return null; }
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

// --- 2. GERENCIAMENTO DE ABAS E FAVORITOS (O QUE MUDOU) ---

function setSearchType(type) {
    APP_STATE.searchType = type;
    
    // Atualiza visual dos botões
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'bg-violet-600', 'text-white'));
    document.getElementById(`type-${type}`).classList.add('active', 'bg-violet-600', 'text-white');
    
    // Atualiza Placeholder
    const input = document.getElementById('search-input');
    input.placeholder = type === 'music' ? "Buscar Artista/Música..." : "Buscar Anime...";

    // [CRUCIAL] Recarrega os favoritos baseados na aba escolhida
    renderFavoritos();
}

function renderFavoritos() {
    const wrapper = document.getElementById('favorites-wrapper');
    const contador = document.getElementById('fav-count'); // Se tiver contador no HTML
    if (!wrapper) return;

    // Decide qual lista usar baseada na aba ativa
    const isMusic = APP_STATE.searchType === 'music';
    const listaAtual = isMusic ? APP_STATE.favoritosMusica : APP_STATE.favoritosAnime;

    // Atualiza contador se existir
    if (contador) contador.innerText = listaAtual.length;

    if (listaAtual.length === 0) {
        wrapper.innerHTML = '<p class="text-[9px] text-white/10 uppercase font-black p-4 italic">Coleção Vazia</p>';
        return;
    }

    // Renderiza cards (Diferentes ações de clique para Música vs Anime)
    wrapper.innerHTML = listaAtual.map(f => `
        <div class="swiper-slide !w-32 group relative cursor-pointer active:scale-95 transition-transform" 
             onclick="${isMusic ? `abrirPlayerAvulso('${f.id}', '${f.title}', '${f.author}')` : `verDetalhesAnime(${f.id})`}">
            
            <img src="${f.thumb}" class="w-full aspect-[3/4.5] object-cover rounded-[2rem] border border-white/10 shadow-lg">
            
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent rounded-[2rem] flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="text-[8px] font-black text-white truncate w-full">${f.title}</p>
                ${!isMusic ? `<p class="text-[7px] text-fuchsia-400 font-bold">★ ${f.score}</p>` : ''}
            </div>

            <button onclick="event.stopPropagation(); toggleFavorito({id:'${f.id}', type:'${APP_STATE.searchType}'})" 
                    class="absolute top-2 right-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full text-rose-500 hover:bg-rose-500 hover:text-white transition-colors">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        </div>
    `).reverse().join('');

    lucide.createIcons();
    if (window.favSwiper) window.favSwiper.update();
}

function toggleFavorito(item) {
    // Detecta o tipo (vem do item ou do estado atual)
    const type = item.type || APP_STATE.searchType;
    const lista = type === 'music' ? APP_STATE.favoritosMusica : APP_STATE.favoritosAnime;
    const storageKey = type === 'music' ? 'pg_favs_music' : 'pg_favs_anime';

    const idx = lista.findIndex(f => f.id == item.id);
    
    if (idx > -1) {
        lista.splice(idx, 1);
        showToast("Removido da coleção", "default");
    } else {
        // Adiciona campos específicos
        lista.push(item);
        showToast("Salvo na coleção!", "fav");
    }

    // Salva no LocalStorage correto
    localStorage.setItem(storageKey, JSON.stringify(lista));
    
    // Atualiza a tela apenas se estivermos na aba correspondente
    if (APP_STATE.searchType === type) {
        renderFavoritos();
    }
}

// --- 3. BUSCA E RENDERIZAÇÃO (Adicionado botão de fav nos Animes) ---

async function realizarBusca() {
    const q = document.getElementById('search-input').value.trim();
    if (!q || APP_STATE.isSearching) return;

    APP_STATE.isSearching = true;
    renderSkeletons();

    try {
        if (APP_STATE.searchType === 'music') {
            const tracks = await apiCall(`/search?q=${encodeURIComponent(q)}`);
            if (tracks) renderizarMusicas(tracks);
            else throw new Error("API Off");
        } else {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=12`);
            const { data } = await res.json();
            await renderizarAnimes(data);
        }
    } catch (e) {
        showToast("Erro na busca", "error");
        document.getElementById('music-results').innerHTML = `<p class="text-center text-white/30 text-[10px] uppercase font-black p-8">Sem resultados</p>`;
    } finally {
        APP_STATE.isSearching = false;
    }
}

function renderizarMusicas(tracks) {
    APP_STATE.filaMusica = tracks;
    const list = document.getElementById('music-results');
    list.classList.remove('hidden');
    
    list.innerHTML = tracks.map((t, i) => {
        // Verifica se já é favorito para pintar o coração
        const isFav = APP_STATE.favoritosMusica.some(f => f.id == t.id);
        const iconClass = isFav ? "text-rose-500 fill-rose-500" : "text-white/20";

        return `
        <div class="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-[1.8rem] active:scale-95 transition-all" onclick="abrirPlayerDaFila(${i})">
            <img src="${t.thumb}" class="w-14 h-14 object-cover rounded-2xl shadow-lg">
            <div class="flex-1 min-w-0">
                <h4 class="text-[11px] font-black text-white truncate uppercase">${t.title}</h4>
                <p class="text-[9px] text-violet-400 font-bold uppercase italic">${t.author}</p>
            </div>
            <button onclick="event.stopPropagation(); toggleFavorito({id:'${t.id}', title:'${t.title.replace(/'/g, "")}', author:'${t.author}', thumb:'${t.thumb}', type:'music'})" class="p-2 active:scale-75 transition-transform">
                <i data-lucide="heart" class="w-4 h-4 ${iconClass}"></i>
            </button>
        </div>`;
    }).join('');
    lucide.createIcons();
}

async function renderizarAnimes(data) {
    const list = document.getElementById('music-results');
    list.classList.remove('hidden');
    
    const animesHTML = await Promise.all(data.map(async (a) => {
        const statusPT = await traduzirTexto(a.status);
        
        // Verifica Fav
        const isFav = APP_STATE.favoritosAnime.some(f => f.id == a.mal_id);
        const iconClass = isFav ? "text-rose-500 fill-rose-500" : "text-white/20";

        return `
            <div class="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-[1.8rem] active:scale-95 transition-all" onclick="verDetalhesAnime(${a.mal_id})">
                <img src="${a.images.jpg.image_url}" class="w-14 h-14 object-cover rounded-2xl shadow-lg">
                <div class="flex-1 min-w-0">
                    <h4 class="text-[11px] font-black text-white truncate uppercase">${a.title}</h4>
                    <div class="flex gap-2 mt-1">
                        <span class="text-[8px] bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded-full font-black uppercase">★ ${a.score || 'N/A'}</span>
                        <span class="text-[8px] text-white/30 font-bold uppercase py-0.5">• ${statusPT}</span>
                    </div>
                </div>
                <button onclick="event.stopPropagation(); toggleFavorito({id:'${a.mal_id}', title:'${a.title.replace(/'/g, "")}', score:'${a.score}', thumb:'${a.images.jpg.image_url}', type:'anime'})" class="p-2 active:scale-75 transition-transform">
                    <i data-lucide="heart" class="w-4 h-4 ${iconClass}"></i>
                </button>
            </div>`;
    }));
    
    list.innerHTML = animesHTML.join('');
    lucide.createIcons();
}

// --- 4. SORTEIOS & UI ---

async function sortearMoodGeek() {
    const artistasGeek = ['Daarui', 'Enygma', 'Wlo', 'PeJota', 'Mhrap', 'M4rkim', 'Blaxck', 'AniRap', '7Minutoz', 'Tauz', 'Basara', 'TK Raps', 'Rodrigo Zin'];
    const sorteado = artistasGeek[Math.floor(Math.random() * artistasGeek.length)];
    document.getElementById('search-input').value = sorteado;
    setSearchType('music'); // Isso já vai carregar os favoritos de música
    showToast(`Mood: ${sorteado}`, "default");
    realizarBusca();
}

async function sortearAnimeAleatorio() {
    setSearchType('anime'); // Troca a aba para anime e carrega favs de anime
    showToast("Sorteando Anime...", "default");
    renderSkeletons();
    try {
        const randomPage = Math.floor(Math.random() * 5) + 1;
        const res = await fetch(`https://api.jikan.moe/v4/top/anime?page=${randomPage}`);
        const { data } = await res.json();
        const shuffle = data.sort(() => 0.5 - Math.random()).slice(0, 12);
        await renderizarAnimes(shuffle);
    } catch (e) { showToast("Erro ao sortear", "error"); }
}

// --- 5. PLAYER & DETALHES ---

function abrirPlayer(id, title, author) {
    document.getElementById('player-modal').classList.remove('translate-y-full');
    document.getElementById('player-big-title').innerText = title;
    document.getElementById('player-author').innerText = author;

    if (APP_STATE.player && typeof APP_STATE.player.loadVideoById === 'function') {
        APP_STATE.player.loadVideoById(id);
    } else {
        APP_STATE.player = new YT.Player('youtube-player', {
            videoId: id,
            playerVars: { 'autoplay': 1, 'controls': 0, 'modestbranding': 1, 'rel': 0 },
            events: { 'onStateChange': (e) => { if (e.data === YT.PlayerState.ENDED) playProxima(); } }
        });
    }
}

async function verDetalhesAnime(id) {
    showToast("Traduzindo informações...", "default");
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
        const { data } = await res.json();
        const sinopsePT = data.synopsis ? await traduzirTexto(data.synopsis) : "Sem sinopse disponível.";
        const statusPT = await traduzirTexto(data.status);

        // Prepara botão de fav dentro do modal também
        const isFav = APP_STATE.favoritosAnime.some(f => f.id == data.mal_id);
        const btnTexto = isFav ? "Remover dos Favoritos" : "Adicionar aos Favoritos";
        const btnCor = isFav ? "bg-rose-500/20 text-rose-500" : "bg-white/10 text-white";

        const content = document.getElementById('anime-details-content');
        content.innerHTML = `
            <div class="relative w-full h-64 rounded-[2.5rem] overflow-hidden mb-6 shadow-2xl">
                <img src="${data.images.jpg.large_image_url}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] to-transparent"></div>
                <div class="absolute bottom-4 left-4 right-4">
                    <h2 class="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">${data.title}</h2>
                    <div class="flex flex-wrap gap-2">
                        <span class="bg-violet-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">Rank #${data.rank || 'N/A'}</span>
                        <span class="bg-white/10 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">${statusPT}</span>
                    </div>
                </div>
            </div>
            
            <button onclick="toggleFavorito({id:'${data.mal_id}', title:'${data.title.replace(/'/g, "")}', score:'${data.score}', thumb:'${data.images.jpg.image_url}', type:'anime'}); fecharAnimeModal();" 
                    class="w-full py-4 mb-6 rounded-2xl font-black uppercase tracking-widest text-[10px] ${btnCor} border border-white/5 active:scale-95 transition-all">
                ${btnTexto}
            </button>

            <div class="p-5 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                <h3 class="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mb-3">Sinopse</h3>
                <p class="text-[13px] leading-relaxed text-slate-300 font-medium text-justify">${sinopsePT}</p>
            </div>
        `;
        document.getElementById('anime-modal').classList.remove('translate-y-full');
    } catch (e) { showToast("Erro ao carregar", "error"); }
}

// --- 6. UTILS (Player Queue, Download, UI) ---

function baixarMidia(formato) {
    const musica = APP_STATE.filaMusica[APP_STATE.indiceFila];
    if (!musica) return showToast("Dê play em uma música", "error");
    showToast(`Baixando ${formato.toUpperCase()}...`, "default");
    window.open(`${APP_STATE.API_URL}/download?id=${musica.id}&type=${formato}`, '_blank');
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

function playProxima() { if (APP_STATE.indiceFila < APP_STATE.filaMusica.length - 1) abrirPlayerDaFila(APP_STATE.indiceFila + 1); }
function playAnterior() { if (APP_STATE.indiceFila > 0) abrirPlayerDaFila(APP_STATE.indiceFila - 1); }
function fecharPlayer() { document.getElementById('player-modal').classList.add('translate-y-full'); if(APP_STATE.player) APP_STATE.player.pauseVideo(); }
function fecharAnimeModal() { document.getElementById('anime-modal').classList.add('translate-y-full'); }

function renderSkeletons() {
    const list = document.getElementById('music-results');
    list.classList.remove('hidden');
    list.innerHTML = Array(5).fill(0).map(() => `<div class="h-20 bg-white/5 rounded-[1.8rem] animate-pulse mb-3 flex items-center px-4 gap-4">
        <div class="w-12 h-12 bg-white/5 rounded-xl"></div>
        <div class="flex-1 space-y-2"><div class="w-2/3 h-2 bg-white/5 rounded"></div><div class="w-1/3 h-2 bg-white/5 rounded"></div></div>
    </div>`).join('');
}

function showToast(msg, type = 'default') {
    const container = document.getElementById('toast-container') || (() => {
        const div = document.createElement('div'); div.id = 'toast-container';
        div.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-[85%] max-w-xs pointer-events-none';
        document.body.appendChild(div); return div;
    })();
    const toast = document.createElement('div');
    const colors = { fav: 'text-rose-500', error: 'text-amber-500', success: 'text-emerald-500', default: 'text-violet-400' };
    const icons = { fav: 'heart', error: 'alert-circle', success: 'check-circle', default: 'zap' };
    toast.className = `p-4 rounded-3xl bg-black/90 backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center gap-3 transition-all duration-500 transform translate-y-[-15px] opacity-0`;
    toast.innerHTML = `<i data-lucide="${icons[type]||icons.default}" class="w-4 h-4 ${colors[type]||colors.default}"></i> <span class="text-[10px] font-black uppercase text-white tracking-wide">${msg}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setSearchType('music'); // Começa em música e carrega os favoritos de música
    
    // Verifica status da API
    fetch(`${APP_STATE.API_URL}/search?q=test`)
        .then(r => { if(r.ok) document.getElementById('bridge-status-dot')?.classList.replace('bg-slate-600', 'bg-emerald-500'); })
        .catch(e => console.log('Offline'));

    window.favSwiper = new Swiper('.favSwiper', { slidesPerView: 'auto', spaceBetween: 12, freeMode: { enabled: true }, mousewheel: { forceToAxis: true } });
});

