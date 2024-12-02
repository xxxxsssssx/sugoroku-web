// ページの読み込みが完了したときに実行される関数を登録
document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    // ゲーム開始前の設定画面の要素を取得
    const setupDiv = document.getElementById('setup');
    // ゲーム画面の要素を取得
    const gameArea = document.getElementById('game_area');
    // ゲーム開始ボタンの要素を取得
    const startGameButton = document.getElementById('start_game_button');
    // プレイヤー人数を選択するセレクトボックスの要素を取得
    const numPlayersSelect = document.getElementById('num_players');
    // メッセージを表示するエリアの要素を取得
    const messageArea = document.getElementById('message_area');
    // プレイヤー情報を表示するエリアの要素を取得
    const playerInfoDiv = document.getElementById('player_info');
    // 次のプレイヤーのターンボタンの要素を取得
    const nextTurnButton = document.getElementById('next_turn_button');
    // サイコロを振るボタンの要素を取得
    const rollDiceButton = document.getElementById('roll_dice_button');
    // ゲームボードのキャンバス要素を取得
    const gameBoard = document.getElementById('game_board');
    // キャンバスの描画コンテキストを取得
    const ctx = gameBoard.getContext('2d');
    // ローディング表示用の要素を取得
    const loadingIndicator = document.getElementById('loading_indicator');
    // イベント説明の表示/非表示ボタンの要素を取得
    const toggleEventDescriptionsButton = document.getElementById('toggle_event_descriptions_button');
    // イベントの説明を表示するエリアの要素を取得
    const eventDescriptionsDiv = document.getElementById('event_descriptions');
    // サイコロの確率分布を表示するためのキャンバス要素を取得
    const diceChartCanvas = document.getElementById('dice_chart');
    // サイコロの確率分布の表示/非表示ボタンの要素を取得
    const toggleDiceProbabilitiesButton = document.getElementById('toggle_dice_probabilities_button');
    // サイコロの確率分布を表示するエリアの要素を取得
    const diceProbabilitiesDiv = document.getElementById('dice_probabilities');
    // モンティ・ホールイベント用のモーダル要素を取得
    const montyHallModal = document.getElementById('monty_hall_modal');
    // モンティ・ホールイベントの内容を表示するエリアの要素を取得
    const montyHallContent = document.getElementById('monty_hall_content');
    // モンティ・ホールイベントのモーダルを閉じるボタンの要素を取得
    const montyHallCloseButton = document.getElementById('monty_hall_close_button');
    // 迷路イベント用のモーダル要素を取得
    const mazeModal = document.getElementById('maze_modal');
    // 迷路イベントの内容を表示するエリアの要素を取得
    const mazeContent = document.getElementById('maze_content');
    // 迷路イベントのモーダルを閉じるボタンの要素を取得
    const mazeCloseButton = document.getElementById('maze_close_button');

    // --- ボタンの初期状態を設定 ---

    // ゲーム開始前なので、次のプレイヤーのターンボタンとサイコロを振るボタンは無効化
    nextTurnButton.disabled = true;
    rollDiceButton.disabled = true;

    // --- グローバル変数の定義 ---

    // 現在のプレイヤーのインデックスを保持
    let currentPlayerIndex = 0;

    // ゲームが終了したかどうかを保持
    let isGameOver = false;

    // サイコロの確率分布を表示するためのチャートオブジェクトを保持
    let diceChart = null;

    // --- イベントリスナーの設定 ---

    // プレイヤー人数の選択が変更されたときにキャラクター選択フォームを更新
    numPlayersSelect.addEventListener('change', updateCharacterSelection);

    // ゲーム開始ボタンがクリックされたときの処理設定
    startGameButton.addEventListener('click', () => {
        // 選択されたプレイヤー人数を取得
        const numPlayers = parseInt(numPlayersSelect.value);

        // 選択されたキャラクターを配列に格納
        const selectedCharacters = [];
        const characterSelects = document.querySelectorAll('.character-select');

        characterSelects.forEach(select => {
            selectedCharacters.push(select.value);
        });

        // サーバーにゲーム開始のリクエストを送信
        fetch('/start_game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // プレイヤー人数と選択されたキャラクターをJSON形式で送信
            body: JSON.stringify({ num_players: numPlayers, characters: selectedCharacters })
        })
        .then(response => {
            hideLoading();  // ローディング表示を非表示

            if (!response.ok) {
                // レスポンスがエラーの場合、エラーメッセージを取得
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                }).catch(() => {
                    throw new Error('サーバーエラー');
                });
            }
            return response.json();  // レスポンスをJSONとしてパース
        })
        .then(data => {
            // ゲーム開始のセットアップを行います
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
    });

    // 次のプレイヤーのターンボタンがクリックされたときの処理を設定
    nextTurnButton.addEventListener('click', () => {
        if (isGameOver) {
            // ゲームが終了している場合はメッセージを表示し、ボタンを無効化
            appendMessage("ゲームは終了しました。");
            nextTurnButton.disabled = true;
            rollDiceButton.disabled = true;
            return;
        }
        nextPlayerTurn();  // 次のプレイヤーのターンを開始
    });

    // サイコロを振るボタンがクリックされたときの処理を設定
    rollDiceButton.addEventListener('click', () => {
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
    });

    // サイコロの確率分布の表示/非表示ボタンがクリックされたときの処理を設定
    toggleDiceProbabilitiesButton.addEventListener('click', () => {
        if (diceProbabilitiesDiv.style.display === 'none' || diceProbabilitiesDiv.style.display === '') {
            // サイコロの確率分布を表示
            diceProbabilitiesDiv.style.display = 'block';
            toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を非表示';
        } else {
            // サイコロの確率分布を非表示
            diceProbabilitiesDiv.style.display = 'none';
            toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を表示';
        }
    });

    // 初期状態でサイコロの確率分布ボタンのテキストを設定
    toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を表示';

    // --- 関数の定義 ---

    // ローディング表示を表示する関数
    function showLoading() {
        loadingIndicator.style.display = 'block';
    }

    // ローディング表示を非表示にする関数
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // メッセージを表示する関数
    function appendMessage(message) {
        const p = document.createElement('p');
        p.innerHTML = message;  // メッセージ内の改行などを反映
        messageArea.appendChild(p);
        // メッセージエリアを最新のメッセージまでスクロール
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // ゲームの現在の状態をサーバーから取得する関数
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

    // プレイヤー情報を更新して表示する関数
    function updatePlayerInfo(players) {
        playerInfoDiv.innerHTML = '';  // プレイヤー情報エリアをクリア

        players.forEach((player, index) => {
            const div = document.createElement('div');
            div.classList.add('player-info');

            // プレイヤーのキャラクター画像を表示
            const img = document.createElement('img');
            img.src = `/static/images/avatars/${player.character}`;
            img.alt = player.name;
            img.width = 50;  // 画像の幅
            img.height = 50;  // 画像の高さ

            // プレイヤー名を表示
            const nameP = document.createElement('p');
            nameP.textContent = player.name;
            if (index === currentPlayerIndex) {
                // 現在のプレイヤーを強調表示
                nameP.style.fontWeight = 'bold';
                nameP.style.color = 'red';
            }

            // プレイヤーの残りマス数を表示
            const remainingSteps = 39 - player.position;  // ゴールまでの残りマス数を計算
            const stepsP = document.createElement('p');
            stepsP.textContent = `残りマス数: ${remainingSteps}`;

            // 要素を組み立てて表示
            div.appendChild(img);
            div.appendChild(nameP);
            div.appendChild(stepsP);
            playerInfoDiv.appendChild(div);
        });
    }

    // サイコロの確率分布を更新して表示する関数
    function updateDiceProbabilities() {
        fetch('/get_dice_probabilities')
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
            const probs = data.probabilities;  // サイコロの確率を取得
            const labels = [];  // チャートのラベルを格納する配列
            const values = [];  // チャートのデータを格納する配列

            // サイコロの目ごとにラベルと値を設定
            for (const face of Object.keys(probs)) {
                labels.push(`目${face}`);
                values.push(probs[face] * 100);  // パーセンテージに変換
            }

            // データの最大値を取得
            const maxValue = Math.max(...values);

            // 既にチャートが存在する場合はデータを更新
            if (diceChart) {
                diceChart.data.labels = labels;
                diceChart.data.datasets[0].data = values;
                diceChart.options.scales.r.suggestedMax = Math.ceil(maxValue / 10) * 10;  // 最大値を調整
                diceChart.update();
            } else {
                // 新しくチャートを作成
                const ctx = diceChartCanvas.getContext('2d');
                diceChart = new Chart(ctx, {
                    type: 'radar',  // レーダーチャートを使用
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'サイコロの出目の確率（％）',
                            data: values,
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',  // 背景色
                            borderColor: 'rgba(54, 162, 235, 1)',  // 枠線の色
                            borderWidth: 1  // 枠線の太さ
                        }]
                    },
                    options: {
                        scales: {
                            r: {
                                angleLines: { display: true },
                                suggestedMin: 0,
                                suggestedMax: Math.ceil(maxValue / 10) * 10  // 最大値を調整
                            }
                        },
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
        })
        .catch(error => {
            hideLoading();  // ローディング表示を非表示
            console.error('Error:', error);
            appendMessage(`サイコロの確率情報の取得中にエラーが発生しました：${error.message}`);
        });
    }

    // イベントの説明をサーバーから取得して表示する関数
    function fetchEventDescriptions() {
        fetch('/get_event_descriptions')
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
            eventDescriptionsDiv.innerHTML = '';  // イベント説明エリアをクリア

            // 各イベントの説明を表示
            data.events.forEach(event => {
                const div = document.createElement('div');
                const nameP = document.createElement('p');
                const descP = document.createElement('p');

                nameP.textContent = event.name;
                nameP.style.fontWeight = 'bold';  // イベント名を強調表示

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

    // 次のプレイヤーのターンを開始する関数
    function nextPlayerTurn() {
        if (isGameOver) {
            // ゲームが終了している場合はメッセージを表示し、ボタンを無効化
            appendMessage("ゲームは終了しました。");
            nextTurnButton.disabled = true;
            rollDiceButton.disabled = true;
            return;
        }
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
            currentPlayerIndex = data.current_player_index;  // 現在のプレイヤーを更新
            const playerName = data.players[currentPlayerIndex].name;
            appendMessage(`${playerName}さんのターンです。サイコロを振ってください。`);
            rollDiceButton.disabled = false;  // サイコロを振るボタンを有効化
            nextTurnButton.disabled = true;  // 次のターンボタンを無効化
            updatePlayerInfo(data.players);  // プレイヤー情報を更新
        })
        .catch(error => {
            hideLoading();  // ローディング表示を非表示
            console.error('Error:', error);
            appendMessage(`次のターンへの移行中にエラーが発生しました：${error.message}`);
        });
    }

    // ゲームボードを更新して描画する関数
    function updateGameBoard(players) {
        // ゲームボードの設定
        const cellSize = 70;  // 1マスのサイズ（ピクセル）
        const cols = 10;  // 列数
        const rows = 4;  // 行数
        ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);  // キャンバスをクリア

        // イベントのあるマスの情報をサーバーから取得
        fetch('/get_event_positions')
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
            const eventPositions = data.event_positions;  // イベントのあるマスの情報

            // ボードの各マスを描画
            for (let i = 0; i < 40; i++) {
                const row = Math.floor(i / cols);
                let col = i % cols;

                // ジグザグに進むための列の調整
                if (row % 2 === 1) {
                    col = cols - 1 - col;
                }

                const x = col * cellSize;
                const y = row * cellSize;

                // マスの枠を描画
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x, y, cellSize, cellSize);

                // イベントのあるマスの背景色を設定
                const eventCell = eventPositions.find(event => event.position === i);
                if (eventCell) {
                    // イベントごとに背景色を設定
                    switch (eventCell.event_name) {
                        case '2マス進む':
                        case '5マス進む':
                            ctx.fillStyle = '#d1e7dd';  // 緑系
                            break;
                        case '3マス戻る':
                        case '4マス戻る':
                            ctx.fillStyle = '#f8d7da';  // 赤系
                            break;
                        case 'サイコロ確率変更':
                            ctx.fillStyle = '#fff3cd';  // 黄系
                            break;
                        case '確率の迷路':
                            ctx.fillStyle = '#cfe2ff';  // 青系
                            break;
                        case 'サイコロカスタマイズ':
                            ctx.fillStyle = '#f8d7da';  // ピンク系
                            break;
                        case 'モンティ・ホールの挑戦':
                            ctx.fillStyle = '#e2e3e5';  // グレー系
                            break;
                        default:
                            ctx.fillStyle = 'white';
                    }
                    ctx.fillRect(x, y, cellSize, cellSize);
                } else {
                    // 通常のマスの背景色
                    ctx.fillStyle = 'white';
                    ctx.fillRect(x, y, cellSize, cellSize);
                }

                // マス番号を描画
                ctx.fillStyle = 'black';
                ctx.font = '12px Arial';
                ctx.fillText(i, x + 5, y + 15);
            }

            // プレイヤーの位置を描画
            players.forEach((player, index) => {
                const position = player.position;
                const row = Math.floor(position / cols);
                let col = position % cols;

                // ジグザグに進むための列の調整
                if (row % 2 === 1) {
                    col = cols - 1 - col;
                }

                const x = col * cellSize + cellSize / 2;
                const y = row * cellSize + cellSize / 2;

                // プレイヤーのキャラクター画像を描画
                let img = new Image();
                img.src = `/static/images/avatars/${player.character}`;
                img.onload = function() {
                    ctx.drawImage(img, x - 15, y - 15, 30, 30);  // 画像を中央に描画
                };
            });
        })
        .catch(error => {
            hideLoading();  // ローディング表示を非表示
            console.error('Error:', error);
            appendMessage(`ゲームボードの更新中にエラーが発生しました：${error.message}`);
        });
    }

    // キャラクター選択フォームを更新して表示する関数
    function updateCharacterSelection() {
        const numPlayers = parseInt(numPlayersSelect.value);  // 選択されたプレイヤー人数を取得
        const characterSelectionDiv = document.getElementById('character_selection');
        characterSelectionDiv.innerHTML = '';  // キャラクター選択エリアをクリア

        for (let i = 0; i < numPlayers; i++) {
            // ラベルを作成
            const label = document.createElement('label');
            label.textContent = `プレイヤー${i + 1}のキャラクター: `;

            // セレクトボックスを作成
            const select = document.createElement('select');
            select.classList.add('character-select');

            // アバターのオプションを追加
            const avatars = ['avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar4.png'];
            avatars.forEach(avatar => {
                const option = document.createElement('option');
                option.value = avatar;
                option.textContent = avatar.split('.')[0];  // 拡張子を除いた名前
                select.appendChild(option);
            });

            // 要素を組み立てて表示
            characterSelectionDiv.appendChild(label);
            characterSelectionDiv.appendChild(select);
            characterSelectionDiv.appendChild(document.createElement('br'));
        }
    }

    // 初期表示のためにキャラクター選択フォームを更新
    updateCharacterSelection();

    // イベント説明の表示/非表示ボタンがクリックされたときの処理を設定
    toggleEventDescriptionsButton.addEventListener('click', () => {
        if (eventDescriptionsDiv.style.display === 'none' || eventDescriptionsDiv.style.display === '') {
            // イベント説明を表示
            eventDescriptionsDiv.style.display = 'block';
            toggleEventDescriptionsButton.textContent = 'イベント説明を非表示';
        } else {
            // イベント説明を非表示
            eventDescriptionsDiv.style.display = 'none';
            toggleEventDescriptionsButton.textContent = 'イベント説明を表示';
        }
    });

    // モンティ・ホールイベントのモーダルを閉じるボタンがクリックされたときの処理を設定
    montyHallCloseButton.addEventListener('click', () => {
        montyHallModal.style.display = 'none';
    });

    // 迷路イベントのモーダルを閉じるボタンがクリックされたときの処理を設定
    mazeCloseButton.addEventListener('click', () => {
        mazeModal.style.display = 'none';
    });

    // モンティ・ホールイベントを処理する関数
    function handleMontyHallEvent(player) {
        if (player.is_in_monty_hall) {
            // モーダルを表示して選択を促す
            montyHallContent.innerHTML = `
                <p>${player.name}はモンティ・ホールの挑戦に挑みます。</p>
                <p>1〜3の扉から1つを選んでください。</p>
                <button id="monty_choice_1">扉1</button>
                <button id="monty_choice_2">扉2</button>
                <button id="monty_choice_3">扉3</button>
            `;
            montyHallModal.style.display = 'block';

            // 扉の選択ボタンにイベントリスナーを追加
            document.getElementById('monty_choice_1').addEventListener('click', () => montyHallChoice(1));
            document.getElementById('monty_choice_2').addEventListener('click', () => montyHallChoice(2));
            document.getElementById('monty_choice_3').addEventListener('click', () => montyHallChoice(3));
        }
    }

    // モンティ・ホールで扉を選択したときの処理を行う関数
    function montyHallChoice(choice) {
        // サーバーに選択した扉を送信
        fetch('/monty_hall_choice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ choice: choice })
        })
        .then(response => response.json())
        .then(data => {
            appendMessage(data.message);
            montyHallContent.innerHTML = '';

            if (data.message.includes('選択を変更しますか？')) {
                // 選択を変更するかどうかを尋ねる画面を表示
                montyHallContent.innerHTML = `
                    <p>扉${data.opened_door}はハズレでした。</p>
                    <p>選択を変更しますか？</p>
                    <button id="monty_change_yes">はい</button>
                    <button id="monty_change_no">いいえ</button>
                `;
                document.getElementById('monty_change_yes').addEventListener('click', () => montyHallChange('yes'));
                document.getElementById('monty_change_no').addEventListener('click', () => montyHallChange('no'));
            } else {
                // 結果が出たらモーダルを閉じてゲーム状態を更新
                montyHallModal.style.display = 'none';
                getGameState();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('モンティ・ホールの挑戦中にエラーが発生しました。');
        });
    }

    // モンティ・ホールで選択を変更するかどうかの処理を行う関数
    function montyHallChange(change) {
        // サーバーに選択を変更するかどうかを送信
        fetch('/monty_hall_choice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ change: change })
        })
        .then(response => response.json())
        .then(data => {
            appendMessage(data.message);
            montyHallContent.innerHTML = '';
            montyHallModal.style.display = 'none';
            alert(data.message);  // 結果をアラートで表示します
            getGameState();  // ゲーム状態を更新
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('モンティ・ホールの挑戦中にエラーが発生しました。');
        });
    }

    // 迷路イベントを処理する関数
    function handleMazeEvent(player) {
        if (player.is_in_maze) {
            // 迷路の進行状況をサーバーから取得
            fetch('/maze_progress', {
                method: 'GET'
            })
            .then(response => response.json())
            .then(data => {
                // 迷路の内容をモーダルに表示
                mazeContent.innerHTML = data.message.replace(/\n/g, '<br>');
                mazeModal.style.display = 'block';
                getGameState();  // ゲーム状態を更新
            })
            .catch(error => {
                console.error('Error:', error);
                appendMessage('迷路の進行中にエラーが発生しました。');
            });
        }
    }

    // サイコロカスタマイズ用のモーダル要素を取得
    const diceCustomizationModal = document.getElementById('dice_customization_modal');
    const diceCustomizationForm = document.getElementById('dice_customization_form');
    const diceCustomizationClose = document.getElementById('dice_customization_close');

    // サイコロカスタマイズ用モーダルの閉じるボタンがクリックされたときの処理を設定
    diceCustomizationClose.addEventListener('click', () => {
        diceCustomizationModal.style.display = 'none';
    });

    // プレイヤーがサイコロをカスタマイズする必要があるかをチェックし、モーダルを表示する関数
    function checkDiceCustomization(player) {
        if (player.needs_dice_customization) {
            diceCustomizationModal.style.display = 'block';
        }
    }

    // サイコロカスタマイズフォームが送信されたときの処理を設定
    diceCustomizationForm.addEventListener('submit', (e) => {
        e.preventDefault();  // フォームのデフォルトの送信を防止

        // 入力された確率を取得します
        const probabilities = {};
        let total = 0;

        for (let i = 1; i <= 6; i++) {
            const value = parseFloat(document.getElementById(`face${i}`).value);
            probabilities[i] = value;
            total += value;
        }

        // 確率の合計が1か確認
        if (Math.abs(total - 1.0) > 0.01) {
            alert('確率の合計が1になるようにしてください。');
            return;
        }

        // サーバーにカスタマイズした確率を送信
        fetch('/set_custom_dice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ probabilities: probabilities })
        })
        .then(response => response.json())
        .then(data => {
            diceCustomizationModal.style.display = 'none';
            appendMessage(data.message);
            updateDiceProbabilities();  // サイコロの確率分布を更新
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('サイコロのカスタマイズ中にエラーが発生しました。');
        });
    });

    // モーダルの外側をクリックしたときにモーダルを閉じる処理を設定
    window.addEventListener('click', (event) => {
        if (event.target == montyHallModal) {
            montyHallModal.style.display = 'none';
        }
        if (event.target == mazeModal) {
            mazeModal.style.display = 'none';
        }
        if (event.target == diceCustomizationModal) {
            diceCustomizationModal.style.display = 'none';
        }
    });
});
