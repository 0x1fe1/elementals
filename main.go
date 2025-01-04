package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"slices"
	"strings"
	"time"
)

// {{{ UTILS

func make_id(length int) string {
	// {{{
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	result := make([]byte, length)
	for i := 0; i < length; i++ {
		result[i] = characters[rng.Intn(len(characters))]
	}
	return string(result)
	// }}}
}

// }}}

// {{{ GAME Types
type Element string
type Spell string
type CellType string
type ActionType string

const ( // {{{
	BOARD_SIZE = 12

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
) // }}}

var ( // {{{
	ACTION_TYPES = []ActionType{SKIP, SPELL, MOVE, ATTACK}
	CELL_TYPES   = []CellType{EMPTY, ELEMENTAL, BLOCK}
	SPELLS       = []Spell{FS, HV, AF, DT, MS}
	ELEMENTS     = []Element{AIR, ROCK, FIRE, WATER, NATURE, ENERGY}
	LEVELS       = []int{1, 2, 3} // 111 -> _2_ points+1 | 222 -> _3_ points+2
	HEALTH       = []int{1, 2, 6}
	DAMAGE       = []int{1, 2, 4}
	REACH        = []int{3, 5, 7}
	SPELL_POINTS = []int{4, 5, 7, 9, 10}
	SPELL_DAMAGE = []int{2, 1, 4}
) // }}}

type Cell struct {
	// {{{
	Type    CellType `json:"type"`
	Element Element  `json:"element"`
	Health  int      `json:"health"`
	Level   int      `json:"level"`
	// }}}
}

type Board [BOARD_SIZE][BOARD_SIZE]Cell

type Game struct {
	// {{{
	Board        Board     `json:"board"`
	Players      [2][5]int `json:"players"`
	ActivePlayer int       `json:"active_player"`
	Turn         int       `json:"turn"`
	// }}}
}

type GameWrapper struct {
	// {{{
	Game           Game
	Players        []string
	CreatedAt      time.Time
	LastAccessedAt time.Time
	// }}}
}

type Action struct {
	// {{{
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
	// }}}
}

// }}}

// {{{ GAME Functions
func make_random_game() Game {
	// {{{
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	var game Game

	game.ActivePlayer = rng.Intn(2)
	game.Turn = rng.Intn(36) + 1

	for i := 0; i < 2; i++ {
		for j := 0; j < 5; j++ {
			game.Players[i][j] = rng.Intn(SPELL_POINTS[j] + 1)
		}
	}

	for i := 0; i < BOARD_SIZE; i++ {
		for j := 0; j < BOARD_SIZE; j++ {
			game.Board[i][j].Type = CELL_TYPES[rng.Intn(len(CELL_TYPES))]
			if game.Board[i][j].Type != ELEMENTAL {
				continue
			}
			game.Board[i][j].Element = ELEMENTS[rng.Intn(len(ELEMENTS))]
			game.Board[i][j].Level = LEVELS[rng.Intn(len(LEVELS))]
			game.Board[i][j].Health = rng.Intn(HEALTH[game.Board[i][j].Level-1]) + 1
		}
	}

	return game
	// }}}
}

func make_initial_game() Game {
	// {{{
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	var game Game

	game.ActivePlayer = rng.Intn(2)
	game.Turn = 1

	for i := 0; i < 2; i++ {
		for j := 0; j < 5; j++ {
			game.Players[i][j] = SPELL_POINTS[j]
		}
	}

	elements := make([]Element, len(ELEMENTS))
	copy(elements, ELEMENTS)
	rng.Shuffle(len(elements), func(i, j int) {
		elements[i], elements[j] = elements[j], elements[i]
	})
	num_elements_per_player := rng.Intn(2) + 1

	for i := 0; i < BOARD_SIZE; i++ {
		for j := 0; j < BOARD_SIZE; j++ {
			game.Board[i][j].Type = CELL_TYPES[rng.Intn(2)]
			if game.Board[i][j].Type != ELEMENTAL {
				continue
			}
			game.Board[i][j].Element = elements[rng.Intn(num_elements_per_player)+2*(i/6)]
			game.Board[i][j].Level = LEVELS[0]
			game.Board[i][j].Health = HEALTH[0]
		}
	}

	// for i := 0; i < game.Turn/2; i++ {
	// 	game.Board[i/6][i%6].Type = BLOCK
	// 	game.Board[i/6][11-(i%6)].Type = BLOCK
	// 	game.Board[11-i/6][i%6].Type = BLOCK
	// 	game.Board[11-i/6][11-(i%6)].Type = BLOCK
	// }

	return game
	// }}}
}

