"use strict";

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const API_URL = "https://viacep.com.br/ws/";
const HISTORY_KEY = "viacep_history";
const MAX_HISTORY = 10;
const REQUEST_TIMEOUT = 10000;


/* =========================================================
   ELEMENTOS DO DOM
========================================================= */

const cepForm = document.getElementById("cepForm");
const cepInput = document.getElementById("cep");

const consultButton = document.getElementById("consultButton");
const buttonText = document.getElementById("buttonText");
const loadingSpinner = document.getElementById("loadingSpinner");

const message = document.getElementById("message");

const resultSection = document.getElementById("resultSection");

const clearButton = document.getElementById("clearButton");

const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");
const emptyHistory = document.getElementById("emptyHistory");
const clearHistoryButton = document.getElementById("clearHistoryButton");


/* =========================================================
   ESTADO DA APLICAÇÃO
========================================================= */

let isLoading = false;
let lastConsultedCep = "";


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    renderHistory();

    cepInput.focus();

});


/* =========================================================
   MÁSCARA DO CEP
========================================================= */

cepInput.addEventListener("input", () => {

    // Remove tudo que não for número
    let value = cepInput.value.replace(/\D/g, "");

    // Limita a 8 números
    value = value.substring(0, 8);

    // Aplica a máscara 00000-000
    if (value.length > 5) {

        value =
            value.substring(0, 5) +
            "-" +
            value.substring(5);

    }

    cepInput.value = value;

});


/* =========================================================
   SUBMIT DO FORMULÁRIO
========================================================= */

cepForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    await consultarCep();

});


/* =========================================================
   CONSULTAR CEP
========================================================= */

async function consultarCep(cepInformado = null) {

    // Impede múltiplas requisições simultâneas
    if (isLoading) {
        return;
    }

    let cep = cepInformado ?? cepInput.value;

    // Mantém somente números
    cep = cep.replace(/\D/g, "");

    /* ---------------------------------------------------------
       VALIDAÇÃO
    --------------------------------------------------------- */

    if (cep.length !== 8) {

        showMessage(
            "Digite um CEP válido com 8 dígitos.",
            "error"
        );

        cepInput.focus();

        return;
    }

    // Evita consultar exatamente o mesmo CEP repetidamente
    if (cep === lastConsultedCep) {

        showMessage(
            "Este CEP já foi consultado.",
            "info"
        );

        return;
    }


    /* ---------------------------------------------------------
       PREPARAÇÃO
    --------------------------------------------------------- */

    setLoading(true);
    hideMessage();


    try {

        /*
         * AbortController permite cancelar a requisição
         * caso o ViaCEP demore mais que o limite definido.
         */
        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, REQUEST_TIMEOUT);


        const url =
            API_URL +
            encodeURIComponent(cep) +
            "/json/";


        const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            headers: {
                "Accept": "application/json"
            }
        });


        clearTimeout(timeout);


        /* -----------------------------------------------------
           ERRO HTTP
        ----------------------------------------------------- */

        if (!response.ok) {

            throw new Error(
                `Erro HTTP ${response.status}`
            );

        }


        /* -----------------------------------------------------
           JSON
        ----------------------------------------------------- */

        const data = await response.json();


        /* -----------------------------------------------------
           CEP NÃO ENCONTRADO
        ----------------------------------------------------- */

        if (data.erro === true) {

            clearResult();

            showMessage(
                "CEP não encontrado. Verifique os números digitados.",
                "error"
            );

            return;
        }


        /* -----------------------------------------------------
           EXIBIR RESULTADO
        ----------------------------------------------------- */

        displayResult(data);

        lastConsultedCep = cep;

        addToHistory(data);

        showMessage(
            "CEP consultado com sucesso.",
            "success"
        );


    } catch (error) {

        console.error("Erro na consulta:", error);


        if (error.name === "AbortError") {

            showMessage(
                "A consulta demorou muito para responder. Tente novamente.",
                "error"
            );

        } else {

            showMessage(
                "Não foi possível consultar o ViaCEP. Verifique sua conexão com a internet e tente novamente.",
                "error"
            );

        }

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   EXIBIR RESULTADO
========================================================= */

function displayResult(data) {

    resultSection.classList.remove("hidden");

    setText("resultCep", data.cep);
    setText("resultLogradouro", data.logradouro);
    setText("resultComplemento", data.complemento);
    setText("resultBairro", data.bairro);
    setText("resultLocalidade", data.localidade);
    setText("resultUf", data.uf);
    setText("resultEstado", data.estado);
    setText("resultRegiao", data.regiao);
    setText("resultIbge", data.ibge);
    setText("resultDdd", data.ddd);

}


/* =========================================================
   LIMPAR RESULTADO
========================================================= */

function clearResult() {

    resultSection.classList.add("hidden");

    const fields = [
        "resultCep",
        "resultLogradouro",
        "resultComplemento",
        "resultBairro",
        "resultLocalidade",
        "resultUf",
        "resultEstado",
        "resultRegiao",
        "resultIbge",
        "resultDdd"
    ];

    fields.forEach((field) => {
        setText(field, "-");
    });

    lastConsultedCep = "";

}


/* =========================================================
   BOTÃO LIMPAR
========================================================= */

clearButton.addEventListener("click", () => {

    cepInput.value = "";

    clearResult();

    hideMessage();

    cepInput.focus();

});


/* =========================================================
   LOADING
========================================================= */

function setLoading(loading) {

    isLoading = loading;

    consultButton.disabled = loading;

    cepInput.disabled = loading;

    if (loading) {

        buttonText.textContent = "Consultando...";
        loadingSpinner.classList.remove("hidden");

    } else {

        buttonText.textContent = "Consultar CEP";
        loadingSpinner.classList.add("hidden");

        cepInput.disabled = false;
        consultButton.disabled = false;

    }

}


/* =========================================================
   MENSAGENS
========================================================= */

function showMessage(text, type = "info") {

    message.textContent = text;

    message.className = `message ${type}`;

}


function hideMessage() {

    message.textContent = "";

    message.className = "message hidden";

}


/* =========================================================
   DEFINIR TEXTO
========================================================= */

function setText(elementId, value) {

    const element = document.getElementById(elementId);

    if (!element) {
        return;
    }

    element.textContent =
        value && String(value).trim() !== ""
            ? value
            : "-";

}


/* =========================================================
   HISTÓRICO
========================================================= */

function getHistory() {

    try {

        const stored =
            localStorage.getItem(HISTORY_KEY);

        if (!stored) {
            return [];
        }

        const history = JSON.parse(stored);

        if (!Array.isArray(history)) {
            return [];
        }

        return history;

    } catch (error) {

        console.error(
            "Erro ao ler histórico:",
            error
        );

        return [];

    }

}


/* =========================================================
   ADICIONAR AO HISTÓRICO
========================================================= */

function addToHistory(data) {

    const history = getHistory();

    const cep = normalizeCep(data.cep);

    if (!cep) {
        return;
    }


    // Remove uma ocorrência anterior do mesmo CEP
    const filteredHistory =
        history.filter(
            item => normalizeCep(item.cep) !== cep
        );


    // Adiciona no início
    filteredHistory.unshift({
        cep: data.cep || "",
        localidade: data.localidade || "",
        uf: data.uf || "",
        logradouro: data.logradouro || "",
        timestamp: Date.now()
    });


    // Mantém somente os últimos registros
    const limitedHistory =
        filteredHistory.slice(0, MAX_HISTORY);


    try {

        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(limitedHistory)
        );

    } catch (error) {

        console.error(
            "Erro ao salvar histórico:",
            error
        );

    }


    renderHistory();

}


