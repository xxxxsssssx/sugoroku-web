import random

class Player:
    def __init__(self, name, character='default.png'):
        self.name = name
        self.position = 0
        self.character = character
        self.dice = None  # プレイヤー専用のサイコロ
        self.needs_dice_customization = False  # サイコロカスタマイズが必要か
        self.is_in_monty_hall = False
        self.monty_hall_state = {}
        self.is_in_maze = False  # 迷路イベント中かどうか
        self.maze = None  # 迷路イベントの状態を保持

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
        self.effect = effect  # 関数

def forward_event_factory(steps):
    def effect(player, game):
        player.position += steps
        message = f"{player.name}は{steps}マス進んだ！"
        return message
    return Event(f"{steps}マス進む", f"プレイヤーが{steps}マス進みます。", effect)

def backward_event_factory(steps):
    def effect(player, game):
        player.position -= steps
        if player.position < 0:
            player.position = 0
        message = f"{player.name}は{steps}マス戻った！"
        return message
    return Event(f"{steps}マス戻る", f"プレイヤーが{steps}マス戻ります。", effect)

def dice_modifier_event_factory(new_probabilities):
    def effect(player, game):
        game.dice.probabilities = new_probabilities
        message = f"{player.name}はサイコロの確率を変更した！"
        return message
    return Event("サイコロ確率変更", "サイコロの確率が変更されます。", effect)

class ProbabilityMazeEvent(Event):
    def __init__(self):
        super().__init__(
            name="確率の迷路",
            description="確率的な迷路に挑戦します。",
            effect=self.start_maze
        )

    def start_maze(self, player, game):
        # 迷路を初期化
        maze = ProbabilityMaze()
        player.is_in_maze = True
        player.maze = maze
        message = f"{player.name}は確率の迷路に挑戦します！"
        return message

class ProbabilityMaze:
    def __init__(self):
        # 迷路の構造を定義
        self.maze_structure = {
            'start': [('A', 0.5), ('B', 0.5)],
            'A': [('C', 0.7), ('D', 0.3)],
            'B': [('D', 0.6), ('E', 0.4)],
            'C': [('goal', 1.0)],
            'D': [('fail', 1.0)],
            'E': [('goal', 0.5), ('fail', 0.5)],
        }
        self.current_node = 'start'
        self.is_success = False
        self.is_finished = False  # 迷路が終了したかどうか
        self.reward_steps = 3  # 報酬として進めるマス数
        self.path_taken = []

    def navigate(self):
        message = ""
        if self.current_node not in ('goal', 'fail'):
            next_nodes = self.maze_structure[self.current_node]
            nodes, probabilities = zip(*next_nodes)
            self.current_node = random.choices(nodes, probabilities)[0]
            self.path_taken.append(self.current_node)
            message += f"次の地点：{self.current_node}\n"

            if self.current_node == 'goal':
                self.is_success = True
                self.is_finished = True
                message += "ゴールに到達しました！"
            elif self.current_node == 'fail':
                self.is_success = False
                self.is_finished = True
                message += "迷路で迷ってしまいました。"
        return message

class DiceCustomizationEvent(Event):
    def __init__(self):
        super().__init__(
            name="サイコロカスタマイズ",
            description="サイコロの出目の確率をカスタマイズできます。",
            effect=self.customize_dice
        )

    def customize_dice(self, player, game):
        player.needs_dice_customization = True
        message = f"{player.name}はサイコロをカスタマイズできます。次のターンまでに設定してください。"
        return message

class MontyHallEvent(Event):
    def __init__(self):
        super().__init__(
            name="モンティ・ホールの挑戦",
            description="3つの扉から1つを選んで賞品を狙おう！",
            effect=self.start_monty_hall
        )

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
    def __init__(self, players, board, dice):
        self.players = players
        self.board = board
        self.dice = dice
        self.current_player_index = 0
        self.is_over = False

    def start(self):
        # ゲーム開始時の処理
        self.is_over = False
        self.current_player_index = 0
        for player in self.players:
            player.position = 0
            player.dice = None
            player.needs_dice_customization = False
            player.is_in_monty_hall = False
            player.monty_hall_state = {}
            player.is_in_maze = False
            player.maze = None

    def next_turn(self):
        player = self.players[self.current_player_index]
        dice = player.dice if player.dice else self.dice  # プレイヤーのサイコロがあればそれを使用

        roll = dice.roll()
        player.position += roll
        message = f"{player.name}はサイコロで{roll}が出た！"

        # ゴールを超えた場合
        if player.position >= self.board.size:
            self.is_over = True
            player.position = self.board.size - 1
            message += f"\n{player.name}はゴールしました！ゲーム終了です。"
            return message

        # イベントの処理
        current_cell = self.board.cells[player.position]
        if current_cell.event:
            event_message = current_cell.event.effect(player, self)
            message += f"\nイベント発生！{event_message}"

        return message
