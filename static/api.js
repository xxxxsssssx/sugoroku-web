// api.js

// サーバーとの通信を行う関数をまとめたモジュール

// ゲームを開始するためのAPI呼び出し
function startGame() {
    const numPlayers = parseInt(numPlayersSelect.value);
    const selectedCharacters = [];
    const characterSelects = document.querySelectorAll('.character-select');

    characterSelects.forEach(select => {
        selectedCharacters.push(select.value);
    });

    showLoading();  // ローディング表示を表示

    fetch('/start_game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_players: numPlayers, characters: selectedCharacters })
    })
    .then(response => {
        hideLoading();  // ローディング表示を非表示

        if (!response.ok) {
            // レスポンスがエラーの場合、エラーメッセージを取得して例外を投げる
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'サーバーエラー');
            }).catch(() => {
                throw new Error('サーバーエラー');
            });
        }
        return response.json();  // レスポンスをJSONとしてパース
    })
    .then(data => {
        // ゲーム開始のセットアップを行う
        setupDiv.style.display = 'none';  // 設定画面を非表示
        gameArea.style.display = 'block';  // ゲーム画面を表示
        appendMessage(data.message);  // サーバーからのメッセージを表示
        getGameState();  // ゲームの現在の状態を取得
        nextPlayerTurn();  // 次のプレイヤーのターンを開始
    })
    .catch(error => {
        hideLoading();  // ローディング表示を非表示
        console.error('Error:', error);
        appendMessage(`ゲームの開始中にエラーが発生しました：${error.message}`);
    });
}

// ゲームの状態を取得するためのAPI呼び出し
function getGameState() {
    fetch('/get_game_state')
    .then(response => {
        hideLoading();  // ローディング表示を非表示

        if (!response.ok) {
            // レスポンスがエラーの場合、エラーメッセージを取得して例外を投げる
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'サーバーエラー');
            }).catch(() => {
                throw new Error('サーバーエラー');
            });
        }
        return response.json();  // レスポンスをJSONとしてパース
    })
    .then(data => {
        // ゲームの状態を更新
        currentPlayerIndex = data.current_player_index;
        isGameOver = data.is_over;
        updatePlayerInfo(data.players);
        updateDiceProbabilities();
        updateGameBoard(data.players);
        fetchEventDescriptions();  // イベントの説明を取得
    })
    .catch(error => {
        hideLoading();  // ローディング表示を非表示
        console.error('Error:', error);
        appendMessage(`ゲーム状態の取得中にエラーが発生しました：${error.message}`);
    });
}

// サイコロを振るためのAPI呼び出し
function rollDice() {
    showLoading();  // ローディング表示を表示

    // サーバーにサイコロを振るリクエストを送信
    fetch('/roll_dice', {
        method: 'POST'
    })
    .then(response => {
        hideLoading();  // ローディング表示を非表示

        if (!response.ok) {
            // レスポンスがエラーの場合、エラーメッセージを取得して例外を投げる
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'サーバーエラー');
            }).catch(() => {
                throw new Error('サーバーエラー');
            });
        }
        return response.json();  // レスポンスをJSONとしてパース
    })
    .then(data => {
        // サーバーからのメッセージを表示
        appendMessage(data.message);

        // 現在のプレイヤー情報を更新
        currentPlayerIndex = data.current_player_index;
        isGameOver = data.is_over;
        updatePlayerInfo(data.players);
        updateDiceProbabilities();
        updateGameBoard(data.players);

        // イベントが発生しているかチェックし、対応する処理を行う
        const player = data.players[currentPlayerIndex];
        if (player.is_in_monty_hall) {
            handleMontyHallEvent(player);  // モンティ・ホールイベントの処理
        }
        if (player.is_in_maze) {
            handleMazeEvent(player);  // 迷路イベントの処理
        }
        if (player.needs_dice_customization) {
            checkDiceCustomization(player);  // サイコロカスタマイズの処理
        }

        // ボタンの状態を更新
        rollDiceButton.disabled = true;
        nextTurnButton.disabled = false;
    })
    .catch(error => {
        hideLoading();  // ローディング表示を非表示
        console.error('Error:', error);
        appendMessage(`サイコロの振動中にエラーが発生しました：${error.message}`);
    });
}

// その他のAPI呼び出し関数をここに定義
