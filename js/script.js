const API_ENDPOINT = "https://veridictum.onrender.com/api/gemini";

const chatOptions = document.querySelectorAll('.chat-option');
const messagesContainer = document.getElementById('messages');
const chatTitle = document.getElementById('chat-title');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendBtn');
const logicSymbols = document.querySelectorAll('.logic-symbols .symbol-item');

let currentMode = 'nl-to-cpc';

document.addEventListener('DOMContentLoaded', function () {
    chatOptions.forEach(option => {
        option.addEventListener('click', function () {
            chatOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            currentMode = this.dataset.type;
            
            updateInterface();
            updateWelcomeMessage(); 
        });
    });
    
    sendButton.addEventListener('click', handleTranslation);
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTranslation();
        }
    });
    
    logicSymbols.forEach(symbolItem => {
        symbolItem.addEventListener('click', function () {
            const symbol = this.querySelector('.symbol').textContent.trim();
            insertSymbolAtCursor(userInput, symbol);
        });
    });

    updateInterface();
    updateWelcomeMessage();
});


function insertSymbolAtCursor(input, text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newText = input.value.substring(0, start) + text + input.value.substring(end);
    input.value = newText;
    const newPosition = start + text.length;
    input.selectionStart = newPosition;
    input.selectionEnd = newPosition;

    input.focus();
}

function updateInterface() {
    if (currentMode === 'nl-to-cpc') {
        chatTitle.textContent = 'Tradução: Linguagem Natural → CPC';
        userInput.placeholder = 'Digite uma proposição em linguagem natural...';
    } else {
        chatTitle.textContent = 'Tradução: CPC → Linguagem Natural';
        userInput.placeholder = 'Digite a fórmula e as proposições, como no exemplo...';
    }
}

function updateWelcomeMessage() {
    messagesContainer.innerHTML = '';
    
    let welcomeText = '';

    if (currentMode === 'nl-to-cpc') {
        welcomeText = `
            <strong>Modo: Linguagem Natural → CPC</strong><br>
            <strong>Como usar:</strong>
            • Digite uma frase em português e receba o DICIONÁRIO e a FORMULA lógica (CPC).<br>
            <strong>Exemplo:</strong>
            • Entrada: "Se chover, então a rua fica molhada"
            • Saída: DICIONARIO: P = Chove, Q = a rua fica molhada; FORMULA: P → Q<br>
            <strong style="color:#e74c3c;">AVISO:</strong> A primeira operação após 15 minutos de inatividade pode levar até 30s, pois o servidor (Render) precisa iniciar.
        `;
    } else {
        welcomeText = `
            <strong>Modo: CPC → Linguagem Natural</strong><br>
            <strong>Como usar:</strong>
            • Informe as proposições (uma por linha) e a fórmula lógica na última linha.
            • Símbolos permitidos: ∧, ∨, ¬, →, ↔ (ou alternativos: ^, v, ~, ->, <->).<br> 
            <strong>Exemplo de Entrada:</strong>
            P = "Chove"
            Q = "Faz sol"
            P v Q<br>
            <strong>Saída Esperada:</strong>
            "Chove ou faz sol"<br>
            <strong style="color:#e74c3c;">AVISO:</strong> A primeira operação após 15 minutos de inatividade pode levar até 30s, pois o servidor (Render) precisa iniciar.
        `;
    }

    addMessage(welcomeText, 'bot', 'Veridictum');
}

function addMessage(text, sender, meta) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatarImg = sender === 'bot' ? 'images/avatar.png' : 'images/user.png';

    messageDiv.innerHTML = `
        <div class="avatar">
            <img src="${avatarImg}" alt="${meta}">
        </div>
        <div class="message-content">
            <div class="meta">${meta}</div>
            <div class="text">${text.replace(/\n/g, '<br>')}</div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


function showLoading() {
    sendButton.disabled = true;
    sendButton.innerHTML = '...';
}

function resetButton() {
    sendButton.disabled = false;
    sendButton.innerHTML = '<span class="send-icon">➤</span>';
}

async function handleTranslation() {
    const content = userInput.value.trim();
    if (!content) {
        alert('Por favor, digite o conteúdo para a tradução.');
        return;
    }

    addMessage(content, 'user', 'Você');
    userInput.value = '';
    showLoading();

    let prompt = '';

    if (currentMode === 'nl-to-cpc') {
        prompt = createNlToCpcPrompt(content);
    } else {
        prompt = createCpcToNlPrompt(content);
    }

    try {
        const response = await callGeminiAPI(prompt);
        addMessage(response, 'bot', 'Veridictum');
    } catch (error) {
        console.error('Erro ao chamar a API:', error);
        addMessage(`Erro na tradução: ${error.message}. Verifique a sua chave API, os símbolos, ou o console.`, 'bot', 'Veridictum');
    } finally {
        resetButton();
    }
}
function createNlToCpcPrompt(content) {
    return `
        Você é um tradutor de linguagem natural para a Linguagem do Cálculo Proposicional Clássico (CPC).
        
        **Sua tarefa é:**
        1. Identificar as proposições simples na frase em português.
        2. Atribuir uma letra maiúscula (P, Q, R...) a cada proposição, criando um dicionário de tradução.
        3. Traduzir a frase para a fórmula lógica, utilizando apenas os símbolos:
           - **e**: ^
           - **ou**: v
           - **não**: ~
           - **implica/se...então**: ->
           - **se e somente se**: <->
        4. **O formato de saída deve ser estritamente:**
           DICIONARIO: [Lista das proposições e suas letras, separadas por ponto e vírgula e uma quebra de linha]
           FORMULA: [A fórmula lógica traduzida]
        
        **Frase para tradução:** "${content}"
    `;
}

function createCpcToNlPrompt(content) {

    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
        throw new Error('Formato de entrada inválido. Esperado: Proposições e a Fórmula Lógica.');
    }

    const formula = lines.pop().replace(/&/g, '^').replace(/\|/g, 'v').replace(/!/g, '~');
    const prepositions = lines.join('; ');

    if (!prepositions || !formula) {
        throw new Error('As preposições ou a fórmula lógica estão vazias.');
    }

    return `
        Você é um tradutor da Linguagem do Cálculo Proposicional Clássico (CPC) para o português.
        
        **Sua tarefa é:**
        1. Analisar as Preposições e a Fórmula Lógica fornecidas.
        2. Traduzir a fórmula lógica para uma sentença em português que seja gramaticalmente **coerente** e **natural**.
        3. A tradução deve refletir com precisão a estrutura lógica (negação, conjunção, disjunção, implicação, bi-implicação) usando as preposições fornecidas.
        4. **Os símbolos a serem traduzidos são:**
           - **^**: "e" (conjunção)
           - **v**: "ou" (disjunção)
           - **~**: "não" (negação, usar 'não é verdade que', 'não' antes do verbo, etc., de forma coerente)
           - **->**: "se...então..." (implicação)
           - **<->**: "se e somente se" (bi-implicação)
        5. A frase traduzida deve ser a única saída, sem preâmbulos ou explicações.
        
        **Preposições:** ${prepositions}

        **Fórmula Lógica:** ${formula}
    `;
}

async function callGeminiAPI(prompt) {

    const response = await fetch(API_ENDPOINT, { 
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.erro || "Erro ao chamar o servidor.");
    }

    const json = await response.json();

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        throw new Error("Resposta vazia da IA.");
    }

    return text;
}