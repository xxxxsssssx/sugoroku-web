// ui.js

// ユーザーインターフェースの更新を行う関数をまとめたモジュール

// メッセージを表示する関数
function appendMessage(message) {
    const p = document.createElement('p');
    p.innerHTML = message;  // メッセージ内の改行などを反映
    messageArea.appendChild(p);
    // メッセージエリアを最新のメッセージまでスクロール
    messageArea.scrollTop = messageArea.scrollHeight;
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

// イベント説明の表示/非表示を切り替える関数
function toggleEventDescriptions() {
    if (eventDescriptionsDiv.style.display === 'none' || eventDescriptionsDiv.style.display === '') {
        // イベント説明を表示
        eventDescriptionsDiv.style.display = 'block';
        toggleEventDescriptionsButton.textContent = 'イベント説明を非表示';
    } else {
        // イベント説明を非表示
        eventDescriptionsDiv.style.display = 'none';
        toggleEventDescriptionsButton.textContent = 'イベント説明を表示';
    }
}

// サイコロの確率分布の表示/非表示を切り替える関数
function toggleDiceProbabilities() {
    if (diceProbabilitiesDiv.style.display === 'none' || diceProbabilitiesDiv.style.display === '') {
        // サイコロの確率分布を表示
        diceProbabilitiesDiv.style.display = 'block';
        toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を非表示';
    } else {
        // サイコロの確率分布を非表示
        diceProbabilitiesDiv.style.display = 'none';
        toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を表示';
    }
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
