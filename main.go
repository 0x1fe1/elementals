package main

import (
	"cmp"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"
)

func make_id(length int) string {
	// <<<
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	result := make([]byte, length)
	for i := 0; i < length; i++ {
		result[i] = characters[rng.Intn(len(characters))]
	}
	return string(result)
	// >>>
}

func clamp[T cmp.Ordered](v, a, b T) T {
	// <<<
	return max(a, min(b, v))
	// >>>
}

func abs(x int) int {
	// <<<
	if x < 0 {
		return -x
	}
	return x
	// >>>
}

func sign(x int) int {
	// <<<
	if x < 0 {
		return -1
	}
	return 1
	// >>>
}

func pretty_print(i interface{}) string {
	// <<<
	s, _ := json.MarshalIndent(i, "", "  ")
	return string(s)
	// >>>
}

// =============================================================================

type Element string
type Spell string
type CellType string
type ActionType string

const ( // <<<
	SIZE = 12

	SKIP   ActionType = "skip"
	SPELL  ActionType = "spell"
	MOVE   ActionType = "move"
	ATTACK ActionType = "attack"

	EMPTY     CellType = "empty"
	BLOCK     CellType = "block"
	ELEMENTAL CellType = "elemental"

	AIR    Element = "air"
	ROCK   Element = "rock"
	FIRE   Element = "fire"
	WATER  Element = "water"
	NATURE Element = "nature"
	ENERGY Element = "energy"

	FS Spell = "fs"
	HV Spell = "hv"
	AF Spell = "af"
	DT Spell = "dt"
	MS Spell = "ms"
) // >>>

var ( // <<<
	ACTION_TYPES = []ActionType{SKIP, SPELL, MOVE, ATTACK}
	CELL_TYPES   = []CellType{EMPTY, ELEMENTAL, BLOCK}
	SPELLS       = []Spell{FS, HV, AF, DT, MS}
	ELEMENTS     = []Element{AIR, ROCK, FIRE, WATER, NATURE, ENERGY}
	LEVELS       = []int{1, 2, 3} // 111 -> _2_ points+1 | 222 -> _3_ points+2
	HEALTH       = []int{1, 2, 6}
	DAMAGE       = []int{1, 2, 4}
	REACH        = []int{3, 5, 7}
	CHARGES      = []int{4, 5, 7, 9, 10}
	SPELL_DAMAGE = []int{2, -1, 1, -1, 4}
) // >>>

type Board [SIZE][SIZE]struct {
	// <<<
	Type    CellType `json:"type"`
	Element Element  `json:"element"`
	Health  int      `json:"health"`
	Level   int      `json:"level"`
	// >>>
}

type Game struct {
	// <<<
	Board        Board     `json:"board"`
	Players      [2][5]int `json:"players"`
	ActivePlayer int       `json:"active_player"`
	Turn         int       `json:"turn"`
	// >>>
}

type BoardSOA struct {
	// <<<
	Type    [SIZE][SIZE]CellType `json:"type"`
	Element [SIZE][SIZE]Element  `json:"element"`
	Health  [SIZE][SIZE]int      `json:"health"`
	Level   [SIZE][SIZE]int      `json:"level"`
	// >>>
}

type GameSOA struct {
	// <<<
	BoardSOA     BoardSOA  `json:"board_soa"`
	Players      [2][5]int `json:"players"`
	ActivePlayer int       `json:"active_player"`
	Turn         int       `json:"turn"`
	// >>>
}

type GameWrapper struct {
	// <<<
	Game              Game
	Players           []string
	PlayerCanUseSpell []bool
	CreatedAt         time.Time
	LastAccessedAt    time.Time
	SkipAdvance       int
	// >>>
}

// =============================================================================

func valid(row, col int) bool {
	return row >= 0 && row < SIZE && col >= 0 && col < SIZE
}

