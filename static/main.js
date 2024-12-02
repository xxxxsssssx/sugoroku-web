// main.js

// ページの読み込みが完了したときに実行される関数を登録
document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    // DOM要素の取得は elements.js で行う
    // グローバル変数の定義
    currentPlayerIndex = 0;
    isGameOver = false;
    diceChart = null;

    // 初期表示のためにキャラクター選択フォームを更新
    updateCharacterSelection();

    // プレイヤー人数の選択が変更されたときにキャラクター選択フォームを更新
    numPlayersSelect.addEventListener('change', updateCharacterSelection);

    // ゲーム開始ボタンがクリックされたときの処理を設定
    startGameButton.addEventListener('click', startGame);

    // 次のプレイヤーのターンボタンがクリックされたときの処理を設定
    nextTurnButton.addEventListener('click', nextPlayerTurn);

    // サイコロを振るボタンがクリックされたときの処理を設定
    rollDiceButton.addEventListener('click', rollDice);

    // サイコロの確率分布の表示/非表示ボタンのイベントリスナーを設定
    toggleDiceProbabilitiesButton.addEventListener('click', toggleDiceProbabilities);

    // イベント説明の表示/非表示ボタンのイベントリスナーを設定
    toggleEventDescriptionsButton.addEventListener('click', toggleEventDescriptions);

    // モーダルの閉じるボタンのイベントリスナーを設定
    montyHallCloseButton.addEventListener('click', () => {
        montyHallModal.style.display = 'none';
    });
    mazeCloseButton.addEventListener('click', () => {
        mazeModal.style.display = 'none';
    });
    diceCustomizationClose.addEventListener('click', () => {
        diceCustomizationModal.style.display = 'none';
    });

    // モーダルの外側をクリックしたときにモーダルを閉じる処理を設定
    window.addEventListener('click', closeModalsOnOutsideClick);
});
