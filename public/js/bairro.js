// ===============================
// ESTADO GLOBAL
// ===============================

let listaAnuncios = []
let paginaAtualBairro = 1
const limitePorPagina = 10
let cidadeBannerSwiper = null

// ===============================
// UTIL
// ===============================

function criarSlug(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function formatarValor(valor) {
    const numero = Number(valor)
    if (!numero || isNaN(numero)) return "Consulte"
    return numero.toLocaleString("pt-BR")
}

function escaparHtml(texto) {
    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

function obterUrlBannerCidade(imagem) {
    if (!imagem) return ""
    if (imagem.startsWith("/")) return imagem
    return `/uploads/anuncios/${imagem}`
}

// ===============================
// DADOS DO BAIRRO (passados pelo servidor)
// ===============================

function obterDadosBairro() {
    return window.BAIRRO_DATA || { bairro: {}, cidade: {} }
}

function obterNomeBairro() {
    return obterDadosBairro().bairro.nome || ""
}

function obterNomeCidade() {
    return obterDadosBairro().cidade.nome || ""
}

function obterEstado() {
    return obterDadosBairro().cidade.estado || ""
}

function obterCidadeSlug() {
    return criarSlug(obterNomeCidade())
}

function obterUfSlug() {
    return (obterEstado() || "").toLowerCase()
}

// ===============================
// BUSCAR ANÚNCIOS FILTRADOS POR BAIRRO
// ===============================

async function carregarAnunciosDoBairro() {
    try {
        const cidadeSlug = obterCidadeSlug()
        const ufSlug = obterUfSlug()
        const bairroSlug = criarSlug(obterNomeBairro())

        const params = new URLSearchParams()
        if (cidadeSlug) params.set('cidade', cidadeSlug)
        if (ufSlug) params.set('uf', ufSlug)
        if (bairroSlug) params.set('bairro', bairroSlug)

        const resp = await fetch(`/api/veiculos?${params.toString()}`)
        if (!resp.ok) throw new Error("Erro ao buscar anúncios")

        listaAnuncios = await resp.json()

        atualizarTituloBairro()
        paginaAtualBairro = 1
        renderizarLista()
        renderizarPaginacao()

    } catch (erro) {
        console.error(erro)
        document.getElementById("container-card-primary").innerHTML =
            "<p class='text-danger text-center'>Erro ao carregar anúncios</p>"
    }
}

// ===============================
// TÍTULO DA PÁGINA
// ===============================

function atualizarTituloBairro() {
    const titulo = document.getElementById("titulo-bairro")
    if (!titulo) return

    const nomeBairro = escaparHtml(obterNomeBairro())
    const nomeCidade = escaparHtml(obterNomeCidade())
    const estado = escaparHtml(obterEstado())

    if (!listaAnuncios.length) {
        titulo.textContent = `${nomeBairro} - ${nomeCidade}, ${estado}`
        return
    }

    titulo.textContent = `Veículos em ${nomeBairro}, ${nomeCidade} - ${estado}`
}

// ===============================
// RENDERIZAÇÃO DOS CARDS
// ===============================

function renderizarLista() {
    const container = document.getElementById("container-card-primary")
    container.innerHTML = ""

    if (!listaAnuncios.length) {
        renderizarBairroSemAnuncios(container)
        return
    }

    container.classList.remove("overflow-visible")
    container.classList.add("overflow-auto")

    const inicio = (paginaAtualBairro - 1) * limitePorPagina
    const fim = inicio + limitePorPagina
    const pagina = listaAnuncios.slice(inicio, fim)

    pagina.forEach(item => {
        const wrapper = document.createElement("div")

        wrapper.innerHTML = `
            <div class="card shadow-sm vehicle-card position-relative"
                 style="width: 280px; cursor: pointer; min-width: 220px;"
                 onclick="window.location.href='/venda?id=${item.id}'">

                ${item.destaque == 1 ? `
                    <span style="
                        position:absolute;
                        top:10px;
                        left:10px;
                        background:#ffc107;
                        color:#000;
                        padding:5px 10px;
                        border-radius:6px;
                        font-size:12px;
                        font-weight:bold;
                        z-index:10;
                    ">
                        ⭐ Destaque
                    </span>
                ` : ''}

                <img
                  src="${item.imagem ? `/uploads/anuncios/${item.imagem}` : '/img/sem-foto.jpg'}"
                  class="card-img-top"
                  style="height:200px;object-fit:cover;"
                  onerror="this.src='/img/sem-foto.jpg'"
                  alt="${escaparHtml(item.marca || '')} ${escaparHtml(item.versao || '')}"
                  loading="lazy"
                >

                <div class="card-body">

                  <h5 class="fw-bold mb-1" style="font-size:0.95rem;">
                    <span style="color:#000;">${escaparHtml(item.marca || '')}</span>
                    <span style="color:#C90B0C;"> ${escaparHtml(item.versao || '')}</span>
                  </h5>

                  <p class="small text-secondary mb-1 descricao-card">
                    ${escaparHtml(item.descricao || '')}
                  </p>

                  <p class="mb-1 text-secondary small">
                    ${escaparHtml(item.motorizacao || '')} ${escaparHtml(item.combustivel || '')}
                  </p>

                  <p class="fw-bold mb-1" style="color:#C90B0C;">
                    R$ ${formatarValor(item.preco)}
                    <span class="text-dark"> | ${item.ano_modelo || ''}</span>
                  </p>

                  <p class="fw-bold d-flex align-items-center gap-2 mb-1" style="font-size:0.9rem;">
                    ${item.tipo_anunciante === "particular"
                        ? `<i class="bi bi-person-fill"></i> Particular`
                        : `<i class="bi bi-building"></i> ${escaparHtml(item.nome || "Revenda")}`
                    }
                  </p>

                  <p class="small mb-0">
                    <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
                    ${escaparHtml(item.bairro || '')}${item.bairro ? ' - ' : ''}${escaparHtml(item.cidade || '')} - ${escaparHtml(item.estado || '')}
                  </p>

                </div>
            </div>
        `

        container.appendChild(wrapper)
    })
}

function renderizarBairroSemAnuncios(container) {
    const nomeBairro = escaparHtml(obterNomeBairro())
    const nomeCidade = escaparHtml(obterNomeCidade())
    const estado = escaparHtml(obterEstado())

    container.classList.remove("overflow-auto")
    container.classList.add("overflow-visible")

    container.innerHTML = `
        <div class="cidade-empty-state">
            <div class="cidade-empty-icon">
                <i class="bi bi-car-front-fill"></i>
            </div>

            <p class="cidade-empty-title">
                Venda seu veículo em
                <strong>${nomeBairro}${nomeCidade ? `, ${nomeCidade}` : ""}${estado ? ` - ${estado}` : ""}</strong>
            </p>

            <p class="cidade-empty-promo">
                <strong>Atenção Particulares e Revendas</strong><br>
                Aproveite nossa promoção de lançamento e anuncie seu carro gratuitamente até agosto de 2026.
            </p>

            <div class="cidade-empty-actions">
                <a class="btn btn-danger" href="/anunciar">
                    Anunciar grátis
                </a>
                <a class="btn btn-outline-danger" href="/vender">
                    Ver planos
                </a>
            </div>
        </div>
    `
}

// ===============================
// PAGINAÇÃO
// ===============================

function renderizarPaginacao() {
    const totalPaginas = Math.ceil(listaAnuncios.length / limitePorPagina)
    const paginacao = document.getElementById("paginacao")

    if (!paginacao) return

    paginacao.innerHTML = ""

    if (totalPaginas <= 1) return

    paginacao.innerHTML += `
        <li class="page-item ${paginaAtualBairro === 1 ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPagina(${paginaAtualBairro - 1})">
                Anterior
            </button>
        </li>
    `

    const paginaInicio = Math.max(1, paginaAtualBairro - 2)
    const paginaFim = Math.min(totalPaginas, paginaAtualBairro + 2)

    for (let i = paginaInicio; i <= paginaFim; i++) {
        paginacao.innerHTML += `
            <li class="page-item ${i === paginaAtualBairro ? "active" : ""}">
                <button class="page-link" onclick="mudarPagina(${i})">${i}</button>
            </li>
        `
    }

    paginacao.innerHTML += `
        <li class="page-item ${paginaAtualBairro === totalPaginas ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPagina(${paginaAtualBairro + 1})">
                Próximo
            </button>
        </li>
    `
}

function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(listaAnuncios.length / limitePorPagina)

    if (pagina < 1 || pagina > totalPaginas) return

    paginaAtualBairro = pagina
    renderizarLista()
    renderizarPaginacao()

    window.scrollTo({ top: 0, behavior: "smooth" })
}

// ===============================
// BANNER DA CIDADE (reutilizado pelo bairro)
// ===============================

async function carregarBannersCidade() {
    const wrapper = document.getElementById("cidadeBannerWrapper")
    if (!wrapper) return

    try {
        const cidadeSlug = obterCidadeSlug()
        const ufSlug = obterUfSlug()

        if (!cidadeSlug || !ufSlug) {
            renderizarBannerFallback()
            return
        }

        const res = await fetch(`/api/cidades/${encodeURIComponent(cidadeSlug)}/${encodeURIComponent(ufSlug)}/banners`)

        if (!res.ok) {
            renderizarBannerFallback()
            return
        }

        const banners = await res.json()
        const imagens = banners
            .map(banner => obterUrlBannerCidade(banner.imagem))
            .filter(Boolean)

        if (!imagens.length) {
            renderizarBannerFallback()
            return
        }

        wrapper.innerHTML = imagens.map((src, index) => `
            <div class="swiper-slide">
                <img
                    src="${escaparHtml(src)}"
                    class="cidade-banner-img"
                    alt="Banner de ${escaparHtml(obterNomeCidade())}"
                    loading="${index === 0 ? "eager" : "lazy"}"
                    onerror="this.closest('.swiper-slide').remove()"
                >
            </div>
        `).join("")

        iniciarSliderCidade(imagens.length)

    } catch (erro) {
        console.error("Erro ao carregar banners:", erro)
        renderizarBannerFallback()
    }
}

function iniciarSliderCidade(totalBanners) {
    if (cidadeBannerSwiper) {
        cidadeBannerSwiper.destroy(true, true)
        cidadeBannerSwiper = null
    }

    cidadeBannerSwiper = new Swiper("#cidadeBannerSlider", {
        loop: totalBanners > 1,
        speed: 900,
        effect: "fade",
        fadeEffect: { crossFade: true },
        autoplay: totalBanners > 1 ? {
            delay: 4000,
            disableOnInteraction: false
        } : false,
        pagination: {
            el: "#cidadeBannerSlider .swiper-pagination",
            clickable: true
        },
        navigation: {
            nextEl: "#cidadeBannerSlider .swiper-button-next",
            prevEl: "#cidadeBannerSlider .swiper-button-prev"
        }
    })
}

function renderizarBannerFallback() {
    const wrapper = document.getElementById("cidadeBannerWrapper")
    if (!wrapper) return

    wrapper.innerHTML = `
        <div class="swiper-slide">
            <div class="cidade-banner-fallback"></div>
        </div>
    `

    iniciarSliderCidade(1)
}

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", async () => {
    await carregarBannersCidade()
    carregarAnunciosDoBairro()
})
