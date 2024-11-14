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
)

app = Flask(__name__)

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

    # プレイヤーの作成
    players = [Player(f"プレイヤー{i+1}") for i in range(num_players)]

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
            'position': player.position
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
            'position': player.position
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


if __name__ == '__main__':
    # デバッグモードを無効化
    app.run(host='0.0.0.0', port=5000)

