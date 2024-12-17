// dom.js

// --- 要素の取得 ---

// ゲーム開始前の設定画面の要素を取得します
const setupDiv = document.getElementById('setup');

// ゲーム画面の要素を取得します
const gameArea = document.getElementById('game_area');

// ゲーム開始ボタンの要素を取得します
const startGameButton = document.getElementById('start_game_button');

// プレイヤー人数を選択するセレクトボックスの要素を取得します
const numPlayersSelect = document.getElementById('num_players');

// メッセージを表示するエリアの要素を取得します
const messageArea = document.getElementById('message_area');

// プレイヤー情報を表示するエリアの要素を取得します
const playerInfoDiv = document.getElementById('player_info');

// 次のプレイヤーのターンボタンの要素を取得します
const nextTurnButton = document.getElementById('next_turn_button');

// サイコロを振るボタンの要素を取得します
const rollDiceButton = document.getElementById('roll_dice_button');

// ゲームボードのキャンバス要素を取得します
const gameBoard = document.getElementById('game_board');

// キャンバスの描画コンテキストを取得します
const ctx = gameBoard.getContext('2d');

// ローディング表示用の要素を取得します
const loadingIndicator = document.getElementById('loading_indicator');

// イベント説明の表示/非表示ボタンの要素を取得します
const toggleEventDescriptionsButton = document.getElementById('toggle_event_descriptions_button');

// イベントの説明を表示するエリアの要素を取得します
const eventDescriptionsDiv = document.getElementById('event_descriptions');

// サイコロの確率分布を表示するためのキャンバス要素を取得します
const diceChartCanvas = document.getElementById('dice_chart');

// サイコロの確率分布の表示/非表示ボタンの要素を取得します
const toggleDiceProbabilitiesButton = document.getElementById('toggle_dice_probabilities_button');

// サイコロの確率分布を表示するエリアの要素を取得します
const diceProbabilitiesDiv = document.getElementById('dice_probabilities');

// モンティ・ホールイベント用のモーダル要素を取得します
const montyHallModal = document.getElementById('monty_hall_modal');

// モンティ・ホールイベントの内容を表示するエリアの要素を取得します
const montyHallContent = document.getElementById('monty_hall_content');

// モンティ・ホールイベントのモーダルを閉じるボタンの要素を取得します
const montyHallCloseButton = document.getElementById('monty_hall_close_button');

// 迷路イベント用のモーダル要素を取得します
const mazeModal = document.getElementById('maze_modal');

// 迷路イベントの内容を表示するエリアの要素を取得します
const mazeContent = document.getElementById('maze_content');

// 迷路イベントのモーダルを閉じるボタンの要素を取得します
const mazeCloseButton = document.getElementById('maze_close_button');

// サイコロ選択用のモーダル要素を取得します
const diceSelectionModal = document.getElementById('dice_selection_modal');
const diceSelectionContent = document.getElementById('dice_selection_content');
const diceSelectionClose = document.getElementById('dice_selection_close');

// --- ボタンの初期状態を設定 ---

// ゲーム開始前なので、次のプレイヤーのターンボタンとサイコロを振るボタンは無効化します
nextTurnButton.disabled = true;
rollDiceButton.disabled = true;
