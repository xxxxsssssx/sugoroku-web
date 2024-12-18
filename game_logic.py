import random

SLOT_OPTIONS = [
    {
        'name': 'スロットA',
        'description': '大当たり率は低いが、当たれば+5マス！ ハズレもそこそこ。',
        'results': [
            {'name': '大当たり', 'steps': 5, 'prob': 0.1},
            {'name': '中当たり', 'steps': 2, 'prob': 0.3},
            {'name': 'ハズレ', 'steps': -2, 'prob': 0.6}
        ]
    },
    {
        'name': 'スロットB',
        'description': '無難なスロット。大当たりは出にくいが、ハズレも少ない。',
        'results': [
            {'name': '大当たり', 'steps': 3, 'prob': 0.15},
            {'name': '中当たり', 'steps': 2, 'prob': 0.5},
            {'name': 'ハズレ', 'steps': -1, 'prob': 0.35}
        ]
    },
    {
        'name': 'スロットC',
        'description': '低リスク低リターン。ほぼ中当たりで安定している。',
        'results': [
            {'name': '大当たり', 'steps': 4, 'prob': 0.05},
            {'name': '中当たり', 'steps': 2, 'prob': 0.9},
            {'name': 'ハズレ', 'steps': -1, 'prob': 0.05}
        ]
    }
]

# プリセットされたサイコロオプションを定義
PREDEFINED_DICE_OPTIONS = [
    {
        'name': '標準のサイコロ',
        'probabilities': {1: 1/6, 2: 1/6, 3: 1/6, 4: 1/6, 5: 1/6, 6: 1/6},
        'description': '各目が均等に出るサイコロです。'
    },
    # 他のサイコロオプションを追加できます
    
]
MYSTERY_DICE_OPTIONS = [
    {
        'name': '謎のサイコロA',
        'probabilities': {1: 0.05, 2: 0.05, 3: 0.2, 4: 0.2, 5: 0.3, 6: 0.2},
        'description': '内部的に偏ったサイコロ。詳細は非公開。'
    },
    {
        'name': '謎のサイコロB',
        'probabilities': {1: 0.4, 2: 0.2, 3: 0.15, 4: 0.1, 5: 0.1, 6: 0.05},
        'description': '内部的に偏ったサイコロ。詳細は非公開。'
    }
]

class Player:
    def __init__(self, name, character='default.png'):
        self.name = name
        self.position = 0
        self.character = character
        self.dice = None  # プレイヤー専用のサイコロ
        self.needs_dice_selection = False  # サイコロ選択が必要か
        self.is_in_monty_hall = False
        self.monty_hall_state = {}
        self.is_in_maze = False
        self.maze = None
        # 累計移動距離を管理する新しい属性を追加
        self.total_distance = 0

class Dice:
    def __init__(self, probabilities):
        self.probabilities = probabilities  # {1: 0.2, 2: 0.15, ...}

    def roll(self):
        faces = list(self.probabilities.keys())
        probs = list(self.probabilities.values())
        return random.choices(faces, probs)[0]

class Cell:
    def __init__(self, position, event=None):
        self.position = position
        self.event = event

class Event:
    def __init__(self, name, description, effect):
        self.name = name
        self.description = description
        self.effect = effect  # イベントの効果を持つ関数

def forward_event_factory(steps):
    def effect(player, game):
        player.position += steps
        message = f"{player.name}は{steps}マス進んだ！"
        return message
    return Event(f"{steps}マス進む", f"プレイヤーが{steps}マス進みます。", effect)

def backward_event_factory(steps):
    def effect(player, game):
        # 後退分を累計移動距離から減算
        player.total_distance -= steps

        player.position -= steps
        if player.position < 0:
            # ループ対応: positionをboard.sizeでmod
            player.position = player.position % game.board.size
        return f"{player.name}は{steps}マス戻った！"
    return Event(f"{steps}マス戻る", f"プレイヤーが{steps}マス戻ります。", effect)


