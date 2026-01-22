/**
 * PORTAL GEEK - ULTIMATE v12.0 
 * Otimizado para Tunnelmole (Zero Ads & High Performance)
 */

const APP_STATE = {
    player: null,
    searchType: 'anime',
    favoritos: JSON.parse(localStorage.getItem('portal_geek_favs')) || [],
    filaMusica: [],
    indiceFila: 0,
    translationCache: new Map(),
    // COLE AQUI A URL QUE O BOT TE ENVIOU NO DISCORD
    API_PONTE_URL: 'https://exemplo-aleatorio.tunnelmole.net' 
};

const CONFIG = {
    ARTISTAS_GEEK: ['Blaxck', 'Daarui', 'Enygma', 'PeJota', 'Wlo', 'AniRap', 'M4rkim', 'Chrono', '7MZ', 'Tauz'],
};

// --- 1. FUNÇÃO DE CONEXÃO LIMPA (TUNNELMOLE NÃO PRECISA DE BYPASS) ---
async function fetchAPI(endpoint) {
    // Tunnelmole entrega o JSON direto sem telas de aviso intermediárias
    const response = await fetch(`${APP_STATE.API_PONTE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
            // Não precisa mais de "ngrok-skip-browser-warning"
        }
    });
    
    if (!response.ok) throw new Error("API Offline ou URL expirada");
    return response.json();
}

// --- 2. INICIALIZAÇÃO (MANTIDA) ---
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

// ... [FUNÇÕES DE TOAST E FAVORITOS PERMANECEM IGUAIS] ...

// --- 5. BUSCA OTIMIZADA ---
async function realizarBusca() {
    const input = document.getElementById('search-input');
    const q = input.value.trim();
    if (!q) return;

    renderSkeletons();
    const list = document.getElementById('music-results');
    list.classList.remove('hidden');

    if (APP_STATE.searchType === 'music') {
        try {
            // O Tunnelmole suporta compressão Gzip que ativamos no server.js
            const tracks = await fetchAPI(`/search?q=${encodeURIComponent(q)}`);
            renderizarMusicas(tracks);
        } catch (e) { 
            list.innerHTML = `<div class="p-8 text-center text-rose-500 font-black uppercase text-[10px]">
                <i data-lucide="wifi-off" class="w-8 h-8 mx-auto mb-2"></i><br>
                API Desconectada ou URL Expirada
            </div>`;
            lucide.createIcons();
        }
    } else {
        buscarAnime(q);
    }
}

// --- 6. MÚSICA & PLAYER (MANTIDA) ---
// ... [CÓDIGO DE RENDERIZAÇÃO E PLAYER] ...

// --- 7. DOWNLOAD (SISTEMA DIRETO) ---
async function baixarMidia(formato) {
    const musicaAtual = APP_STATE.filaMusica[APP_STATE.indiceFila];
    if (!musicaAtual) return showToast("Selecione uma música", "error");

    showToast(`Preparando download...`, 'info');
    
    // URL limpa do Tunnelmole para download
    const downloadUrl = `${APP_STATE.API_PONTE_URL}/download?id=${musicaAtual.id}&type=${formato}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('target', '_blank');
    // Tunnelmole não bloqueia downloads diretos como o Ngrok fazia às vezes
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- AUXILIARES ---
async function checarStatusPonte() {
    try {
        const data = await fetchAPI('/status');
        const statusIcon = document.getElementById('bridge-status');
        if (data.online && statusIcon) {
            statusIcon.classList.remove('opacity-30');
            statusIcon.classList.add('text-green-500');
        }
    } catch (e) { 
        console.warn("Ponte Tunnelmole inacessível."); 
    }
}

// ... [RESTANTE DAS FUNÇÕES AUXILIARES] ...