func aos2soaB(aos Board) BoardSOA {
	// <<<
	soa := BoardSOA{}

	for i := 0; i < SIZE; i++ {
		for j := 0; j < SIZE; j++ {
			soa.Type[i][j] = aos[i][j].Type
			soa.Element[i][j] = aos[i][j].Element
			soa.Health[i][j] = aos[i][j].Health
			soa.Level[i][j] = aos[i][j].Level
		}
	}

	return soa
	// >>>
}

func aos2soa(aos Game) GameSOA {
	// <<<
	soa := GameSOA{
		Players:      aos.Players,
		ActivePlayer: aos.ActivePlayer,
		Turn:         aos.Turn,
	}

	for i := 0; i < SIZE; i++ {
		for j := 0; j < SIZE; j++ {
			soa.BoardSOA.Type[i][j] = aos.Board[i][j].Type
			soa.BoardSOA.Element[i][j] = aos.Board[i][j].Element
			soa.BoardSOA.Health[i][j] = aos.Board[i][j].Health
			soa.BoardSOA.Level[i][j] = aos.Board[i][j].Level
		}
	}

	return soa
	// >>>
}
func soa2aos(soa GameSOA) Game {
	// <<<
	aos := Game{
		Players:      soa.Players,
		ActivePlayer: soa.ActivePlayer,
		Turn:         soa.Turn,
	}

	for i := 0; i < SIZE; i++ {
		for j := 0; j < SIZE; j++ {
			aos.Board[i][j].Type = soa.BoardSOA.Type[i][j]
			aos.Board[i][j].Element = soa.BoardSOA.Element[i][j]
			aos.Board[i][j].Health = soa.BoardSOA.Health[i][j]
			aos.Board[i][j].Level = soa.BoardSOA.Level[i][j]
		}
	}

	return aos
	// >>>
}

// func make_random_game() Game {
// 	// <<<
// 	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
// 	var game Game
//
// 	game.ActivePlayer = rng.Intn(2)
// 	game.Turn = rng.Intn(36) + 1
//
// 	for i := 0; i < 2; i++ {
// 		for j := 0; j < 5; j++ {
// 			game.Players[i][j] = rng.Intn(CHARGES[j] + 1)
// 		}
// 	}
//
// 	for i := 0; i < BOARD_SIZE; i++ {
// 		for j := 0; j < BOARD_SIZE; j++ {
// 			game.Board[i][j].Type = CELL_TYPES[rng.Intn(len(CELL_TYPES))]
// 			if game.Board[i][j].Type != ELEMENTAL {
// 				continue
// 			}
// 			game.Board[i][j].Element = ELEMENTS[rng.Intn(len(ELEMENTS))]
// 			game.Board[i][j].Level = LEVELS[rng.Intn(len(LEVELS))]
// 			game.Board[i][j].Health = rng.Intn(HEALTH[game.Board[i][j].Level-1]) + 1
// 		}
// 	}
//
// 	return game
// 	// >>>
// }