class DiceSelectionEvent(Event):
    def __init__(self):
        super().__init__(
            name="サイコロ選択",
            description="複数のサイコロから1つを選択できます。",
            effect=self.select_dice
        )
    
    def select_dice(self, player, game):
        player.needs_dice_selection = True
        message = f"{player.name}はサイコロを選択できます。"
        return message

class ProbabilityMazeEvent(Event):
    def __init__(self):
        super().__init__(
            name="確率の迷路",
            description="確率的な迷路に挑戦します。",
            effect=self.start_maze
        )

    def start_maze(self, player, game):
        maze = ProbabilityMaze()
        player.is_in_maze = True
        player.maze = maze
        message = f"{player.name}は確率の迷路に挑戦します！"
        return message

class ProbabilityMaze:
    def __init__(self):
        # 迷路の構造を定義します。各ノードで次に進める道とその確率、説明を持ちます。
        self.maze_structure = {
            'start': [
                {'to': 'A', 'probability': 0.5, 'description': '広い道が続いている。'},
                {'to': 'B', 'probability': 0.5, 'description': '薄暗い小道が見える。'}
            ],
            'A': [
                {'to': 'C', 'probability': 0.7, 'description': '鳥のさえずりが聞こえる道。'},
                {'to': 'D', 'probability': 0.3, 'description': '風が強い道。'}
            ],
            'B': [
                {'to': 'D', 'probability': 0.6, 'description': '湿った土の道。'},
                {'to': 'E', 'probability': 0.4, 'description': '花の香りが漂う道。'}
            ],
            'C': [
                {'to': 'goal', 'probability': 1.0, 'description': '光が差し込む出口が見える。'}
            ],
            'D': [
                {'to': 'fail', 'probability': 1.0, 'description': '行き止まりだ。'}
            ],
            'E': [
                {'to': 'goal', 'probability': 0.5, 'description': '静かな道。'},
                {'to': 'fail', 'probability': 0.5, 'description': '怪しい音が聞こえる道。'}
            ],
        }
        self.current_node = 'start'
        self.is_success = False
        self.is_finished = False
        self.reward_steps = 5  # 成功時の報酬を増やす
        self.penalty_steps = 2  # 失敗時のペナルティを設定
        self.path_taken = []

    def get_current_choices(self):
        # 現在のノードから進める選択肢を返します
        return self.maze_structure.get(self.current_node, [])

    def make_choice(self, choice_index):
        # プレイヤーの選択に基づいて次のノードに進みます
        choices = self.get_current_choices()
        if choice_index < 0 or choice_index >= len(choices):
            return "無効な選択肢です。"
        choice = choices[choice_index]
        self.current_node = choice['to']
        self.path_taken.append(self.current_node)

        message = f"あなたは「{choice['description']}」を選びました。\n"
        if self.current_node == 'goal':
            self.is_success = True
            self.is_finished = True
            message += "ゴールに到達しました！"
        elif self.current_node == 'fail':
            self.is_success = False
            self.is_finished = True
            message += "迷路で迷ってしまいました。"
        else:
            message += f"次の地点：{self.current_node}"
        return message

class MontyHallEvent(Event):
    def __init__(self):
        super().__init__(
            name="モンティ・ホールの挑戦",
            description="3つの扉から1つを選んで賞品を狙おう！",
            effect=self.start_monty_hall
        )
        self.reward_steps = 2  # 成功時の報酬
        self.penalty_steps = 2  # 失敗時のペナルティ

    def start_monty_hall(self, player, game):
        player.is_in_monty_hall = True
        player.monty_hall_state = {
            'prize_door': random.randint(1, 3),
            'player_choice': None,
            'opened_door': None
        }
        message = f"{player.name}はモンティ・ホールの挑戦に挑みます。1〜3の扉から1つを選んでください。"
        return message

