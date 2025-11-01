document.addEventListener('DOMContentLoaded', function() {
    const chatOptions = document.querySelectorAll('.chat-option');
    const messagesContainer = document.getElementById('messages');
    const chatTitle = document.getElementById('chat-title');
    const userInput = document.getElementById('userInput');
    
    let currentMode = 'nl-to-cpc';

    chatOptions.forEach(option => { // troca de modo
        option.addEventListener('click', function() {
            chatOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            currentMode = this.dataset.type;
            updateInterface();
            updateWelcomeMessage();
        });
    });

    function updateInterface() { // atualiza o placeholder
        if (currentMode === 'nl-to-cpc') {
            chatTitle.textContent = 'Tradução: Linguagem Natural → CPC';
            userInput.placeholder = 'Digite uma proposição em linguagem natural...';
        } else {
            chatTitle.textContent = 'Tradução: CPC → Linguagem Natural';
            userInput.placeholder = 'Digite uma fórmula em CPC seguindo as instruções acima...';
        }
    }

    function updateWelcomeMessage() { // atualiza a mensagem inicial do modo selecionado
        const welcomeMessage = messagesContainer.querySelector('.message.bot');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        let welcomeText = '';
        if (currentMode === 'nl-to-cpc') {
            welcomeText = `
                <strong>Modo: Linguagem Natural → CPC</strong><br><br>
                
                <strong>Como usar:</strong><br>
                • Digite uma frase em português sem erros gramaticais<br>
                • Receba a tradução para Cálculo Proposicional Clássico<br><br>
                
                <strong>Exemplos:</strong><br>
                • "Se chover, então a rua fica molhada"<br>
                • Resultado: P → Q<br>
                • "Estudo e passo no exame"<br>
                • Resultado: P ∧ Q<br>
                • "Não chove"<br>
                • Resultado: ¬P<br>
            `;
        } else {
            welcomeText = `
                <strong>Modo: CPC → Linguagem Natural</strong><br><br>
                
                <strong>Como usar:</strong><br>
                • Digite a fórmula em CPC<br>
                • Receba a tradução<br><br>
                
                <strong>Exemplos:</strong><br>
                • Informe a letra e sua informação para o chat:<br>
                • P = "Chove" Q = "Faz sol"<br>
                • E informe a operação desejada:<br>
                • P ∨ Q<br> 
                • Resultado: "Chove ou faz sol"<br>
            `;
        }

        const welcomeDiv = document.createElement('div'); // adiciona a nova msg de boas vindas
        welcomeDiv.className = 'message bot';
        welcomeDiv.innerHTML = `
            <div class="avatar">
                <img src="images/avatar.png" alt="Veridictum">
            </div>
            <div class="message-content">
                <div class="meta">Veridictum</div>
                <div class="text">${welcomeText}</div>
            </div>
        `;
        
        messagesContainer.appendChild(welcomeDiv);
        scrollToBottom();
    }

    function scrollToBottom() { // rolamento dos chats
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    updateWelcomeMessage(); // inicializador
});