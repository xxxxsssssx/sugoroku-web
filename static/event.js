// events.js

// モンティ・ホールイベントを処理する関数
function handleMontyHallEvent(player) {
    if (player.is_in_monty_hall) {
        // モーダルを表示して選択を促します
        montyHallContent.innerHTML = `
            <p>${player.name}はモンティ・ホールの挑戦に挑みます。</p>
            <p>1〜3の扉から1つを選んでください。</p>
            <button id="monty_choice_1">扉1</button>
            <button id="monty_choice_2">扉2</button>
            <button id="monty_choice_3">扉3</button>
        `;
        montyHallModal.style.display = 'block';

        // 扉の選択ボタンにイベントリスナーを追加します
        document.getElementById('monty_choice_1').addEventListener('click', () => montyHallChoice(1));
        document.getElementById('monty_choice_2').addEventListener('click', () => montyHallChoice(2));
        document.getElementById('monty_choice_3').addEventListener('click', () => montyHallChoice(3));
    }
}

// モンティ・ホールで扉を選択したときの処理を行う関数
function montyHallChoice(choice) {
    // サーバーに選択した扉を送信します
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
            // 選択を変更するかどうかを尋ねる画面を表示します
            montyHallContent.innerHTML = `
                <p>扉${data.opened_door}はハズレでした。</p>
                <p>選択を変更しますか？</p>
                <button id="monty_change_yes">はい</button>
                <button id="monty_change_no">いいえ</button>
            `;
            document.getElementById('monty_change_yes').addEventListener('click', () => montyHallChange('はい'));
            document.getElementById('monty_change_no').addEventListener('click', () => montyHallChange('いいえ'));
        } else {
            // 結果が出たらモーダルを閉じてゲーム状態を更新します
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
    // サーバーに選択を変更するかどうかを送信します
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
        getGameState();  // ゲーム状態を更新します
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage('モンティ・ホールの挑戦中にエラーが発生しました。');
    });
}

// 迷路イベントを処理する関数
function handleMazeEvent(player) {
    if (player.is_in_maze) {
        // 迷路の進行状況をサーバーから取得します
        fetch('/maze_progress', {
            method: 'GET'
        })
        .then(response => response.json())
        .then(data => {
            // 迷路の内容をモーダルに表示します
            mazeContent.innerHTML = `<p>${data.message}</p>`;
            data.choices.forEach(choice => {
                mazeContent.innerHTML += `
                    <button class="maze-choice" data-index="${choice.index}">
                        ${choice.description} (成功確率: ${(choice.probability * 100).toFixed(1)}%)
                    </button>
                `;
            });
            mazeModal.style.display = 'block';

            // 選択肢のボタンにイベントリスナーを追加
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

// プレイヤーが迷路で選択肢を選んだときの処理
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
        getGameState();  // ゲーム状態を更新します
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage('迷路の選択中にエラーが発生しました。');
    });
}

// サイコロ選択イベントを処理する関数
function handleDiceSelectionEvent(player) {
    if (player.needs_dice_selection) {
        // サーバーからサイコロの選択肢を取得します
        fetch('/get_dice_options', {
            method: 'GET'
        })
        .then(response => response.json())
        .then(data => {
            diceSelectionContent.innerHTML = `<p>${player.name}はサイコロを選択できます。以下のサイコロから1つを選んでください。</p>`;
            data.dice_options.forEach((diceOption, index) => {
                diceSelectionContent.innerHTML += `
                    <div class="dice-option">
                        <h3>${diceOption.name}</h3>
                        <p>${diceOption.description}</p>
                        <p>出目の確率:</p>
                        <ul>
                            ${Object.entries(diceOption.probabilities).map(([face, prob]) => `<li>${face}: ${(prob * 100).toFixed(1)}%</li>`).join('')}
                        </ul>
                        <button class="select-dice-button" data-index="${index}">このサイコロを選ぶ</button>
                    </div>
                `;
            });
            diceSelectionModal.style.display = 'block';

            // 選択ボタンにイベントリスナーを追加
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

// プレイヤーがサイコロを選択したときの処理
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
        updateDiceProbabilities();  // サイコロの確率分布を更新します
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage('サイコロの選択中にエラーが発生しました。');
    });
}
