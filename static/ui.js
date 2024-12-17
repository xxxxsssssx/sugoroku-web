// ui.js

// プレイヤー情報を更新して表示する関数
function updatePlayerInfo(players) {
    playerInfoDiv.innerHTML = '';  // プレイヤー情報エリアをクリアします

    players.forEach((player, index) => {
        const div = document.createElement('div');
        div.classList.add('player-info');

        // プレイヤーのキャラクター画像を表示します
        const img = document.createElement('img');
        img.src = `/static/images/avatars/${player.character}`;
        img.alt = player.name;
        img.width = 50;  // 画像の幅を設定します
        img.height = 50;  // 画像の高さを設定します

        // プレイヤー名を表示します
        const nameP = document.createElement('p');
        nameP.textContent = player.name;
        if (index === currentPlayerIndex) {
            // 現在のプレイヤーを強調表示します
            nameP.style.fontWeight = 'bold';
            nameP.style.color = 'red';
        }

        // プレイヤーの残りマス数を表示します
        const remainingSteps = 39 - player.position;  // ゴールまでの残りマス数を計算します
        const stepsP = document.createElement('p');
        stepsP.textContent = `残りマス数: ${remainingSteps}`;

        // 要素を組み立てて表示します
        div.appendChild(img);
        div.appendChild(nameP);
        div.appendChild(stepsP);
        playerInfoDiv.appendChild(div);
    });
}

// サイコロの確率分布を更新して表示する関数
function updateDiceProbabilities() {
    fetch('/get_dice_probabilities')
    .then(response => response.json())
    .then(data => {
        const probs = data.probabilities;  // サイコロの確率を取得します
        const labels = [];  // チャートのラベルを格納する配列
        const values = [];  // チャートのデータを格納する配列

        // サイコロの目ごとにラベルと値を設定します
        for (const face of Object.keys(probs)) {
            labels.push(`目${face}`);
            values.push(probs[face] * 100);  // パーセンテージに変換します
        }

        // データの最大値を取得します
        const maxValue = Math.max(...values);

        // 既にチャートが存在する場合はデータを更新します
        if (diceChart) {
            diceChart.data.labels = labels;
            diceChart.data.datasets[0].data = values;
            diceChart.options.scales.r.suggestedMax = Math.ceil(maxValue / 10) * 10;  // 最大値を調整します
            diceChart.update();
        } else {
            // 新しくチャートを作成します
            const ctx = diceChartCanvas.getContext('2d');
            diceChart = new Chart(ctx, {
                type: 'radar',  // レーダーチャートを使用します
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
                            suggestedMax: Math.ceil(maxValue / 10) * 10  // 最大値を調整します
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    })
    .catch(error => {
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
    ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);  // キャンバスをクリアします

    // イベントのあるマスの情報をサーバーから取得します
    fetch('/get_event_positions')
    .then(response => response.json())
    .then(data => {
        const eventPositions = data.event_positions;

        // ボードの各マスを描画します
        for (let i = 0; i < 40; i++) {
            const row = Math.floor(i / cols);
            let col = i % cols;

            // ジグザグに進むための列の調整
            if (row % 2 === 1) {
                col = cols - 1 - col;
            }

            const x = col * cellSize;
            const y = row * cellSize;

            // マスの枠を描画します
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x, y, cellSize, cellSize);

            // イベントのあるマスの背景色を設定します
            const eventCell = eventPositions.find(event => event.position === i);
            if (eventCell) {
                // イベントごとに背景色を設定します
                switch (eventCell.event_name) {
                    case '2マス進む':
                    case '5マス進む':
                        ctx.fillStyle = '#d1e7dd';  // 緑系
                        break;
                    case '3マス戻る':
                    case '4マス戻る':
                        ctx.fillStyle = '#f8d7da';  // 赤系
                        break;
                    case 'サイコロ選択':
                        ctx.fillStyle = '#fff3cd';  // 黄系
                        break;
                    case '確率の迷路':
                        ctx.fillStyle = '#cfe2ff';  // 青系
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

            // マス番号を描画します
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.fillText(i, x + 5, y + 15);
        }

        // プレイヤーの位置を描画します
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

            // プレイヤーのキャラクター画像を描画します
            let img = new Image();
            img.src = `/static/images/avatars/${player.character}`;
            img.onload = function() {
                ctx.drawImage(img, x - 15, y - 15, 30, 30);  // 画像を中央に描画します
            };
        });
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage(`ゲームボードの更新中にエラーが発生しました：${error.message}`);
    });
}


// キャラクター選択フォームを更新して表示する関数
function updateCharacterSelection() {
    const numPlayers = parseInt(numPlayersSelect.value);  // 選択されたプレイヤー人数を取得します
    const characterSelectionDiv = document.getElementById('character_selection');
    characterSelectionDiv.innerHTML = '';  // キャラクター選択エリアをクリアします

    for (let i = 0; i < numPlayers; i++) {
        // ラベルを作成します
        const label = document.createElement('label');
        label.textContent = `プレイヤー${i + 1}のキャラクター: `;

        // セレクトボックスを作成します
        const select = document.createElement('select');
        select.classList.add('character-select');

        // アバターのオプションを追加します
        const avatars = ['avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar4.png'];
        avatars.forEach(avatar => {
            const option = document.createElement('option');
            option.value = avatar;
            option.textContent = avatar.split('.')[0];  // 拡張子を除いた名前
            select.appendChild(option);
        });

        // 要素を組み立てて表示します
        characterSelectionDiv.appendChild(label);
        characterSelectionDiv.appendChild(select);
        characterSelectionDiv.appendChild(document.createElement('br'));
    }
}