func make_initial_game() Game {
	// <<<
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	var game Game

	game.ActivePlayer = 0
	game.Turn = 1

	for i := 0; i < 2; i++ {
		for j := 0; j < 5; j++ {
			game.Players[i][j] = CHARGES[j]
		}
	}

	for i := 0; i < SIZE; i++ {
		for j := 0; j < SIZE; j++ {
			game.Board[i][j].Type = EMPTY
		}
	}

	elements := make([]Element, len(ELEMENTS))
	copy(elements, ELEMENTS)
	rng.Shuffle(len(elements), func(i, j int) {
		elements[i], elements[j] = elements[j], elements[i]
	})
	num_elements_per_player := rng.Intn(2) + 1
	num_elementals := 25 + rng.Intn(20+1) - 10 // 15..=35

	all_pos_low := [SIZE * SIZE / 2][2]int{}
	all_pos_high := [SIZE * SIZE / 2][2]int{}
	for i := 0; i < SIZE/2; i++ {
		for j := 0; j < SIZE; j++ {
			all_pos_low[i*SIZE+j] = [2]int{i, j}
			all_pos_high[i*SIZE+j] = [2]int{i + SIZE/2, j}
		}
	}
	rng.Shuffle(len(all_pos_low), func(i, j int) {
		all_pos_low[i], all_pos_low[j] = all_pos_low[j], all_pos_low[i]
	})
	rng.Shuffle(len(all_pos_high), func(i, j int) {
		all_pos_high[i], all_pos_high[j] = all_pos_high[j], all_pos_high[i]
	})

	for i := 0; i < num_elementals; i++ {
		for j := 0; j <= 1; j++ {
			pos := [2]int{}
			if j == 0 {
				pos = all_pos_low[i]
			} else {
				pos = all_pos_high[i]
			}
			game.Board[pos[0]][pos[1]].Type = ELEMENTAL
			game.Board[pos[0]][pos[1]].Element = elements[rng.Intn(num_elements_per_player)+2*(pos[0]/6)]
			game.Board[pos[0]][pos[1]].Level = LEVELS[0]
			game.Board[pos[0]][pos[1]].Health = HEALTH[0]
		}
	}

	return game
	// >>>
}

var merge_configurations = [8][3][2]int{
	// <<<
	{{-1, -1}, {+0, -1}, {+1, -1}},
	{{-1, +0}, {+0, +0}, {+1, +0}},
	{{-1, +1}, {+0, +1}, {+1, +1}},
	{{-1, -1}, {-1, +0}, {-1, +1}},
	{{+0, -1}, {+0, +0}, {+0, +1}},
	{{+1, -1}, {+1, +0}, {+1, +1}},
	{{-1, -1}, {+0, +0}, {+1, +1}},
	{{+1, -1}, {+0, +0}, {-1, +1}},
	// >>>
}

// offset ::= 0 | 1
func merge_board(board *Board, offset int) int {
	// <<<
	new_charges := 0
	next := board
	todo := [SIZE / 2][SIZE]byte{} // 0=nop << 1=remove << 2=ascend ; low_priority << high_priority
	o := offset * SIZE / 2

	for row := 1; row < SIZE/2-1; row++ {
		for col := 1; col < SIZE-1; col++ {
			for i := 0; i < len(merge_configurations); i++ {
				conf := merge_configurations[i]
				a := board[row+conf[0][1]+o][col+conf[0][0]]
				b := board[row+conf[1][1]+o][col+conf[1][0]]
				c := board[row+conf[2][1]+o][col+conf[2][0]]
				if !(a.Type == ELEMENTAL && a.Type == b.Type && b.Type == c.Type &&
					a.Element == b.Element && b.Element == c.Element &&
					a.Level == b.Level && b.Level == c.Level &&
					(a.Level == 1 || a.Level == 2)) {
					continue
				}
				todo[row+conf[0][1]][col+conf[0][0]] |= 0b01
				todo[row+conf[1][1]][col+conf[1][0]] |= 0b10
				todo[row+conf[2][1]][col+conf[2][0]] |= 0b01
			}
		}
	}

	for row := 0; row < SIZE/2; row++ {
		for col := 0; col < SIZE; col++ {
			switch todo[row][col] {
			case 0:
				break
			case 1:
				next[row+o][col].Type = EMPTY
			case 2:
				fallthrough
			case 3:
				next[row+o][col].Health = HEALTH[board[row+o][col].Level]
				new_charges += next[row+o][col].Level
				next[row+o][col].Level += 1
			}
		}
	}

	board = next
	return new_charges
	// >>>
}

