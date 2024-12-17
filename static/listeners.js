// listeners.js

// イベントリスナーを設定する関数
function setupEventListeners() {
    // プレイヤー人数の選択が変更されたときにキャラクター選択フォームを更新します
    numPlayersSelect.addEventListener('change', updateCharacterSelection);

    // ゲーム開始ボタンがクリックされたときの処理を設定します
    startGameButton.addEventListener('click', () => {
        // 選択されたプレイヤー人数を取得します
        const numPlayers = parseInt(numPlayersSelect.value);

        // 選択されたキャラクターを配列に格納します
        const selectedCharacters = [];
        const characterSelects = document.querySelectorAll('.character-select');

        characterSelects.forEach(select => {
            selectedCharacters.push(select.value);
        });

        // サーバーにゲーム開始のリクエストを送信します
        fetch('/start_game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ num_players: numPlayers, characters: selectedCharacters })
        })
        .then(response => response.json())
        .then(data => {
            // ゲーム開始のセットアップを行います
            setupDiv.style.display = 'none';
            gameArea.style.display = 'block';
            appendMessage(data.message);
            getGameState();
            nextPlayerTurn();
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage(`ゲームの開始中にエラーが発生しました：${error.message}`);
        });
    });

    // 次のプレイヤーのターンボタンがクリックされたときの処理を設定します
    nextTurnButton.addEventListener('click', () => {
        if (isGameOver) {
            appendMessage("ゲームは終了しました。");
            nextTurnButton.disabled = true;
            rollDiceButton.disabled = true;
            return;
        }
        nextPlayerTurn();
    });

    // サイコロを振るボタンがクリックされたときの処理を設定します
    rollDiceButton.addEventListener('click', () => {
        showLoading();

        fetch('/roll_dice', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            appendMessage(data.message);

            currentPlayerIndex = data.current_player_index;
            isGameOver = data.is_over;
            updatePlayerInfo(data.players);
            updateDiceProbabilities();
            updateGameBoard(data.players);

            // イベントが発生しているかチェックし、対応する処理を行います
            const player = data.players[currentPlayerIndex];
            if (player.is_in_monty_hall) {
                handleMontyHallEvent(player);
            }
            if (player.is_in_maze) {
                handleMazeEvent(player);
            }
            if (player.needs_dice_selection) {
                handleDiceSelectionEvent(player);
            }

            rollDiceButton.disabled = true;
            nextTurnButton.disabled = false;
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            appendMessage(`サイコロの振動中にエラーが発生しました：${error.message}`);
        });
    });

    // サイコロの確率分布の表示/非表示ボタンがクリックされたときの処理を設定します
    toggleDiceProbabilitiesButton.addEventListener('click', () => {
        if (diceProbabilitiesDiv.style.display === 'none' || diceProbabilitiesDiv.style.display === '') {
            diceProbabilitiesDiv.style.display = 'block';
            toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を非表示';
        } else {
            diceProbabilitiesDiv.style.display = 'none';
            toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を表示';
        }
    });

    // イベント説明の表示/非表示ボタンがクリックされたときの処理を設定します
    toggleEventDescriptionsButton.addEventListener('click', () => {
        if (eventDescriptionsDiv.style.display === 'none' || eventDescriptionsDiv.style.display === '') {
            eventDescriptionsDiv.style.display = 'block';
            toggleEventDescriptionsButton.textContent = 'イベント説明を非表示';
        } else {
            eventDescriptionsDiv.style.display = 'none';
            toggleEventDescriptionsButton.textContent = 'イベント説明を表示';
        }
    });

    // モンティ・ホールイベントのモーダルを閉じるボタンがクリックされたときの処理を設定します
    montyHallCloseButton.addEventListener('click', () => {
        montyHallModal.style.display = 'none';
    });

    // 迷路イベントのモーダルを閉じるボタンがクリックされたときの処理を設定します
    mazeCloseButton.addEventListener('click', () => {
        mazeModal.style.display = 'none';
    });

    // サイコロ選択用モーダルの閉じるボタンがクリックされたときの処理を設定します
    diceSelectionClose.addEventListener('click', () => {
        diceSelectionModal.style.display = 'none';
    });

    // モーダルの外側をクリックしたときにモーダルを閉じる処理を設定します
    window.addEventListener('click', (event) => {
        if (event.target == montyHallModal) {
            montyHallModal.style.display = 'none';
        }
        if (event.target == mazeModal) {
            mazeModal.style.display = 'none';
        }
        if (event.target == diceSelectionModal) {
            diceSelectionModal.style.display = 'none';
        }
    });
}
