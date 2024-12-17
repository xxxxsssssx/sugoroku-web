// gameLogic.js

// ゲームの初期化を行う関数
function initGame() {
    // キャラクター選択フォームを更新します
    updateCharacterSelection();

    // イベントリスナーを設定します
    setupEventListeners();
}

// ゲームの現在の状態をサーバーから取得する関数
function getGameState() {
    fetch('/get_game_state')
    .then(response => response.json())
    .then(data => {
        currentPlayerIndex = data.current_player_index;
        isGameOver = data.is_over;
        updatePlayerInfo(data.players);
        updateDiceProbabilities();
        updateGameBoard(data.players);
        fetchEventDescriptions();
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage(`ゲーム状態の取得中にエラーが発生しました：${error.message}`);
    });
}

// 次のプレイヤーのターンを開始する関数
function nextPlayerTurn() {
    if (isGameOver) {
        appendMessage("ゲームは終了しました。");
        nextTurnButton.disabled = true;
        rollDiceButton.disabled = true;
        return;
    }
    fetch('/get_game_state')
    .then(response => response.json())
    .then(data => {
        currentPlayerIndex = data.current_player_index;
        const playerName = data.players[currentPlayerIndex].name;
        appendMessage(`${playerName}さんのターンです。サイコロを振ってください。`);
        rollDiceButton.disabled = false;
        nextTurnButton.disabled = true;
        updatePlayerInfo(data.players);
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage(`次のターンへの移行中にエラーが発生しました：${error.message}`);
    });
}

// イベントの説明をサーバーから取得して表示する関数
function fetchEventDescriptions() {
    fetch('/get_event_descriptions')
    .then(response => response.json())
    .then(data => {
        eventDescriptionsDiv.innerHTML = '';

        // 各イベントの説明を表示します
        data.events.forEach(event => {
            const div = document.createElement('div');
            const nameP = document.createElement('p');
            const descP = document.createElement('p');

            nameP.textContent = event.name;
            nameP.style.fontWeight = 'bold';

            descP.textContent = event.description;

            div.appendChild(nameP);
            div.appendChild(descP);
            eventDescriptionsDiv.appendChild(div);
        });
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage(`イベントの説明を取得中にエラーが発生しました：${error.message}`);
    });
}