/* =========================================================
   RENDERIZAR HISTÓRICO
========================================================= */

function renderHistory() {

    const history = getHistory();

    historyList.innerHTML = "";


    if (history.length === 0) {

        emptyHistory.classList.remove("hidden");

        clearHistoryButton.disabled = true;

        return;
    }


    emptyHistory.classList.add("hidden");

    clearHistoryButton.disabled = false;


    history.forEach((item) => {

        const historyItem =
            document.createElement("button");

        historyItem.type = "button";
        historyItem.className = "history-item";


        const info =
            document.createElement("div");

        info.className = "history-info";


        const cep =
            document.createElement("span");

        cep.className = "history-cep";

        cep.textContent =
            formatCep(item.cep);


        const location =
            document.createElement("span");

        location.className = "history-location";

        const city =
            item.localidade || "Localidade desconhecida";

        const uf =
            item.uf || "";

        location.textContent =
            `${city}${uf ? ` - ${uf}` : ""}`;


        const arrow =
            document.createElement("span");

        arrow.className = "history-arrow";
        arrow.textContent = "›";


        info.appendChild(cep);
        info.appendChild(location);

        historyItem.appendChild(info);
        historyItem.appendChild(arrow);


        historyItem.addEventListener(
            "click",
            async () => {

                cepInput.value =
                    formatCep(item.cep);

                await consultarCep(item.cep);

            }
        );


        historyList.appendChild(historyItem);

    });

}


/* =========================================================
   LIMPAR HISTÓRICO
========================================================= */

clearHistoryButton.addEventListener(
    "click",
    () => {

        const confirmed =
            window.confirm(
                "Deseja realmente apagar todo o histórico?"
            );

        if (!confirmed) {
            return;
        }


        localStorage.removeItem(HISTORY_KEY);

        renderHistory();

        showMessage(
            "Histórico apagado com sucesso.",
            "success"
        );

    }
);


/* =========================================================
   NORMALIZAR CEP
========================================================= */

function normalizeCep(cep) {

    if (!cep) {
        return "";
    }

    return String(cep)
        .replace(/\D/g, "")
        .substring(0, 8);

}


/* =========================================================
   FORMATAR CEP
========================================================= */

function formatCep(cep) {

    const normalized =
        normalizeCep(cep);

    if (normalized.length !== 8) {
        return cep || "-";
    }

    return (
        normalized.substring(0, 5) +
        "-" +
        normalized.substring(5)
    );

}