func block_board(game *Game) {
	// <<<
	if game.Turn%2 != 0 {
		return
	}

	move := func(row, col int) {
		if game.Board[row][col].Type == ELEMENTAL {
			empty := [2]int{-1, col}
			if row < SIZE/2 {
				for i := row + 1; i < SIZE/2; i++ {
					if game.Board[i][col].Type != ELEMENTAL {
						empty[0] = i
						break
					}
				}
			} else {
				for i := row - 1; i >= 0; i-- {
					if game.Board[i][col].Type != ELEMENTAL {
						empty[0] = i
						break
					}
				}
			}
			if empty[0] != -1 {
				if row < SIZE/2 { // empty > row
					for i := empty[0]; i > row; i-- {
						game.Board[i][col] = game.Board[i-1][col]
					}
				} else { // empty < row
					for i := empty[0]; i < row; i++ {
						game.Board[i][col] = game.Board[i+1][col]
					}
				}
			}
		}
		game.Board[row][col].Type = BLOCK
		game.Board[row][col].Element = ""
		game.Board[row][col].Level = 0
		game.Board[row][col].Health = 0
	}

	i := game.Turn/2 - 1
	r := i / (SIZE / 2)
	c := i % (SIZE / 2)
	move(r, c)
	move(r, SIZE-1-c)
	move(SIZE-1-r, c)
	move(SIZE-1-r, (SIZE-1)-c)
	// >>>
}

func apply_damage(game *Game, to_row, to_col, damage int) {
	// <<<
	to_cell := game.Board[to_row][to_col]
	to_cell.Health -= damage
	if to_cell.Health <= 0 {
		to_cell.Level -= 1
		if to_cell.Level <= 0 {
			to_cell.Type = EMPTY
			to_cell.Element = ""
			to_cell.Health = 0
			to_cell.Level = 0
		} else {
			to_cell.Health = HEALTH[to_cell.Level-1]
		}
	}
	game.Board[to_row][to_col] = to_cell
	// >>>
}

func advance_turn(gw *GameWrapper) {
	// <<<
	new_charges := merge_board(&gw.Game.Board, gw.Game.Turn%2)
	if new_charges > 0 {
		for i := 0; i < len(SPELLS); i++ {
			gw.Game.Players[gw.Game.ActivePlayer][i] = clamp(
				gw.Game.Players[gw.Game.ActivePlayer][i]+new_charges, 0, CHARGES[i],
			)
		}
	}
	if gw.SkipAdvance > 0 {
		gw.SkipAdvance -= 1
		return
	}
	block_board(&gw.Game)
	gw.Game.Turn += 1
	gw.PlayerCanUseSpell[gw.Game.ActivePlayer] = true
	gw.Game.ActivePlayer = 1 - gw.Game.ActivePlayer
	// >>>
}

func able_to_attack(board Board, row, col int) bool {
	// <<<
	cell := board[row][col]

	if cell.Type != ELEMENTAL {
		return false
	}

	r := REACH[cell.Level-1]
	col_a := clamp(col-1, 0, SIZE-1)
	col_b := clamp(col+1, 0, SIZE-1)
	row_a, row_b := row, row
	if row < SIZE/2 {
		row_a += 1
		row_b += r
		if row_b < SIZE/2 {
			return false
		}
	} else { // row >= BOARD_SIZE/2
		row_a -= r
		row_b -= 1
		if row_a >= SIZE/2 {
			return false
		}
	}
	row_a = clamp(row_a, 0, SIZE-1)
	row_b = clamp(row_b, 0, SIZE-1)
	// log.Printf("%+v # row/col %v/%v : %v-%v %v-%v\n\n\n", aos2soaB(board), row, col, row_a, row_b, col_a, col_b)

	for i := row_a; i <= row_b; i++ {
		for j := col_a; j <= col_b; j++ {
			if sign(row-SIZE/2) != sign(i-SIZE/2) && board[i][j].Type == ELEMENTAL {
				return true
			}
		}
	}

	return false
	// >>>
}
func can_attack(board Board, from_row, from_col, to_row, to_col int) bool {
	// <<<
	if board[from_row][from_col].Type != ELEMENTAL || board[to_row][to_col].Type != ELEMENTAL {
		return false
	}

	r := REACH[board[from_row][from_col].Level-1]
	if sign(from_row-SIZE/2) == sign(to_row-SIZE/2) ||
		abs(from_col-to_col) > 1 || abs(from_row-to_row) > r {
		return false
	}

	return true
	// >>>
}

