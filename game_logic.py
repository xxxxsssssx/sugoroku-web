import random

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
        'description': '低い目が出やすいが、確率は教えてもらえない。'
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

        # ターン制終了条件用の属性を追加
        self.max_turns = max_turns
        self.current_turn = 1  # 1ターン目から開始

    def start(self):
        self.is_over = False
        self.current_player_index = 0
        self.current_turn = 1
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
        player = self.players[self.current_player_index]
        dice = player.dice if player.dice else self.dice
        roll = dice.roll()

        # 前進分を加算
        player.total_distance += roll

        player.position += roll
        # ループ化対応
        player.position = player.position % self.board.size

        message = f"{player.name}はサイコロで{roll}が出た！"

        current_cell = self.board.cells[player.position]
        if current_cell.event:
            event_message = current_cell.event.effect(player, self)
            message += f"\nイベント発生！{event_message}"

        # ターン終了後に次のプレイヤーへ
        self.current_player_index = (self.current_player_index + 1) % len(self.players)

        # 全員が一巡したらターンを進める（プレイヤー人数分サイコロ振ったら1ターン経過とする場合）
        if self.current_player_index == 0:
            self.current_turn += 1
            # max_turnsに到達したらゲーム終了
            if self.current_turn > self.max_turns:
                self.is_over = True
                # 勝利判定：total_distanceが最大のプレイヤーを勝者に
                winner = max(self.players, key=lambda p: p.total_distance)
                message += f"\n{self.max_turns}ターンが経過しました！ゲーム終了！勝者は{winner.name}さん（総移動マス数：{winner.total_distance}）"

        return message