var configurations = [8][3][2]int{
	{{-1, -1}, {+0, -1}, {+1, -1}},
	{{-1, +0}, {+0, +0}, {+1, +0}},
	{{-1, +1}, {+0, +1}, {+1, +1}},
	{{-1, -1}, {-1, +0}, {-1, +1}},
	{{+0, -1}, {+0, +0}, {+0, +1}},
	{{+1, -1}, {+1, +0}, {+1, +1}},
	{{-1, -1}, {+0, +0}, {+1, +1}},
	{{+1, -1}, {+0, +0}, {-1, +1}},
}

// offset ::= 0 | 1
func merge_board(prev Board, offset int) Board {
	next := prev
	todo := [BOARD_SIZE / 2][BOARD_SIZE]byte{} // 0=nop; 1=remove; 2=ascend
	o := offset * BOARD_SIZE / 2

	for row := 1; row < BOARD_SIZE/2-1; row++ {
		for col := 1; col < BOARD_SIZE-1; col++ {
			for i := 0; i < len(configurations); i++ {
				conf := configurations[i]
				a := prev[row+conf[0][1]+o][col+conf[0][0]]
				b := prev[row+conf[1][1]+o][col+conf[1][0]]
				c := prev[row+conf[2][1]+o][col+conf[2][0]]
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

	for row := 0; row < BOARD_SIZE/2; row++ {
		for col := 0; col < BOARD_SIZE; col++ {
			switch todo[row][col] {
			case 0:
				break
			case 1:
				next[row+o][col].Type = EMPTY
			case 2:
				fallthrough
			case 3:
				next[row+o][col].Health = HEALTH[prev[row+o][col].Level]
				next[row+o][col].Level += 1
			}
		}
	}

	return next
}

// }}}

// {{{ NETWORK Types
type JoinReq struct {
	PlayerID string `json:"player_id"`
	LobbyID  string `json:"lobby_id"`
}
type JoinRes struct {
	Ok   bool `json:"ok"`
	Game Game `json:"game"`
}

type NewLobbyReq struct {
	PlayerID string `json:"player_id"`
}
type NewLobbyRes struct {
	LobbyID string `json:"lobby_id"`
	Game    Game   `json:"game"`
}

type NewPlayerRes struct {
	PlayerID string `json:"player_id"`
}

type ActionReq struct {
	LobbyID  string `json:"lobby_id"`
	PlayerID string `json:"player_id"`
	Action   Action `json:"action"`
}
type ActionRes struct {
	Ok   bool `json:"ok"`
	Game Game `json:"game"`
}

type ReadReq struct {
	LobbyID string `json:"lobby_id"`
}
type ReadRes struct {
	Ok   bool `json:"ok"`
	Game Game `json:"game"`
}

// }}}

// {{{ NETWORK Functions
func handle_join(w http.ResponseWriter, r *http.Request) {
	// {{{
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var data JoinReq
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}
	log.Printf("Join Lobby Request: %+v\n", data)

	lobby_id := data.LobbyID

	game, ok := games[lobby_id]

	if !ok {
		http.Error(w, "Invalid Lobby ID", http.StatusBadRequest)
		return
	}

	game.LastAccessedAt = time.Now()
	games[lobby_id] = game

	if !slices.Contains(game.Players, data.PlayerID) {
		game.Players = append(game.Players, data.PlayerID)
		games[lobby_id] = game
	}

	log.Printf("Lobby: %v, Players: %+v", lobby_id, game.Players)

	response := JoinRes{
		Ok:   ok,
		Game: game.Game,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// }}}
}

func handle_new_lobby(w http.ResponseWriter, r *http.Request) {
	// {{{
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var data NewLobbyReq
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}
	log.Printf("New Lobby Request: %+v\n", data)

	lobby_id := strings.ToUpper(make_id(6))
	game := make_initial_game()
	games[lobby_id] = GameWrapper{
		Game:           game,
		Players:        []string{data.PlayerID},
		CreatedAt:      time.Now(),
		LastAccessedAt: time.Now(),
	}
	response := NewLobbyRes{
		LobbyID: lobby_id,
		Game:    game,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// }}}
}

func handle_new_player(w http.ResponseWriter, r *http.Request) {
	// {{{
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	player_id := make_id(16)
	response := NewPlayerRes{
		PlayerID: player_id,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// }}}
}

func handle_action(w http.ResponseWriter, r *http.Request) {
	// {{{
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var data ActionReq
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}
	log.Printf("Action Request: %+v\n", data)

	gw, ok := games[data.LobbyID]
	gw.LastAccessedAt = time.Now()
	games[data.LobbyID] = gw

	if !ok {
		http.Error(w, "Invalid Lobby ID", http.StatusBadRequest)
		return
	}

	valid_action := len(gw.Players) >= 2 &&
		slices.Index(gw.Players, data.PlayerID) == gw.Game.ActivePlayer &&
		slices.Index(ACTION_TYPES, data.Action.Type) != -1
	valid_action = true

	if valid_action {
		gw.Game.Turn += 1
		gw.Game.ActivePlayer = (gw.Game.ActivePlayer + 1) % 2

		act := data.Action

		switch act.Type {
		case SKIP:
			gw.Game.Board = merge_board(gw.Game.Board, gw.Game.Turn%2)
		case SPELL:
		case MOVE:
			gw.Game.Board[act.To.Row][act.To.Col], gw.Game.Board[act.From.Row][act.From.Col] =
				gw.Game.Board[act.From.Row][act.From.Col], gw.Game.Board[act.To.Row][act.To.Col]
		case ATTACK:
		default:
			http.Error(w, "Invalid Action", http.StatusBadRequest)
			return
		}

		games[data.LobbyID] = gw
	}

	response := ActionRes{
		Ok:   valid_action,
		Game: gw.Game,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// }}}
}

func handle_read(w http.ResponseWriter, r *http.Request) {
	// {{{
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var data ReadReq
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}
	// log.Printf("Read Request: %+v\n", data)

	game, ok := games[data.LobbyID]
	response := ReadRes{Ok: ok}

	if ok {
		game.LastAccessedAt = time.Now()
		games[data.LobbyID] = game
	}

	response.Game = game.Game

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// }}}
}

// }}}

// {{{ MAIN

var games = make(map[string]GameWrapper)

func main() {
	http.Handle("/", http.FileServer(http.Dir("./static")))
	http.HandleFunc("/api/join", handle_join)
	http.HandleFunc("/api/new/lobby", handle_new_lobby)
	http.HandleFunc("/api/new/player", handle_new_player)
	http.HandleFunc("/api/action", handle_action)
	http.HandleFunc("/api/read", handle_read)

	if false {
		go func() {
			// {{{ cleanup
			ticker := time.NewTicker(time.Hour)
			defer ticker.Stop()

			for range ticker.C {
				fmt.Println("Starting cleanup.")

				var keysToDelete []string
				for k, v := range games {
					if time.Since(v.LastAccessedAt) >= time.Hour {
						keysToDelete = append(keysToDelete, k)
					}
				}

				fmt.Printf("Cleaning up %v games...\n", len(keysToDelete))

				for _, key := range keysToDelete {
					delete(games, key)
				}

				fmt.Println("Cleanup complete.")
			}
			// }}}
		}()
	}

	log.Println("Server is running on http://localhost:6969")
	log.Fatal(http.ListenAndServe(":6969", nil))
}

// }}}

/*

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
*/
