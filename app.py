from flask import Flask, request, jsonify, render_template
from game_logic import (
    Cell,
    Event,
    Player,
    Dice,
    Board,
    Game,
    forward_event_factory,
    backward_event_factory,
    dice_modifier_event_factory,
    ProbabilityMazeEvent,
    DiceCustomizationEvent,
    MontyHallEvent,
)
import random

app = Flask(__name__)

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'message': 'Not Found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal Server Error'}), 500

# ゲームのインスタンスを保持する変数
game = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start_game', methods=['POST'])
def start_game():
    global game
    data = request.get_json()
    num_players = data.get('num_players', 2)
    characters = data.get('characters', [])

    # プレイヤーの作成
    players = []
    for i in range(num_players):
        name = f"プレイヤー{i+1}"
        character = characters[i] if i < len(characters) else 'default.png'
        players.append(Player(name, character))

    # サイコロの確率設定
    default_dice_probabilities = {
        1: 0.2,
        2: 0.15,
        3: 0.25,
        4: 0.2,
        5: 0.1,
        6: 0.1
    }
    dice = Dice(default_dice_probabilities.copy())

    # ボードの作成
    board_size = 40  # マス数を増やす
    board = Board(board_size)

    # イベントの追加
    board.add_event(5, forward_event_factory(2))
    board.add_event(10, backward_event_factory(3))
    board.add_event(15, dice_modifier_event_factory({1: 0.1, 2: 0.1, 3: 0.2, 4: 0.3, 5: 0.2, 6: 0.1}))
    board.add_event(20, forward_event_factory(5))
    board.add_event(25, backward_event_factory(4))
    board.add_event(30, dice_modifier_event_factory({1: 0.3, 2: 0.3, 3: 0.2, 4: 0.1, 5: 0.05, 6: 0.05}))

    # 新しいイベントの追加
    board.add_event(12, ProbabilityMazeEvent())
    board.add_event(18, DiceCustomizationEvent())
    board.add_event(22, MontyHallEvent())

    # ゲームの作成
    game = Game(players, board, dice)
    game.start()

    return jsonify({'message': 'ゲームを開始しました。', 'num_players': num_players})

@app.route('/get_game_state', methods=['GET'])
def get_game_state():
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400

    players_state = []
    for player in game.players:
        players_state.append({
            'name': player.name,
            'position': player.position,
            'character': player.character,
            'is_in_monty_hall': player.is_in_monty_hall,
            'is_in_maze': player.is_in_maze
        })

    return jsonify({
        'players': players_state,
        'current_player_index': game.current_player_index,
        'is_over': game.is_over
    })

@app.route('/roll_dice', methods=['POST'])
def roll_dice():
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400

    message = game.next_turn()

    # ゲームが終了していない場合、次のプレイヤーにターンを渡す
    if not game.is_over:
        game.current_player_index = (game.current_player_index + 1) % len(game.players)

    # ゲーム状態を返す
    players_state = []
    for player in game.players:
        players_state.append({
            'name': player.name,
            'position': player.position,
            'character': player.character,
            'is_in_monty_hall': player.is_in_monty_hall,
            'is_in_maze': player.is_in_maze
        })

    response = {
        'message': message,
        'players': players_state,
        'current_player_index': game.current_player_index,
        'is_over': game.is_over
    }

    return jsonify(response)

@app.route('/get_dice_probabilities', methods=['GET'])
def get_dice_probabilities():
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400
    return jsonify({'probabilities': game.dice.probabilities})

@app.route('/get_event_positions', methods=['GET'])
def get_event_positions():
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400
    event_positions = []
    for cell in game.board.cells:
        if cell.event:
            event_positions.append({'position': cell.position, 'event_name': cell.event.name})
    return jsonify({'event_positions': event_positions})

@app.route('/get_event_descriptions', methods=['GET'])
def get_event_descriptions():
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400
    event_set = {}
    for cell in game.board.cells:
        if cell.event and cell.event.name not in event_set:
            event_set[cell.event.name] = cell.event.description
    events = []
    for name, description in event_set.items():
        events.append({'name': name, 'description': description})
    return jsonify({'events': events})

# 新しいエンドポイント：サイコロのカスタマイズ
@app.route('/set_custom_dice', methods=['POST'])
def set_custom_dice():
    global game
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400

    data = request.get_json()
    probabilities = data.get('probabilities', {})
    probabilities = {int(k): float(v) for k, v in probabilities.items()}

    # 合計が1か確認
    if abs(sum(probabilities.values()) - 1.0) > 0.01:
        return jsonify({'message': '確率の合計が1になるようにしてください。'}), 400

    player = game.players[game.current_player_index]
    if player.needs_dice_customization:
        player.dice = Dice(probabilities)
        player.needs_dice_customization = False
        return jsonify({'message': 'サイコロをカスタマイズしました。'})
    else:
        return jsonify({'message': 'サイコロのカスタマイズは必要ありません。'}), 400

# 新しいエンドポイント：モンティ・ホールの選択
@app.route('/monty_hall_choice', methods=['POST'])
def monty_hall_choice():
    global game
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400

    data = request.get_json()
    player = game.players[game.current_player_index]

    if not player.is_in_monty_hall:
        return jsonify({'message': 'モンティ・ホールイベント中ではありません。'}), 400

    if player.monty_hall_state.get('player_choice') is None:
        # プレイヤーの最初の選択
        choice = int(data.get('choice', 0))
        if choice not in [1, 2, 3]:
            return jsonify({'message': '1から3の数字を選んでください。'}), 400
        player.monty_hall_state['player_choice'] = choice

        # 開ける扉を決定
        doors = [1, 2, 3]
        doors.remove(player.monty_hall_state['prize_door'])
        if player.monty_hall_state['player_choice'] != player.monty_hall_state['prize_door']:
            doors.remove(player.monty_hall_state['player_choice'])
        opened_door = random.choice(doors)
        player.monty_hall_state['opened_door'] = opened_door

        message = f"扉{opened_door}はハズレでした。選択を変更しますか？（yes/no）"
        return jsonify({'message': message})
    else:
        # プレイヤーの選択変更
        change = data.get('change', 'no')
        if change.lower() == 'yes':
            remaining_door = 6 - player.monty_hall_state['player_choice'] - player.monty_hall_state['opened_door']
            player.monty_hall_state['player_choice'] = remaining_door

        # 結果判定
        if player.monty_hall_state['player_choice'] == player.monty_hall_state['prize_door']:
            message = "おめでとうございます！報酬として2マス進みます。"
            player.position += 2
        else:
            message = "残念！ハズレでした。"
        player.is_in_monty_hall = False
        player.monty_hall_state = {}
        return jsonify({'message': message})

# 新しいエンドポイント：迷路の進行
@app.route('/maze_progress', methods=['GET'])
def maze_progress():
    global game
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400

    player = game.players[game.current_player_index]

    if not player.is_in_maze or not player.maze:
        return jsonify({'message': '迷路イベント中ではありません。'}), 400

    # 迷路を進行
    result_message = player.maze.navigate()

    # 迷路が終了したか確認
    if player.maze.is_finished:
        player.is_in_maze = False
        if player.maze.is_success:
            player.position += player.maze.reward_steps
            result_message += f"\n{player.name}は迷路を突破し、{player.maze.reward_steps}マス進みました！"
        else:
            result_message += f"\n{player.name}は迷路で迷ってしまいました。"
        player.maze = None

    return jsonify({'message': result_message})

if __name__ == '__main__':
    # デバッグモードを有効化（必要に応じて）
    app.run(host='0.0.0.0', port=5000, debug=True)