// =============================================================================

func handle_join(w http.ResponseWriter, r *http.Request) {
	// <<<
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var data struct {
		PlayerID string `json:"player_id"`
		LobbyID  string `json:"lobby_id"`
	}
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}
	// log.Printf("Join Lobby Request: %+v\n", pretty_print(data))

	lobby_id := data.LobbyID
	games.RLock()
	gw, ok := games.m[lobby_id]
	games.RUnlock()

	if !ok {
		http.Error(w, "Invalid Lobby ID", http.StatusBadRequest)
		return
	}

	if len(gw.Players) >= 2 && !slices.Contains(gw.Players, data.PlayerID) {
		http.Error(w, "Full Lobby", http.StatusBadRequest)
		return
	}

	player_index := slices.Index(gw.Players, data.PlayerID)

	gw.LastAccessedAt = time.Now()
	games.Lock()
	games.m[lobby_id] = gw
	games.Unlock()

	if !slices.Contains(gw.Players, data.PlayerID) {
		gw.Players = append(gw.Players, data.PlayerID)
		gw.PlayerCanUseSpell = append(gw.PlayerCanUseSpell, true)
		games.Lock()
		games.m[lobby_id] = gw
		games.Unlock()
		player_index = len(gw.Players)
	}

	// log.Printf("Lobby: %v, Players: %+v", lobby_id, gw.Players)

	response := struct {
		Ok          bool    `json:"ok"`
		GameSOA     GameSOA `json:"game_soa"`
		PlayerIndex int     `json:"player_index"`
	}{
		Ok:          ok,
		GameSOA:     aos2soa(gw.Game),
		PlayerIndex: player_index,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// >>>
}

func handle_new_lobby(w http.ResponseWriter, r *http.Request) {
	// <<<
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var data struct {
		PlayerID string `json:"player_id"`
	}
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}
	// log.Printf("New Lobby Request: %+v\n", pretty_print(data))

	lobby_id := strings.ToUpper(make_id(6))
	game := make_initial_game()
	games.Lock()
	games.m[lobby_id] = GameWrapper{
		Game:              game,
		Players:           []string{data.PlayerID},
		PlayerCanUseSpell: []bool{true},
		CreatedAt:         time.Now(),
		LastAccessedAt:    time.Now(),
	}
	games.Unlock()

	response := struct {
		LobbyID string  `json:"lobby_id"`
		GameSOA GameSOA `json:"game_soa"`
	}{
		LobbyID: lobby_id,
		GameSOA: aos2soa(game),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// >>>
}

