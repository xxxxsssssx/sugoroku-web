// utils.js

// ローディング表示を表示する関数
function showLoading() {
    loadingIndicator.style.display = 'block';
}

// ローディング表示を非表示にする関数
function hideLoading() {
    loadingIndicator.style.display = 'none';
}

// モーダルの外側をクリックしたときにモーダルを閉じる処理を設定
function closeModalsOnOutsideClick(event) {
    if (event.target == montyHallModal) {
        montyHallModal.style.display = 'none';
    }
    if (event.target == mazeModal) {
        mazeModal.style.display = 'none';
    }
    if (event.target == diceCustomizationModal) {
        diceCustomizationModal.style.display = 'none';
    }
}

// グローバル変数の宣言
let currentPlayerIndex = 0;
let isGameOver = false;
let diceChart = null;

// DOM要素の取得
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
const diceCustomizationModal = document.getElementById('dice_customization_modal');
const diceCustomizationForm = document.getElementById('dice_customization_form');
const diceCustomizationClose = document.getElementById('dice_customization_close');

// ボタンの初期状態を設定
nextTurnButton.disabled = true;
rollDiceButton.disabled = true;
