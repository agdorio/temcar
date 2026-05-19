const select = document.getElementById("select-cidades")
const inputCidade = document.getElementById("input-cidade")
const btnBuscarCidade = document.getElementById("btn-buscar-cidade")
const boxSugestoes = document.getElementById("cidade-sugestoes")

let cidadesCache = []
let bairrosCache = []

function gerarSlug(nome) {
    return (nome || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function normalizarTexto(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
}

function irParaCidade(cidade) {
    if (!cidade) return
    const slug = gerarSlug(cidade.nome)
    const uf = gerarSlug(cidade.estado)
    window.location.href = `/cidade/${slug}/${uf}`
}

function irParaBairro(bairro) {
    if (!bairro) return
    const uf = gerarSlug(bairro.cidade_estado)
    const cidadeSlug = gerarSlug(bairro.cidade_nome)
    const bairroSlug = bairro.slug || gerarSlug(bairro.nome)
    window.location.href = `/veiculos/${uf}/${cidadeSlug}/${bairroSlug}`
}

function preencherSelect(cidades) {
    select.innerHTML = `<option value="">Selecione uma cidade</option>`

    cidades.forEach(cidade => {
        const option = document.createElement("option")
        option.value = JSON.stringify({ nome: cidade.nome, estado: cidade.estado })
        option.textContent = `${cidade.nome} (${cidade.estado})`
        select.appendChild(option)
    })
}

function renderizarSugestoes(termo) {
    const busca = normalizarTexto(termo).trim()

    if (!busca) {
        boxSugestoes.style.display = "none"
        boxSugestoes.innerHTML = ""
        return
    }

    // Resultados de cidades
    const cidadesEncontradas = cidadesCache
        .filter(cidade => {
            const cidadeTexto = normalizarTexto(`${cidade.nome} ${cidade.estado}`)
            return cidadeTexto.includes(busca)
        })
        .slice(0, 6)

    // Resultados de bairros
    const bairrosEncontrados = bairrosCache
        .filter(bairro => {
            const bairroTexto = normalizarTexto(`${bairro.nome} ${bairro.cidade_nome} ${bairro.cidade_estado}`)
            return bairroTexto.includes(busca)
        })
        .slice(0, 6)

    if (!cidadesEncontradas.length && !bairrosEncontrados.length) {
        boxSugestoes.style.display = "block"
        boxSugestoes.innerHTML = `<div class="cidade-sugestao text-muted">Nenhum resultado encontrado</div>`
        return
    }

    boxSugestoes.style.display = "block"
    boxSugestoes.innerHTML = ""

    if (cidadesEncontradas.length) {
        const label = document.createElement("div")
        label.className = "cidade-sugestao-label px-3 py-1 text-muted small fw-bold"
        label.style.cssText = "background:#f8f9fa;border-bottom:1px solid #eee;pointer-events:none;"
        label.textContent = "Cidades"
        boxSugestoes.appendChild(label)

        cidadesEncontradas.forEach(cidade => {
            const button = document.createElement("button")
            button.type = "button"
            button.className = "cidade-sugestao"
            button.textContent = `${cidade.nome} (${cidade.estado})`
            button.addEventListener("click", () => irParaCidade(cidade))
            boxSugestoes.appendChild(button)
        })
    }

    if (bairrosEncontrados.length) {
        const label = document.createElement("div")
        label.className = "cidade-sugestao-label px-3 py-1 text-muted small fw-bold"
        label.style.cssText = "background:#f8f9fa;border-bottom:1px solid #eee;pointer-events:none;"
        label.textContent = "Bairros"
        boxSugestoes.appendChild(label)

        bairrosEncontrados.forEach(bairro => {
            const button = document.createElement("button")
            button.type = "button"
            button.className = "cidade-sugestao"
            button.textContent = `${bairro.nome} - ${bairro.cidade_nome}/${bairro.cidade_estado}`
            button.addEventListener("click", () => irParaBairro(bairro))
            boxSugestoes.appendChild(button)
        })
    }
}

function buscarCidadeDigitada() {
    const termo = normalizarTexto(inputCidade.value).trim()
    if (!termo) return

    // Primeiro tenta encontrar bairro
    const bairro = bairrosCache.find(b => {
        const t = normalizarTexto(`${b.nome} ${b.cidade_nome} ${b.cidade_estado}`)
        return t === termo || normalizarTexto(b.nome) === termo
    }) || bairrosCache.find(b => normalizarTexto(b.nome).includes(termo))

    if (bairro) {
        irParaBairro(bairro)
        return
    }

    // Depois tenta cidade
    const cidade = cidadesCache.find(item => {
        return normalizarTexto(`${item.nome} ${item.estado}`) === termo
            || normalizarTexto(item.nome) === termo
    }) || cidadesCache.find(item => normalizarTexto(item.nome).includes(termo))

    irParaCidade(cidade)
}

async function carregarCidades() {
    const res = await fetch("/api/cidades")
    const cidades = await res.json()

    cidadesCache = cidades.sort((a, b) => {
        return `${a.nome} ${a.estado}`.localeCompare(`${b.nome} ${b.estado}`, "pt-BR")
    })

    preencherSelect(cidadesCache)
}

async function carregarBairros() {
    try {
        const res = await fetch("/api/bairros")
        if (!res.ok) return
        bairrosCache = await res.json()
    } catch (e) {
        bairrosCache = []
    }
}

select.addEventListener("change", () => {
    if (!select.value) return

    const cidade = JSON.parse(select.value)
    irParaCidade(cidade)
})

inputCidade.addEventListener("input", () => {
    renderizarSugestoes(inputCidade.value)
})

inputCidade.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault()
        buscarCidadeDigitada()
    }
})

btnBuscarCidade.addEventListener("click", buscarCidadeDigitada)

document.addEventListener("click", (event) => {
    if (!boxSugestoes.contains(event.target) && event.target !== inputCidade) {
        boxSugestoes.style.display = "none"
    }
})

carregarCidades()
carregarBairros()
