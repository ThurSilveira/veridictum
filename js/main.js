const GEMINI_API_KEY = "API_KEY";
const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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



/**
 * @param {HTMLTextAreaElement} input 
 * @param {string} text 
 */
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
        userInput.placeholder = 'Digite uma proposição em linguagem natural... Ex: "Se chove, a rua fica molhada"';
    } else {
        chatTitle.textContent = 'Tradução: CPC → Linguagem Natural';
        userInput.placeholder = 'Digite a Fórmula e as Proposições, separadas por uma linha. Ex:\nP = Chove\nQ = Faz sol\n(P ^ Q)';
    }
}

function updateWelcomeMessage() {
    const welcomeMessage = messagesContainer.querySelector('.message.bot');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    let welcomeText = '';

    if (currentMode === 'nl-to-cpc') {
        welcomeText = `
            <strong>Modo: Linguagem Natural → CPC</strong><br><br>
            
            <strong>Como usar:</strong><br>
            • Digite uma frase declarativa em português (uma proposição simples ou composta).<br>
            • Receba o DICIONÁRIO e a FORMULA lógica em Cálculo Proposicional Clássico (CPC).<br><br>
            
            <strong>Exemplos:</strong><br>
            • Entrada: "Se chover, então a rua fica molhada"<br>
            • Saída: DICIONARIO: P = Chove, Q = a rua fica molhada; FORMULA: P → Q<br>
        `;
    } else {
        welcomeText = `
            <strong>Modo: CPC → Linguagem Natural</strong><br><br>
            
            <strong>Como usar:</strong><br>
            • Na caixa abaixo, informe as letras das proposições, uma por linha, e a fórmula lógica na última linha.<br>
            • Símbolos permitidos: ∧, ∨, ¬, →, ↔ (ou alternativos: ^, |, !, ->, <->).<br><br>
            
            <strong>Exemplo de Entrada:</strong><br>
            P = "Chove"<br>
            Q = "Faz sol"<br>
            P v Q<br> 
            
            <strong>Saída Esperada:</strong><br>
            "Chove ou faz sol"<br>
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
