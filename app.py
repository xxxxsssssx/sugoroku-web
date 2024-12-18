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
    ProbabilityMazeEvent,
    DiceSelectionEvent,
    MontyHallEvent,
    PREDEFINED_DICE_OPTIONS,
    MYSTERY_DICE_OPTIONS,
    SLOT_OPTIONS, 
    spin_slot,
    SlotMachineEvent
)
import random

app = Flask(__name__)

# ゲームのインスタンスを保持する変数
game = None

@app.route('/')
def index():
    # メインページを表示します
    return render_template('index.html')

@app.route('/start_game', methods=['POST'])
def start_game():
    global game
    data = request.get_json()
    num_players = data.get('num_players', 2)
    characters = data.get('characters', [])
    max_turns = data.get('max_turns', 20)  # ユーザーからターン数を指定できるようにする

    players = []
    for i in range(num_players):
        name = f"プレイヤー{i+1}"
        character = characters[i] if i < len(characters) else 'default.png'
        players.append(Player(name, character))

    default_dice = PREDEFINED_DICE_OPTIONS[0]
    dice = Dice(default_dice['probabilities'].copy())

    board_size = 40
    board = Board(board_size)

    # イベントの追加
    board.add_event(3, SlotMachineEvent())
    board.add_event(7, MontyHallEvent())
    board.add_event(4, MontyHallEvent())
    board.add_event(5, forward_event_factory(2))
    board.add_event(10, backward_event_factory(3))
    board.add_event(15, DiceSelectionEvent())  # サイコロ選択イベント
    board.add_event(20, forward_event_factory(5))
    board.add_event(25, backward_event_factory(4))
    board.add_event(30, DiceSelectionEvent())  # サイコロ選択イベント
    board.add_event(12, ProbabilityMazeEvent())
    board.add_event(22, MontyHallEvent())
    board.add_event(35, SlotMachineEvent())

    # ゲームの作成
    game = Game(players, board, dice, max_turns=max_turns)
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
            'is_in_maze': player.is_in_maze,
            'needs_dice_selection': player.needs_dice_selection  # 更新
        })

    return jsonify({
        'players': players_state,
        'current_player_index': game.current_player_index,
        'is_over': game.is_over,
        'is_slot_event_active': game.is_slot_event_active
    })

