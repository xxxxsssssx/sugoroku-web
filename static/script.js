// script.js
// script.js

document.addEventListener('DOMContentLoaded', () => {
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
    const montyHallModal = document.getElementById('monty_hall_modal');
    const montyHallContent = document.getElementById('monty_hall_content');
    const montyHallCloseButton = document.getElementById('monty_hall_close_button');
    const mazeModal = document.getElementById('maze_modal');
    const mazeContent = document.getElementById('maze_content');
    const mazeCloseButton = document.getElementById('maze_close_button');
    const diceSelectionModal = document.getElementById('dice_selection_modal');
    const diceSelectionContent = document.getElementById('dice_selection_content');
    const diceSelectionClose = document.getElementById('dice_selection_close');

    const slotSelectionModal = document.getElementById('slot_selection_modal');
    const slotSelectionContent = document.getElementById('slot_selection_content');
    const slotSelectionClose = document.getElementById('slot_selection_close');
    slotSelectionClose.addEventListener('click', () => {
        slotSelectionModal.style.display = 'none';
    });

    nextTurnButton.disabled = true;
    rollDiceButton.disabled = true;

    let currentPlayerIndex = 0;
    let isGameOver = false;
    let diceChart = null;

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
            headers: {
                'Content-Type': 'application/json'
            },
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

            // ここではイベント発動チェックしない。後でgetGameStateで確認する

            rollDiceButton.disabled = true;
            nextTurnButton.disabled = false;

            // rollDice後、最新状態取得してイベント表示を行う
            getGameState().then(() => {
                // getGameState後にイベントチェックするため、getGameState内でイベントチェック
            });
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

    // getGameStateをPromiseで返す
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

            // ### 変更箇所：ここでイベントをチェック ###
            // 優先度：モンティホール > 迷路 > サイコロ選択 > スロットイベント
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

            // 他のイベントがなければスロットイベントを確認
            if (data.is_slot_event_active) {
                handleSlotEvent();
            }
            // ### 変更終了 ###

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
                labels.push(`目${face}`);
                values.push(probs[face] * 100);
            }

            const maxValue = Math.max(...values);

            if (diceChart) {
                diceChart.data.labels = labels;
                diceChart.data.datasets[0].data = values;
                diceChart.options.scales.r.suggestedMax = Math.ceil(maxValue / 10) * 10;
                diceChart.update();
            } else {
                const ctx = diceChartCanvas.getContext('2d');
                diceChart = new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'サイコロの確率（％）',
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
                                suggestedMax: Math.ceil(maxValue / 10) * 10
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

            // getGameState後のイベントチェックはgetGameState内で行うのでここでは不要
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

                const eventCell = eventPositions.find(event => event.position === i);
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

    function handleMontyHallEvent(player) {
        if (player.is_in_monty_hall) {
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

            if (data.message.includes('選択を変更しますか？')) {
                montyHallContent.innerHTML = `
                    <p>選択を変更しますか？</p>
                    <button id="monty_change_yes">はい</button>
                    <button id="monty_change_no">いいえ</button>
                `;
                document.getElementById('monty_change_yes').addEventListener('click', () => montyHallChange('yes'));
                document.getElementById('monty_change_no').addEventListener('click', () => montyHallChange('no'));
            } else {
                montyHallModal.style.display = 'none';
                getGameState();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('モンティ・ホールの挑戦中にエラーが発生しました。');
        });
    }

    function montyHallChange(change) {
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
            alert(data.message);
            getGameState();
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('モンティ・ホールの挑戦中にエラーが発生しました。');
        });
    }

    function handleMazeEvent(player) {
        if (player.is_in_maze) {
            fetch('/maze_progress', {
                method: 'GET'
            })
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
            mazeModal.style.display = 'none';
            getGameState();
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('迷路の選択中にエラーが発生しました。');
        });
    }

    function handleDiceSelectionEvent(player) {
        if (player.needs_dice_selection) {
            fetch('/get_dice_options', {
                method: 'GET'
            })
            .then(response => response.json())
            .then(data => {
                diceSelectionContent.innerHTML = `<p>${player.name}はサイコロを選択できます。以下のサイコロから1つを選んでください。</p>`;
                data.dice_options.forEach((diceOption, index) => {
                    let probText = "";
                    if (diceOption.probabilities && Object.keys(diceOption.probabilities).length > 0) {
                        probText = "<p>出目の確率:</p><ul>";
                        for (const [face, prob] of Object.entries(diceOption.probabilities)) {
                            probText += `<li>${face}: ${(prob * 100).toFixed(1)}%</li>`;
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
            diceSelectionModal.style.display = 'none';
            updateDiceProbabilities();
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('サイコロの選択中にエラーが発生しました。');
        });
    }

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
            slotSelectionModal.style.display = 'none';
            getGameState();
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('スロット回転中にエラーが発生しました。');
        });
    }

    updateCharacterSelection();
});
