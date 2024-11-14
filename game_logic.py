# game_logic.py

import random

class Cell:
    def __init__(self, position, event=None):
        self.position = position
        self.event = event  # EventオブジェクトまたはNone

class Event:
    def __init__(self, name, effect, description=""):
        self.name = name
        self.effect = effect  # 関数またはラムダ式
        self.description = description  # イベントの説明

    def apply(self, player, game):
        return self.effect(player, game)

class Player:
    def __init__(self, name):
        self.name = name
        self.position = 0
        self.next_turn_modifier = None  # 次のターンの効果（サイコロの確率変更など）

    def move(self, steps):
        self.position += steps
        if self.position < 0:
            self.position = 0

    def apply_event(self, event, game):
        return event.apply(self, game)

class Dice:
    def __init__(self, probabilities):
        self.probabilities = probabilities  # {出目: 確率}

    def roll(self):
        rand_value = random.uniform(0, 1)
        cumulative = 0
        for steps, prob in self.probabilities.items():
            cumulative += prob
            if rand_value <= cumulative:
                return steps
        return max(self.probabilities.keys())

class Board:
    def __init__(self, size):
        self.cells = [Cell(i) for i in range(size)]
        self.size = size

    def add_event(self, position, event):
        if 0 <= position < self.size:
            self.cells[position].event = event

class Game:
    def __init__(self, players, board, dice):
        self.players = players
        self.board = board
        self.dice = dice
        self.default_probabilities = dice.probabilities.copy()
        self.current_player_index = 0
        self.is_over = False

    def start(self):
        pass  # ゲーム開始時の処理（必要に応じて）

    def get_current_player(self):
        return self.players[self.current_player_index]

    def next_turn(self):
        player = self.players[self.current_player_index]
        # サイコロの確率修正
        if player.next_turn_modifier:
            new_probs, duration = player.next_turn_modifier
            self.dice.probabilities = new_probs
            duration -= 1
            if duration == 0:
                player.next_turn_modifier = None
                self.dice.probabilities = self.default_probabilities.copy()
            else:
                player.next_turn_modifier = (new_probs, duration)
        else:
            self.dice.probabilities = self.default_probabilities.copy()
        steps = self.dice.roll()
        message = f"{player.name}さんのサイコロの目は{steps}です。\n"
        player.move(steps)
        # ゴールを超えないように調整
        if player.position >= self.board.size - 1:
            player.position = self.board.size - 1
            self.is_over = True
            message += f"{player.name}さんがゴールしました！おめでとうございます！"
            return message
        else:
            cell = self.board.cells[player.position]
            if cell.event:
                message += f"イベント発生！: {cell.event.name}\n"
                event_message = player.apply_event(cell.event, self)
                if event_message:
                    message += event_message + "\n"
            return message

# イベントファクトリ関数
def forward_event_factory(steps):
    def effect(player, game):
        player.move(steps)
        return f"{steps}マス進みます！"
    description = f"止まると{steps}マス前進します。"
    return Event(f"{steps}マス進む", effect, description)

def backward_event_factory(steps):
    def effect(player, game):
        player.move(-steps)
        return f"{steps}マス戻ります！"
    description = f"止まると{steps}マス後退します。"
    return Event(f"{steps}マス戻る", effect, description)

def dice_modifier_event_factory(new_probabilities, duration=1):
    def effect(player, game):
        player.next_turn_modifier = (new_probabilities, duration)
        return "次のターンのサイコロの確率が変化します！"
    description = "止まると次のターンのサイコロの確率が変化します。"
    return Event("サイコロ確率変更", effect, description)