@app.route('/roll_dice', methods=['POST'])
def roll_dice():
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400

    message = game.next_turn()


    # ゲーム状態を返す
    players_state = []
    for player in game.players:
        players_state.append({
            'name': player.name,
            'position': player.position,
            'character': player.character,
            'is_in_monty_hall': player.is_in_monty_hall,
            'is_in_maze': player.is_in_maze,
            'needs_dice_selection': player.needs_dice_selection  # 更新
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


@app.route('/select_dice', methods=['POST'])
def select_dice():
    global game
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400

    data = request.get_json()
    selected_dice_index = int(data.get('dice_index', -1))

    player = game.players[game.current_player_index]

    if not player.needs_dice_selection:
        return jsonify({'message': 'サイコロの選択は必要ありません。'}), 400

    # 選択されたインデックスがPREDEFINEDとMYSTERYの合計の範囲内か確認
    total_options = len(PREDEFINED_DICE_OPTIONS) + len(MYSTERY_DICE_OPTIONS)
    if selected_dice_index < 0 or selected_dice_index >= total_options:
        return jsonify({'message': '無効なサイコロの選択です。'}), 400

    if selected_dice_index < len(PREDEFINED_DICE_OPTIONS):
        # 通常サイコロ選択
        selected_dice = PREDEFINED_DICE_OPTIONS[selected_dice_index]
        player.dice = Dice(selected_dice['probabilities'])
        dice_name = selected_dice['name']
    else:
        # 謎サイコロ選択
        mystery_index = selected_dice_index - len(PREDEFINED_DICE_OPTIONS)
        selected_dice = MYSTERY_DICE_OPTIONS[mystery_index]
        player.dice = Dice(selected_dice['probabilities'])
        dice_name = selected_dice['name']
    
    player.needs_dice_selection = False
    message = f"{player.name}は「{dice_name}」を選択しました。"
    return jsonify({'message': message})


@app.route('/get_dice_options', methods=['GET'])
def get_dice_options():
    # 従来のオプションと謎サイコロオプションをまとめたリストを作る
    # 謎サイコロは確率を非公開にするため、probabilitiesを返さない、または偽のデータにする
    dice_options = []

    # 通常のサイコロは従来通り確率を公開
    for dice_option in PREDEFINED_DICE_OPTIONS:
        dice_options.append({
            'name': dice_option['name'],
            'description': dice_option['description'],
            'probabilities': dice_option['probabilities']  # 従来通り公開
        })

    # 謎サイコロは確率を非表示。ここではprobabilitiesを返さないか、空にする
    from game_logic import MYSTERY_DICE_OPTIONS
    for dice_option in MYSTERY_DICE_OPTIONS:
        dice_options.append({
            'name': dice_option['name'],
            'description': dice_option['description'],
            # 'probabilities': {} # もしくは返さない
            # ここでは確率を返さないことで、クライアントは確率不明なサイコロとして受け取る
        })

    return jsonify({'dice_options': dice_options})

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

        message = f"扉{opened_door}はハズレでした。選択を変更しますか？（はい/いいえ）"
        return jsonify({'message': message, 'opened_door': opened_door})
    else:
        # プレイヤーの選択変更
        change = data.get('change', 'いいえ')
        if change.lower() == 'はい':
            remaining_door = 6 - player.monty_hall_state['player_choice'] - player.monty_hall_state['opened_door']
            player.monty_hall_state['player_choice'] = remaining_door

        # 結果判定
        monty_event = None
        for cell in game.board.cells:
            if cell.position == player.position and isinstance(cell.event, MontyHallEvent):
                monty_event = cell.event
                break

        if monty_event is None:
            monty_event = MontyHallEvent()  # デフォルト値を設定

        if player.monty_hall_state['player_choice'] == player.monty_hall_state['prize_door']:
            message = f"おめでとうございます！賞品を獲得しました。{monty_event.reward_steps}マス進みます。"
            player.position += monty_event.reward_steps
        else:
            message = f"残念！ハズレでした。{monty_event.penalty_steps}マス戻ります。"
            player.position -= monty_event.penalty_steps
            if player.position < 0:
                player.position = 0
        player.is_in_monty_hall = False
        player.monty_hall_state = {}
        return jsonify({'message': message})

@app.route('/get_slot_options', methods=['GET'])
def get_slot_options():
    # スロット一覧を返す。確率は非公開でよいので、名前と説明のみ返す
    slot_data = []
    for i, slot in enumerate(SLOT_OPTIONS):
        slot_data.append({
            'index': i,
            'name': slot['name'],
            'description': slot['description']
        })
    return jsonify({'slot_options': slot_data})

@app.route('/spin_slot', methods=['POST'])
def spin_slot_endpoint():
    global game
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400

    if not game.is_slot_event_active:
        return jsonify({'message': '現在スロットイベント中ではありません。'}), 400

    data = request.get_json()
    slot_index = data.get('slot_index', -1)
    player_index = game.current_player_index

    # スロットイベントではplayerはslot_orderに従い順番に回す
    # クライアント側は適宜、現在誰の番か問い合わせて表示する必要あり
    # ここでは、spin_slotを呼ぶ前にフロントが誰の番かを知っている想定

    # 誰の番かをサーバーで管理するため、未実行のプレイヤーを追跡
    # slot_orderの先頭が次に回すべきプレイヤー
    if len(game.slot_order) == 0:
        return jsonify({'message': '全員スロットを回し終えました。'}), 400

    next_player_idx = game.slot_order[0]
    if next_player_idx < 0 or next_player_idx >= len(game.players):
        return jsonify({'message': '無効なプレイヤーインデックス。'}), 400

    if slot_index < 0 or slot_index >= len(SLOT_OPTIONS):
        return jsonify({'message': '無効なスロット選択です。'}), 400

    player = game.players[next_player_idx]

    # スロット結果を取得
    res = spin_slot(slot_index)
    steps = res['steps']
    # 前進/後退処理
    player.total_distance += steps
    player.position += steps
    player.position = player.position % game.board.size

    result_msg = f"{player.name}は{SLOT_OPTIONS[slot_index]['name']}を回した！結果：{res['name']}（{steps}マス）"

    # このプレイヤーは実行終了
    game.slot_results[player.name] = result_msg
    game.slot_order.pop(0)

    # 全員終了したらイベント終了
    if len(game.slot_order) == 0:
        game.is_slot_event_active = False
        # 全員の結果をまとめる
        all_res = "\n".join(game.slot_results.values())
        result_msg += f"\n全員スロット終了！結果まとめ：\n{all_res}"

    return jsonify({'message': result_msg})

@app.route('/maze_progress', methods=['GET', 'POST'])
def maze_progress():
    global game
    if game is None:
        return jsonify({'message': 'ゲームが開始されていません。'}), 400

    player = game.players[game.current_player_index]

    if not player.is_in_maze or not player.maze:
        return jsonify({'message': '迷路イベント中ではありません。'}), 400

    if request.method == 'GET':
        # 現在の選択肢を取得して返す
        choices = player.maze.get_current_choices()
        choices_info = []
        for idx, choice in enumerate(choices):
            choices_info.append({
                'index': idx,
                'description': choice['description'],
                'probability': choice['probability']
            })
        message = f"{player.name}は現在「{player.maze.current_node}」にいます。次に進む道を選んでください。"
        return jsonify({'message': message, 'choices': choices_info})
    else:
        # プレイヤーの選択を処理
        data = request.get_json()
        choice_index = int(data.get('choice_index', -1))
        result_message = player.maze.make_choice(choice_index)

        # 迷路が終了したか確認
        if player.maze.is_finished:
            player.is_in_maze = False
            if player.maze.is_success:
                player.position += player.maze.reward_steps
                result_message += f"\n{player.name}は迷路を突破し、{player.maze.reward_steps}マス進みました！"
            else:
                player.position -= player.maze.penalty_steps
                if player.position < 0:
                    player.position = 0
                result_message += f"\n{player.name}は迷路で迷い、{player.maze.penalty_steps}マス戻りました。"
            player.maze = None

        return jsonify({'message': result_message})

# エラーハンドラーの追加
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'message': 'Not Found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal Server Error'}), 500

if __name__ == '__main__':
    # アプリケーションを起動します
    app.run(host='0.0.0.0', port=5000, debug=True)