func handle_new_player(w http.ResponseWriter, r *http.Request) {
	// <<<
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	player_id := make_id(16)
	response := struct {
		PlayerID string `json:"player_id"`
	}{
		PlayerID: player_id,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// >>>
}

func handle_action(w http.ResponseWriter, r *http.Request) {
	// <<<
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var data struct {
		LobbyID  string `json:"lobby_id"`
		PlayerID string `json:"player_id"`
		Action   struct {
			Type  ActionType `json:"type"`  // skip == other fields are ignored
			Spell Spell      `json:"spell"` // empty means none was used
			From  struct {
				Row int `json:"row"`
				Col int `json:"col"`
			} `json:"from"`
			To struct {
				Row int `json:"row"`
				Col int `json:"col"`
			} `json:"to"`
		} `json:"action"`
	}
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}
	// log.Printf("Action Request: %+v\n", pretty_print(data))

	games.RLock()
	gw, ok := games.m[data.LobbyID]
	games.RUnlock()

	if !ok {
		http.Error(w, "Invalid Lobby ID", http.StatusBadRequest)
		return
	}

	valid_action := len(gw.Players) == 2 &&
		slices.Index(gw.Players, data.PlayerID) == gw.Game.ActivePlayer &&
		slices.Index(ACTION_TYPES, data.Action.Type) != -1

	player_index := slices.Index(gw.Players, data.PlayerID)

	if valid_action {
		switch data.Action.Type {
		case SKIP:
			advance_turn(&gw)
		case SPELL:
			switch data.Action.Spell {
			case FS:
				to := data.Action.To
				if !valid(to.Row, to.Col) || gw.Game.ActivePlayer != (sign(to.Row-SIZE/2)+1)/2 {
					http.Error(w, "Invalid Cell", http.StatusBadRequest)
					return
				}
				spell_index := slices.Index(SPELLS, FS)
				gw.Game.Players[player_index][spell_index] = 0

				apply_damage(&gw.Game, to.Row, to.Col, SPELL_DAMAGE[spell_index])
			case HV:
				to := data.Action.To
				if !valid(to.Row, to.Col) || gw.Game.ActivePlayer == (sign(to.Row-SIZE/2)+1)/2 {
					http.Error(w, "Invalid Cell", http.StatusBadRequest)
					return
				}
				spell_index := slices.Index(SPELLS, HV)
				gw.Game.Players[player_index][spell_index] = 0
				gw.Game.Board[to.Row][to.Col].Health = HEALTH[gw.Game.Board[to.Row][to.Col].Level-1]
			case AF:
				to := data.Action.To
				if !valid(to.Row, to.Col) || gw.Game.ActivePlayer != (sign(to.Row-SIZE/2)+1)/2 {
					http.Error(w, "Invalid Cell", http.StatusBadRequest)
					return
				}
				spell_index := slices.Index(SPELLS, AF)
				gw.Game.Players[player_index][spell_index] = 0

				offset := max(0, SIZE/2*sign(to.Row-SIZE/2))
				for i := 0; i < SIZE/2; i++ {
					apply_damage(&gw.Game, i+offset, to.Col, SPELL_DAMAGE[spell_index])
				}
				for j := 0; j < SIZE; j++ {
					if j == to.Col {
						continue
					}
					apply_damage(&gw.Game, to.Row, j, SPELL_DAMAGE[spell_index])
				}
			case DT:
				spell_index := slices.Index(SPELLS, DT)
				gw.Game.Players[player_index][spell_index] = 0
				gw.SkipAdvance = 1
			case MS:
				to := data.Action.To
				if !valid(to.Row, to.Col) || gw.Game.ActivePlayer != (sign(to.Row-SIZE/2)+1)/2 {
					http.Error(w, "Invalid Cell", http.StatusBadRequest)
					return
				}
				spell_index := slices.Index(SPELLS, MS)
				gw.Game.Players[player_index][spell_index] = 0

				row_low := clamp(to.Row-1, 0, SIZE/2-1)
				row_high := clamp(to.Row+1, 0, SIZE/2-1)
				if gw.Game.ActivePlayer == 1 {
					row_low = clamp(to.Row-1, SIZE/2, SIZE-1)
					row_high = clamp(to.Row+1, SIZE/2, SIZE-1)
				}
				for i := row_low; i <= row_high; i++ {
					for j := max(to.Col-1, 0); j <= min(to.Col+1, SIZE-1); j++ {
						apply_damage(&gw.Game, i, j, SPELL_DAMAGE[spell_index])
					}
				}
			}
			break
		case MOVE:
			to := data.Action.To
			from := data.Action.From
			if !valid(to.Row, to.Col) || !valid(from.Row, from.Col) {
				http.Error(w, "Invalid Cell", http.StatusBadRequest)
				return
			}
			if sign(from.Row-SIZE/2) != sign(to.Row-SIZE/2) {
				http.Error(w, "Can move only within one's own borders.", http.StatusBadRequest)
				break
			}
			gw.Game.Board[to.Row][to.Col], gw.Game.Board[from.Row][from.Col] =
				gw.Game.Board[from.Row][from.Col], gw.Game.Board[to.Row][to.Col]
			if !able_to_attack(gw.Game.Board, to.Row, to.Col) {
				advance_turn(&gw)
			}
		case ATTACK:
			to := data.Action.To
			from := data.Action.From
			if !valid(to.Row, to.Col) || !valid(from.Row, from.Col) {
				http.Error(w, "Invalid Cell", http.StatusBadRequest)
				return
			}
			if !can_attack(gw.Game.Board, from.Row, from.Col, to.Row, to.Col) {
				http.Error(w, "Can attack only the enemy's elementals.", http.StatusBadRequest)
				break
			}
			apply_damage(&gw.Game, to.Row, to.Col, DAMAGE[gw.Game.Board[from.Row][from.Col].Level-1])
			advance_turn(&gw)
			break
		default:
			http.Error(w, "Invalid Action", http.StatusBadRequest)
			return
		}
	}

	gw.LastAccessedAt = time.Now()
	games.Lock()
	games.m[data.LobbyID] = gw
	games.Unlock()

	response := struct {
		Ok      bool    `json:"ok"`
		GameSOA GameSOA `json:"game_soa"`
	}{
		Ok:      valid_action,
		GameSOA: aos2soa(gw.Game),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// >>>
}

func handle_read(w http.ResponseWriter, r *http.Request) {
	// <<<
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var data struct {
		LobbyID string `json:"lobby_id"`
	}
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}

	games.RLock()
	gw, ok := games.m[data.LobbyID]
	games.RUnlock()

	if !ok {
		http.Error(w, "Invalid Lobby ID", http.StatusBadRequest)
		return
	}

	gw.LastAccessedAt = time.Now()
	games.Lock()
	games.m[data.LobbyID] = gw
	games.Unlock()
	response := struct {
		Ok      bool    `json:"ok"`
		GameSOA GameSOA `json:"game_soa"`
	}{
		Ok:      ok,
		GameSOA: aos2soa(gw.Game),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// >>>
}

// =============================================================================

var games = struct {
	sync.RWMutex
	m map[string]GameWrapper
}{
	m: make(map[string]GameWrapper),
}

func main() {
	// <<<
	http.Handle("/", http.FileServer(http.Dir("./static")))
	http.HandleFunc("/api/join", handle_join)
	http.HandleFunc("/api/new/lobby", handle_new_lobby)
	http.HandleFunc("/api/new/player", handle_new_player)
	http.HandleFunc("/api/action", handle_action)
	http.HandleFunc("/api/read", handle_read)

	if false {
		go func() {
			// <<< cleanup
			ticker := time.NewTicker(time.Hour)
			defer ticker.Stop()

			for range ticker.C {
				fmt.Println("Starting cleanup.")

				var keysToDelete []string
                games.RLock()
				for k, v := range games.m {
					if time.Since(v.LastAccessedAt) >= time.Hour {
						keysToDelete = append(keysToDelete, k)
					}
				}
                games.RUnlock()

				fmt.Printf("Cleaning up %v games...\n", len(keysToDelete))

                games.Lock()
				for _, key := range keysToDelete {
					delete(games.m, key)
				}
                games.Unlock()

				fmt.Println("Cleanup complete.")
			}
			// >>>
		}()
	}

	log.Println("Server is running on http://localhost:6969")
	log.Fatal(http.ListenAndServe(":6969", nil))
	// >>>
}

/*
<<<
3 2 3
2 4 2
3 2 3

+-------+
| # . . |
| # . . |
| # . . |
+-------+
| . # . |
| . # . |
| . # . |
+-------+
| . . # |
| . . # |
| . . # |
+-------+
| # # # |
| . . . |
| . . . |
+-------+
| . . . |
| # # # |
| . . . |
+-------+
| . . . |
| . . . |
| # # # |
+-------+
| # . . |
| . # . |
| . . # |
+-------+
| . . # |
| . # . |
| # . . |
+-------+
>>>
*/
