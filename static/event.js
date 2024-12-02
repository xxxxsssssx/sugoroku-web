// events.js

// ゲーム内の各種イベントを処理する関数をまとめたモジュール

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
        alert(data.message);  // 結果をアラートで表示
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

// サイコロカスタマイズを処理する関数
function checkDiceCustomization(player) {
    if (player.needs_dice_customization) {
        diceCustomizationModal.style.display = 'block';
    }
}

// サイコロカスタマイズフォームが送信されたときの処理を設定
diceCustomizationForm.addEventListener('submit', (e) => {
    e.preventDefault();  // フォームのデフォルトの送信を防止

    // 入力された確率を取得
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