class SlotMachineEvent(Event):
    def __init__(self):
        super().__init__(
            name="全員参加スロットイベント",
            description="全員がスロットを1回回し、結果に応じて前進または後退する。",
            effect=self.start_slot_event
        )

    def start_slot_event(self, player, game):
        # イベント発生プレイヤーをトリガーに、全員参加のスロット大会開始
        # この時点でGameクラスに状態を設定し、フロント側で各プレイヤーがスロットを選択・実行する流れ
        game.is_slot_event_active = True
        game.slot_trigger_player_index = game.current_player_index
        # 順番は「止まったプレイヤーの次の人から最後に止まったプレイヤーまで」
        # ただし実装簡略化のため、全員1回ずつやる順番をサーバーが管理
        game.slot_order = []
        num_players = len(game.players)
        start_idx = (game.current_player_index + 1) % num_players
        idx = start_idx
        while True:
            game.slot_order.append(idx)
            if idx == game.current_player_index:
                break
            idx = (idx + 1) % num_players

        # slot_resultsで各プレイヤーの結果を記録するための辞書を用意
        game.slot_results = {}
        return f"{player.name}がイベントを発生させた！全員が順番にスロットを回します。"

class Board:
    def __init__(self, size):
        self.size = size
        self.cells = [Cell(i) for i in range(size)]

    def add_event(self, position, event):
        if 0 <= position < self.size:
            self.cells[position].event = event

class Game:
    def __init__(self, players, board, dice, max_turns=20):
        self.players = players
        self.board = board
        self.dice = dice
        self.current_player_index = 0
        self.is_over = False
        self.max_turns = max_turns
        self.current_turn = 1

        ### 変更開始：スロットイベント管理用フラグ ###
        self.is_slot_event_active = False
        self.slot_order = []
        self.slot_trigger_player_index = None
        self.slot_results = {}
        ### 変更終了 ###

    def start(self):
        self.is_over = False
        self.current_player_index = 0
        self.current_turn = 1
        self.is_slot_event_active = False
        self.slot_order = []
        self.slot_trigger_player_index = None
        self.slot_results = {}

        for player in self.players:
            player.position = 0
            player.dice = None
            player.needs_dice_selection = False
            player.is_in_monty_hall = False
            player.monty_hall_state = {}
            player.is_in_maze = False
            player.maze = None
            player.total_distance = 0

    def next_turn(self):
        # スロットイベント中はサイコロを振れないようにするなどの対策が必要
        # しかしここではユーザーがイベントを起こした後にroll_diceするケースを避けるため、
        # is_slot_event_activeがTrueなら普通の進行は行わないようにする。
        if self.is_slot_event_active:
            return "スロットイベント進行中です。全員がスロットを回すまで待ってください。"

        player = self.players[self.current_player_index]
        dice = player.dice if player.dice else self.dice
        roll = dice.roll()

        player.total_distance += roll
        player.position += roll
        player.position = player.position % self.board.size

        message = f"{player.name}はサイコロで{roll}が出た！"

        current_cell = self.board.cells[player.position]
        if current_cell.event:
            event_message = current_cell.event.effect(player, self)
            message += f"\nイベント発生！{event_message}"

        # プレイヤー交代処理
        self.current_player_index = (self.current_player_index + 1) % len(self.players)

        if self.current_player_index == 0:
            self.current_turn += 1
            if self.current_turn > self.max_turns:
                self.is_over = True
                winner = max(self.players, key=lambda p: p.total_distance)
                message += f"\n{self.max_turns}ターンが経過！ゲーム終了！勝者は{winner.name}（総移動：{winner.total_distance}）"

        return message


def spin_slot(slot_index):
    # SLOT_OPTIONS[slot_index]から確率に応じて結果を決める
    option = SLOT_OPTIONS[slot_index]
    results = option['results']
    # 累積確率で抽選
    r = random.random()
    cum = 0
    for res in results:
        cum += res['prob']
        if r <= cum:
            return res
    return results[-1] 