// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 既存の要素取得 ---
    const setupDiv = document.getElementById('setup');
    const gameArea = document.getElementById('game_area');
    const startGameButton = document.getElementById('start_game_button');
    const numPlayersSelect = document.getElementById('num_players');
    const messageArea = document.getElementById('message_area');
    const playerInfoDiv = document.getElementById('player_info');
    const nextTurnButton = document.getElementById('next_turn_button');
    const rollDiceButton = document.getElementById('roll_dice_button');
    const gameBoard = document.getElementById('game_board');
    const ctx = gameBoard.getContext('2d');
    const loadingIndicator = document.getElementById('loading_indicator');
    const toggleEventDescriptionsButton = document.getElementById('toggle_event_descriptions_button');
    const eventDescriptionsDiv = document.getElementById('event_descriptions');
    const diceChartCanvas = document.getElementById('dice_chart');
    const toggleDiceProbabilitiesButton = document.getElementById('toggle_dice_probabilities_button');
    const diceProbabilitiesDiv = document.getElementById('dice_probabilities');

    // --- 既存のモンティホール・迷路・サイコロ選択用モーダル要素 ---
    const montyHallModal = document.getElementById('monty_hall_modal');
    const montyHallContent = document.getElementById('monty_hall_content');
    const montyHallCloseButton = document.getElementById('monty_hall_close_button');
    const mazeModal = document.getElementById('maze_modal');
    const mazeContent = document.getElementById('maze_content');
    const mazeCloseButton = document.getElementById('maze_close_button');
    const diceSelectionModal = document.getElementById('dice_selection_modal');
    const diceSelectionContent = document.getElementById('dice_selection_content');
    const diceSelectionClose = document.getElementById('dice_selection_close');

    // --- スロットイベント用モーダル ---
    const slotSelectionModal = document.getElementById('slot_selection_modal');
    const slotSelectionContent = document.getElementById('slot_selection_content');
    const slotSelectionClose = document.getElementById('slot_selection_close');
    slotSelectionClose.addEventListener('click', () => {
        slotSelectionModal.style.display = 'none';
    });

    // === 変更開始: 解説表示用モーダルの要素を取得 ===
    const explanationModal = document.getElementById('explanation_modal');
    const explanationContent = document.getElementById('explanation_content');
    const explanationCloseButton = document.getElementById('explanation_close_button');

    // モーダル外クリック・閉じるボタンで閉じる
    explanationCloseButton.addEventListener('click', () => {
        explanationModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target === explanationModal) {
            explanationModal.style.display = 'none';
        }
    });
    // === 変更終了 ===

    nextTurnButton.disabled = true;
    rollDiceButton.disabled = true;

    let currentPlayerIndex = 0;
    let isGameOver = false;
    let diceChart = null;

    // === 変更開始: イベント解説文マッピング ===
    const eventExplanations = {
        "MontyHall": `
            <h2>モンティ・ホール問題の解説</h2>
            <p>3つの扉から1つを選んだあと、ハズレ扉を開ける司会者が登場します。
            実は扉を変更すると約2/3で当たりになる不思議な問題です！</p>
        `,
        "Maze": `
            <h2>確率の迷路の解説</h2>
            <p>分岐した道ごとに確率が設定されており、トータルで何%でゴールに行けるか
            計算する例として学べます。</p>
        `,
        "SlotMachine": `
            <h2>スロットイベントの解説</h2>
            <p>大当たりやハズレを確率的に引くスロットマシン。
            期待値を考えて、どのスロットを選ぶか戦略的に考えるきっかけになります。</p>
        `,
        "DiceSelection": `
            <h2>サイコロ選択の解説</h2>
            <p>偏ったサイコロがあるかもしれません。何度か試行して出目の傾向を観察すると、
            「確率を推定する」感覚が学べます。</p>
        `
    };

    // 解説を表示する関数
    function showEventExplanation(eventKey) {
        const explanationHtml = eventExplanations[eventKey];
        if (!explanationHtml) return;
        explanationContent.innerHTML = explanationHtml;
        explanationModal.style.display = 'block';
    }
    // === 変更終了 ===

    numPlayersSelect.addEventListener('change', updateCharacterSelection);

    startGameButton.addEventListener('click', () => {
        const numPlayers = parseInt(numPlayersSelect.value);
        const selectedCharacters = [];
        const characterSelects = document.querySelectorAll('.character-select');
        characterSelects.forEach(select => {
            selectedCharacters.push(select.value);
        });

        fetch('/start_game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ num_players: numPlayers, characters: selectedCharacters })
        })
        .then(response => {
            hideLoading();
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                }).catch(() => {
                    throw new Error('サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            setupDiv.style.display = 'none';
            gameArea.style.display = 'block';
            appendMessage(data.message);
            getGameState().then(() => {
                nextPlayerTurn();
            });
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            appendMessage(`ゲームの開始中にエラーが発生しました：${error.message}`);
        });
    });

    nextTurnButton.addEventListener('click', () => {
        if (isGameOver) {
            appendMessage("ゲームは終了しました。");
            nextTurnButton.disabled = true;
            rollDiceButton.disabled = true;
            return;
        }
        nextPlayerTurn();
    });

    rollDiceButton.addEventListener('click', () => {
        showLoading();
        fetch('/roll_dice', {
            method: 'POST'
        })
        .then(response => {
            hideLoading();
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                }).catch(() => {
                    throw new Error('サーバーエラー');
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

            rollDiceButton.disabled = true;
            nextTurnButton.disabled = false;

            // サイコロ振った後ゲーム状態再取得
            getGameState().then(() => {});
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            appendMessage(`サイコロの振動中にエラーが発生しました：${error.message}`);
        });
    });

    toggleDiceProbabilitiesButton.addEventListener('click', () => {
        if (diceProbabilitiesDiv.style.display === 'none' || diceProbabilitiesDiv.style.display === '') {
            diceProbabilitiesDiv.style.display = 'block';
            toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を非表示';
        } else {
            diceProbabilitiesDiv.style.display = 'none';
            toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を表示';
        }
    });
    toggleDiceProbabilitiesButton.textContent = 'サイコロの確率分布を表示';

    function showLoading() {
        loadingIndicator.style.display = 'block';
    }
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }
    function appendMessage(message) {
        const p = document.createElement('p');
        p.innerHTML = message;
        messageArea.appendChild(p);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // サイコロの分数表示用関数
    function toFraction(decimal) {
        const denominator = 6;
        const numerator = Math.round(decimal * denominator);
        return `${numerator}/${denominator}`;
    }

    // ゲーム状態を取得
    function getGameState() {
        return fetch('/get_game_state')
        .then(response => {
            hideLoading();
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                }).catch(() => {
                    throw new Error('サーバーエラー');
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

            // イベント優先度: MontyHall > Maze > DiceSelection > Slot
            const player = data.players[currentPlayerIndex];
            if (player.is_in_monty_hall) {
                handleMontyHallEvent(player);
                return;
            }
            if (player.is_in_maze) {
                handleMazeEvent(player);
                return;
            }
            if (player.needs_dice_selection) {
                handleDiceSelectionEvent(player);
                return;
            }
            if (data.is_slot_event_active) {
                handleSlotEvent();
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            appendMessage(`ゲーム状態の取得中にエラーが発生しました：${error.message}`);
        });
    }

    function updatePlayerInfo(players) {
        playerInfoDiv.innerHTML = '';
        players.forEach((player, index) => {
            const div = document.createElement('div');
            div.classList.add('player-info');

            const img = document.createElement('img');
            img.src = `/static/images/avatars/${player.character}`;
            img.alt = player.name;
            img.width = 50;
            img.height = 50;

            const nameP = document.createElement('p');
            nameP.textContent = player.name;
            if (index === currentPlayerIndex) {
                nameP.style.fontWeight = 'bold';
                nameP.style.color = 'red';
            }
            const remainingSteps = 39 - player.position;
            const stepsP = document.createElement('p');
            stepsP.textContent = `ループ地点までのマス数: ${remainingSteps}`;

            div.appendChild(img);
            div.appendChild(nameP);
            div.appendChild(stepsP);
            playerInfoDiv.appendChild(div);
        });
    }

    function updateDiceProbabilities() {
        fetch('/get_dice_probabilities')
        .then(response => {
            hideLoading();
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                }).catch(() => {
                    throw new Error('サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            const probs = data.probabilities;
            const labels = [];
            const values = [];

            for (const face of Object.keys(probs)) {
                const frac = toFraction(probs[face]);
                labels.push(`目${face} (${frac})`);
                values.push(probs[face] * 100);
            }
            const maxValue = Math.max(...values);

            if (diceChart) {
                diceChart.data.labels = labels;
                diceChart.data.datasets[0].data = values;
                diceChart.options.scales.r.suggestedMax = Math.ceil(maxValue / 10) * 10;
                // ツールチップで分数を表示
                diceChart.options.plugins.tooltip = {
                    callbacks: {
                        label: function(context) {
                            const faceIndex = context.dataIndex;
                            const match = labels[faceIndex].match(/\((.*)\)/);
                            return match ? `確率: ${match[1]}` : '確率: 不明';
                        }
                    }
                };
                diceChart.update();
            } else {
                const ctx = diceChartCanvas.getContext('2d');
                diceChart = new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'サイコロの確率',
                            data: values,
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            r: {
                                angleLines: { display: true },
                                suggestedMin: 0,
                                suggestedMax: Math.ceil(maxValue / 10) * 10,
                                // レーダー軸目盛を消したいなら：
                                // ticks: { display: false }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const faceIndex = context.dataIndex;
                                        const match = labels[faceIndex].match(/\((.*)\)/);
                                        return match ? `確率: ${match[1]}` : '確率: 不明';
                                    }
                                }
                            }
                        },
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            appendMessage(`サイコロの確率情報の取得中にエラーが発生しました：${error.message}`);
        });
    }

    function fetchEventDescriptions() {
        fetch('/get_event_descriptions')
        .then(response => {
            hideLoading();
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                }).catch(() => {
                    throw new Error('サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
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
            appendMessage(`イベントの説明を取得中にエラーが発生しました：${error.message}`);
        });
    }

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
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                }).catch(() => {
                    throw new Error('サーバーエラー');
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
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            appendMessage(`次のターンへの移行中にエラーが発生しました：${error.message}`);
        });
    }

    function updateGameBoard(players) {
        const cellSize = 70;
        const cols = 10;
        const rows = 4;
        ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);

        fetch('/get_event_positions')
        .then(response => {
            hideLoading();
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'サーバーエラー');
                }).catch(() => {
                    throw new Error('サーバーエラー');
                });
            }
            return response.json();
        })
        .then(data => {
            const eventPositions = data.event_positions;
            for (let i = 0; i < 40; i++) {
                const row = Math.floor(i / cols);
                let col = i % cols;
                if (row % 2 === 1) {
                    col = cols - 1 - col;
                }

                const x = col * cellSize;
                const y = row * cellSize;
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x, y, cellSize, cellSize);

                const eventCell = eventPositions.find(e => e.position === i);
                if (eventCell) {
                    switch (eventCell.event_name) {
                        case '2マス進む':
                        case '5マス進む':
                            ctx.fillStyle = '#d1e7dd';
                            break;
                        case '3マス戻る':
                        case '4マス戻る':
                            ctx.fillStyle = '#f8d7da';
                            break;
                        case 'サイコロ選択':
                            ctx.fillStyle = '#fff3cd';
                            break;
                        case '確率の迷路':
                            ctx.fillStyle = '#cfe2ff';
                            break;
                        case 'モンティ・ホールの挑戦':
                            ctx.fillStyle = '#e2e3e5';
                            break;
                        case '全員参加スロットイベント':
                            ctx.fillStyle = '#f5e6ff';
                            break;
                        default:
                            ctx.fillStyle = 'white';
                    }
                    ctx.fillRect(x, y, cellSize, cellSize);
                } else {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(x, y, cellSize, cellSize);
                }
                ctx.fillStyle = 'black';
                ctx.font = '12px Arial';
                ctx.fillText(i, x + 5, y + 15);
            }

            players.forEach((player, index) => {
                const position = player.position;
                const row = Math.floor(position / cols);
                let col = position % cols;
                if (row % 2 === 1) {
                    col = cols - 1 - col;
                }
                const x = col * cellSize + cellSize / 2;
                const y = row * cellSize + cellSize / 2;
                let img = new Image();
                img.src = `/static/images/avatars/${player.character}`;
                img.onload = function() {
                    ctx.drawImage(img, x - 15, y - 15, 30, 30);
                };
            });
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            appendMessage(`ゲームボードの更新中にエラーが発生しました：${error.message}`);
        });
    }

    function updateCharacterSelection() {
        const numPlayers = parseInt(numPlayersSelect.value);
        const characterSelectionDiv = document.getElementById('character_selection');
        characterSelectionDiv.innerHTML = '';

        for (let i = 0; i < numPlayers; i++) {
            const label = document.createElement('label');
            label.textContent = `プレイヤー${i + 1}のキャラクター: `;

            const select = document.createElement('select');
            select.classList.add('character-select');

            const avatars = ['avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar4.png'];
            avatars.forEach(avatar => {
                const option = document.createElement('option');
                option.value = avatar;
                option.textContent = avatar.split('.')[0];
                select.appendChild(option);
            });

            characterSelectionDiv.appendChild(label);
            characterSelectionDiv.appendChild(select);
            characterSelectionDiv.appendChild(document.createElement('br'));
        }
    }
    updateCharacterSelection();

    toggleEventDescriptionsButton.addEventListener('click', () => {
        if (eventDescriptionsDiv.style.display === 'none' || eventDescriptionsDiv.style.display === '') {
            eventDescriptionsDiv.style.display = 'block';
            toggleEventDescriptionsButton.textContent = 'イベント説明を非表示';
        } else {
            eventDescriptionsDiv.style.display = 'none';
            toggleEventDescriptionsButton.textContent = 'イベント説明を表示';
        }
    });

    montyHallCloseButton.addEventListener('click', () => {
        montyHallModal.style.display = 'none';
    });
    mazeCloseButton.addEventListener('click', () => {
        mazeModal.style.display = 'none';
    });
    diceSelectionClose.addEventListener('click', () => {
        diceSelectionModal.style.display = 'none';
    });

    // --- モンティホール ---
    function handleMontyHallEvent(player) {
        if (!player.is_in_monty_hall) return;
        montyHallContent.innerHTML = `
            <p>${player.name}はモンティ・ホールの挑戦に挑みます。</p>
            <p>1〜3の扉から1つを選んでください。</p>
            <button id="monty_choice_1">扉1</button>
            <button id="monty_choice_2">扉2</button>
            <button id="monty_choice_3">扉3</button>
        `;
        montyHallModal.style.display = 'block';
        document.getElementById('monty_choice_1').addEventListener('click', () => montyHallChoice(1));
        document.getElementById('monty_choice_2').addEventListener('click', () => montyHallChoice(2));
        document.getElementById('monty_choice_3').addEventListener('click', () => montyHallChoice(3));
    }
    function montyHallChoice(choice) {
        fetch('/monty_hall_choice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ choice: choice })
        })
        .then(response => response.json())
        .then(data => {
            appendMessage(data.message);
            montyHallContent.innerHTML = '';
            // イベント終了の文字列を検知して解説表示
            if (data.message.includes('おめでとうございます') || data.message.includes('残念！ハズレ')) {
                showEventExplanation("MontyHall"); // ここで解説を表示
            }
            montyHallModal.style.display = 'none';
            getGameState();
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('モンティ・ホールの挑戦中にエラーが発生しました。');
        });
    }

    // --- 迷路 ---
    function handleMazeEvent(player) {
        if (!player.is_in_maze) return;
        fetch('/maze_progress', { method: 'GET' })
        .then(response => response.json())
        .then(data => {
            mazeContent.innerHTML = `<p>${data.message}</p>`;
            data.choices.forEach(choice => {
                mazeContent.innerHTML += `
                    <button class="maze-choice" data-index="${choice.index}">
                        ${choice.description} (成功確率: ${(choice.probability * 100).toFixed(1)}%)
                    </button>
                `;
            });
            mazeModal.style.display = 'block';
            document.querySelectorAll('.maze-choice').forEach(button => {
                button.addEventListener('click', () => {
                    const choiceIndex = parseInt(button.getAttribute('data-index'));
                    makeMazeChoice(choiceIndex);
                });
            });
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('迷路の進行中にエラーが発生しました。');
        });
    }
    function makeMazeChoice(choiceIndex) {
        fetch('/maze_progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ choice_index: choiceIndex })
        })
        .then(response => response.json())
        .then(data => {
            appendMessage(data.message);
            // イベント終了ワード
            if (data.message.includes('迷路を突破') || data.message.includes('迷路で迷い')) {
                showEventExplanation("Maze");
            }
            mazeModal.style.display = 'none';
            getGameState();
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('迷路の選択中にエラーが発生しました。');
        });
    }

    // --- サイコロ選択 ---
    function handleDiceSelectionEvent(player) {
        if (!player.needs_dice_selection) return;
        fetch('/get_dice_options')
        .then(response => response.json())
        .then(data => {
            diceSelectionContent.innerHTML = `<p>${player.name}はサイコロを選択できます。以下から1つを選んでください。</p>`;
            data.dice_options.forEach((diceOption, index) => {
                let probText = "";
                if (diceOption.probabilities && Object.keys(diceOption.probabilities).length > 0) {
                    probText = "<p>出目の確率:</p><ul>";
                    for (const [face, prob] of Object.entries(diceOption.probabilities)) {
                        probText += `<li>目${face}: ${toFraction(prob)}</li>`;
                    }
                    probText += "</ul>";
                } else {
                    probText = "<p>出目の確率は不明です。振ってみて推測しよう！</p>";
                }
                diceSelectionContent.innerHTML += `
                    <div class="dice-option">
                        <h3>${diceOption.name}</h3>
                        <p>${diceOption.description}</p>
                        ${probText}
                        <button class="select-dice-button" data-index="${index}">このサイコロを選ぶ</button>
                    </div>
                `;
            });
            diceSelectionModal.style.display = 'block';
            document.querySelectorAll('.select-dice-button').forEach(button => {
                button.addEventListener('click', () => {
                    const diceIndex = parseInt(button.getAttribute('data-index'));
                    selectDice(diceIndex);
                });
            });
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('サイコロの選択中にエラーが発生しました。');
        });
    }
    function selectDice(diceIndex) {
        fetch('/select_dice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dice_index: diceIndex })
        })
        .then(response => response.json())
        .then(data => {
            appendMessage(data.message);
            // イベント終了とみなして解説表示
            showEventExplanation("DiceSelection");

            diceSelectionModal.style.display = 'none';
            updateDiceProbabilities();
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('サイコロの選択中にエラーが発生しました。');
        });
    }

    // --- スロットイベント ---
    function handleSlotEvent() {
        fetch('/get_slot_options')
        .then(response => response.json())
        .then(data => {
            slotSelectionContent.innerHTML = "<p>スロットを選んでください。</p>";
            data.slot_options.forEach(slotOption => {
                slotSelectionContent.innerHTML += `
                    <div class="slot-option">
                        <h3>${slotOption.name}</h3>
                        <p>${slotOption.description}</p>
                        <button class="select-slot-button" data-index="${slotOption.index}">このスロットを回す</button>
                    </div>
                `;
            });
            slotSelectionModal.style.display = 'block';

            document.querySelectorAll('.select-slot-button').forEach(button => {
                button.addEventListener('click', () => {
                    const slotIndex = parseInt(button.getAttribute('data-index'));
                    spinSlot(slotIndex);
                });
            });
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('スロットオプション取得中にエラーが発生しました。');
        });
    }
    function spinSlot(slotIndex) {
        fetch('/spin_slot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot_index: slotIndex })
        })
        .then(response => response.json())
        .then(data => {
            appendMessage(data.message);
            // 全員スロット終了が含まれるなら解説を表示
            if (data.message.includes('全員スロット終了')) {
                showEventExplanation("SlotMachine");
            }
            slotSelectionModal.style.display = 'none';
            getGameState();
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('スロット回転中にエラーが発生しました。');
        });
    }

    // モーダル外クリック時の閉じる処理
    window.addEventListener('click', (event) => {
        if (event.target === montyHallModal) {
            montyHallModal.style.display = 'none';
        }
        if (event.target === mazeModal) {
            mazeModal.style.display = 'none';
        }
        if (event.target === diceSelectionModal) {
            diceSelectionModal.style.display = 'none';
        }
        if (event.target === slotSelectionModal) {
            slotSelectionModal.style.display = 'none';
        }
        if (event.target === explanationModal) {
            explanationModal.style.display = 'none';
        }
    });

    updateCharacterSelection();
});
