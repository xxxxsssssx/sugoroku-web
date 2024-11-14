document.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    const setupDiv = document.getElementById('setup');
    const gameArea = document.getElementById('game_area');
    const startGameButton = document.getElementById('start_game_button');
    const numPlayersSelect = document.getElementById('num_players');
    const messageArea = document.getElementById('message_area');
    const diceProbabilitiesDiv = document.getElementById('dice_probabilities');
    const eventDescriptionsDiv = document.getElementById('event_descriptions');
    const playerInfoDiv = document.getElementById('player_info');
    const nextTurnButton = document.getElementById('next_turn_button');
    const rollDiceButton = document.getElementById('roll_dice_button');
    const gameBoard = document.getElementById('game_board');
    const ctx = gameBoard.getContext('2d');

    // ボタンの初期状態
    nextTurnButton.disabled = true;
    rollDiceButton.disabled = true;

    // グローバル変数
    let currentPlayerIndex = 0;
    let isGameOver = false;

    // 効果音を再生する関数
    function playSoundEffect(src) {
        const audio = new Audio(src);
        audio.play();
    }
    // ゲーム開始ボタンのクリックイベント
    startGameButton.addEventListener('click', () => {
        const numPlayers = parseInt(numPlayersSelect.value);
        fetch('/start_game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ num_players: numPlayers })
        })
        .then(response => {
            hideLoading();
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            setupDiv.style.display = 'none';
            gameArea.style.display = 'block';
            appendMessage(data.message);
            getGameState();
            fetchEventDescriptions();  // ここでイベントの説明を取得
            nextPlayerTurn();
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            appendMessage('ゲームの開始中にエラーが発生しました。');
        });
    });
    

    // 次のプレイヤーのターンボタンのクリックイベント
    nextTurnButton.addEventListener('click', () => {
        if (isGameOver) {
            appendMessage("ゲームは終了しました。");
            nextTurnButton.disabled = true;
            rollDiceButton.disabled = true;
            return;
        }
        nextPlayerTurn();
    });

    // サイコロを振るボタンのクリックイベント
    rollDiceButton.addEventListener('click', () => {
        playSoundEffect('/static/audio/dice_roll.mp3'); 
        showLoading();
        fetch('/roll_dice', {
            method: 'POST'
        })
        .then(response => {
            hideLoading();
            if (!response.ok) {
                // ステータスコードが200番台でない場合
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            appendMessage(data.message);
            currentPlayerIndex = data.current_player_index;
            isGameOver = data.is_over;
            updatePlayerInfo(data.players);
            updateDiceProbabilities();
            updateGameBoard(data.players);
        
            // イベント発生の検知
            if (data.message.includes('イベント発生！')) {
                playSoundEffect('/static/audio/event_trigger.mp3');
            }
        
            // ゲームオーバーの検知
            if (isGameOver) {
                playSoundEffect('/static/audio/game_over.mp3');
            }
        
            rollDiceButton.disabled = true;
            nextTurnButton.disabled = false;
        })
        
        .catch(error => {
            hideLoading();
            // エラーハンドリング
        });
    });

    // メッセージを表示する関数
    function appendMessage(message) {
        const p = document.createElement('p');
        p.textContent = message;
        messageArea.appendChild(p);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // ローディング表示用の要素を取得
const loadingIndicator = document.getElementById('loading_indicator');

    // 通信開始時に表示する関数
    function showLoading() {
    loadingIndicator.style.display = 'block';
    }

    // 通信終了時に非表示にする関数
    function hideLoading() {
    loadingIndicator.style.display = 'none';
    }

    // ゲーム状態を取得する関数
    function getGameState() {
        fetch('/get_game_state')
        .then(response => {
            hideLoading();
            if (!response.ok) {
                // ステータスコードが200番台でない場合
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            currentPlayerIndex = data.current_player_index;
            isGameOver = data.is_over;
            updatePlayerInfo(data.players);
            updateDiceProbabilities();
            updateGameBoard(data.players);
            fetchEventDescriptions();
        });
    }

    // プレイヤー情報を更新する関数
    function updatePlayerInfo(players) {
        playerInfoDiv.innerHTML = '';
        players.forEach((player, index) => {
            const p = document.createElement('p');
            p.textContent = `${player.name}：位置 ${player.position}`;
            if (index === currentPlayerIndex) {
                p.style.fontWeight = 'bold';
                p.style.color = 'red';
            }
            playerInfoDiv.appendChild(p);
        });
    }
    

    // サイコロの確率分布を更新する関数
    function updateDiceProbabilities() {
        // サーバー側で現在のサイコロの確率を取得するエンドポイントを作成する必要があります
        fetch('/get_dice_probabilities')
        .then(response => {
            hideLoading();
            if (!response.ok) {
                // ステータスコードが200番台でない場合
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            diceProbabilitiesDiv.innerHTML = '';
            const probs = data.probabilities;
            for (const face in probs) {
                const p = document.createElement('p');
                const probPercent = (probs[face] * 100).toFixed(1);
                p.textContent = `${face}: ${probPercent}%`;
                diceProbabilitiesDiv.appendChild(p);
            }
        });
    }

    // イベントの説明を取得する関数
    function fetchEventDescriptions() {
        fetch('/get_event_descriptions')
        .then(response => {
            hideLoading();
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('イベントデータ:', data);  // デバッグ用に追加
            eventDescriptionsDiv.innerHTML = '';
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
            appendMessage('イベントの説明を取得中にエラーが発生しました。');
        });
    }
    

    // 次のプレイヤーのターンを処理する関数
    function nextPlayerTurn() {
        if (isGameOver) {
            appendMessage("ゲームは終了しました。");
            nextTurnButton.disabled = true;
            rollDiceButton.disabled = true;
            return;
        }
        fetch('/get_game_state')
        .then(response => {
            hideLoading();
            if (!response.ok) {
                // ステータスコードが200番台でない場合
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            currentPlayerIndex = data.current_player_index;
            const playerName = data.players[currentPlayerIndex].name;
            appendMessage(`${playerName}さんのターンです。サイコロを振ってください。`);
            rollDiceButton.disabled = false;
            nextTurnButton.disabled = true;
            updatePlayerInfo(data.players);
        });
    }
    
    // メッセージを表示する関数
    function appendMessage(message) {
        const p = document.createElement('p');
        p.textContent = message;
        messageArea.appendChild(p);
    // スクロールを最新のメッセージに移動
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // ゲームボードを更新する関数
    function updateGameBoard(players) {
        // ゲームボードの描画
        const cellSize = 70;
        const cols = 10;
        const rows = 4;
        ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);

        // イベントのあるマスの情報を取得
        fetch('/get_event_positions')
        .then(response => {
            hideLoading();
            if (!response.ok) {
                // ステータスコードが200番台でない場合
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            const eventPositions = data.event_positions;

            for (let i = 0; i < 40; i++) {
                const row = Math.floor(i / cols);
                let col = i % cols;

                // 蛇行するパスのために行が偶数か奇数かで列の順序を変更
                if (row % 2 === 1) {
                    col = cols - 1 - col;
                }

                const x = col * cellSize;
                const y = row * cellSize;

                // マスの描画
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x, y, cellSize, cellSize);
                ctx.fillStyle = 'white';
                ctx.fillRect(x, y, cellSize, cellSize);

                // マス番号の描画
                ctx.fillStyle = 'black';
                ctx.font = '12px Arial';
                ctx.fillText(i, x + 5, y + 15);

                // イベントのあるマスの色付け
                const eventCell = eventPositions.find(event => event.position === i);
                // イベントのあるマスの色付け
            if (eventCell) {
                 switch (eventCell.event_name) {
                    case '2マス進む':
                    case '5マス進む':
                        ctx.fillStyle = 'lightgreen'; // 前進マスの色
                        break;
                    case '3マス戻る':
                    case '4マス戻る':
                        ctx.fillStyle = 'lightcoral'; // 後退マスの色
                        break;
                    case 'サイコロ確率変更':
                        ctx.fillStyle = 'lightblue'; // サイコロ確率変更マスの色
                        break;
                    default:
                            ctx.fillStyle = 'lightgray'; // その他のイベントマスの色
                }   
                ctx.fillRect(x, y, cellSize, cellSize);
            }

            }

            // プレイヤーの位置を描画
            const colors = ['red', 'blue', 'green', 'yellow'];
            const playerColors = ['red', 'blue', 'green', 'yellow'];
            players.forEach((player, index) => {
                const position = player.position;
                const row = Math.floor(position / cols);
                let col = position % cols;
            
                if (row % 2 === 1) {
                    col = cols - 1 - col;
                }
            
                const x = col * cellSize + cellSize / 2;
                const y = row * cellSize + cellSize / 2;
            
                // プレイヤーの描画
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, 2 * Math.PI);
                ctx.fillStyle = playerColors[index % playerColors.length];
                ctx.fill();
            });
            
        });
    }
});
