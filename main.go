package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"slices"
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

// {{{ GAME

// {{{ Types
type Element string
type Spell string
type CellType string
type ActionType string

const ( // {{{
	BOARD_SIZE = 12

	SKIP   ActionType = "skip"
	SINGLE ActionType = "single"
	DOUBLE ActionType = "double"

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
	ACTION_TYPES = []ActionType{SKIP, SINGLE, DOUBLE}
	CELL_TYPES   = []CellType{EMPTY, BLOCK, ELEMENTAL}
	SPELLS       = []Spell{FS, HV, AF, DT, MS}
	ELEMENTS     = []Element{AIR, ROCK, FIRE, WATER, NATURE, ENERGY}
	LEVELS       = []int{1, 2, 3} // 111 -> _2_ points+1 | 222 -> _3_ points+2
	HEALTH       = []int{1, 2, 6}
	DAMAGE       = []int{1, 2, 4}
	REACH        = []int{3, 5, 7}
	SPELL_POINTS = []int{4, 5, 7, 9, 10}
	SPELL_DAMAGE = []int{2, 1, 4}
) // }}}

type Game struct {
	// {{{
	Board [BOARD_SIZE][BOARD_SIZE]struct {
		Type    CellType `json:"type"`
		Element Element  `json:"element"`
		Health  int      `json:"health"`
		Level   int      `json:"level"`
	} `json:"board"`
	Players      [2][5]int `json:"players"`
	ActivePlayer int       `json:"active_player"`
	Turn         int       `json:"turn"` // at the end of every even turn, add blocks
	// }}}
}

type GameWrapper struct {
	// {{{
	Game      Game
	Players   []string
	CreatedAt time.Time
	// }}}
}

type Action struct {
	// {{{
	Type     ActionType `json:"type"`     // skip == other fields are ignored
	Spell    Spell      `json:"spell"`    // empty means none was used
	Cell     [4]int     `json:"cell"`     // [x  y  0 0] if single; [x1  y1  x2  y2 ] if double
	Moved    [4]int     `json:"moved"`    // [x' y' 0 0] if single; [x1' y1' x2' y2'] if double
	Attacked [4]int     `json:"attacked"` // [x" y" 0 0] if single; [x1" y1" x2" y2"] if double
	// }}}
}

// }}}

// {{{ Functions
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

// }}}

// }}}

// {{{ NETWORK

// {{{ Types
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

// }}}

// {{{ Functions
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

	lobby_id := make_id(6)
	game := make_random_game()
	games[lobby_id] = GameWrapper{
		Game:      game,
		Players:   []string{data.PlayerID},
		CreatedAt: time.Now(),
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

	game, ok := games[data.LobbyID]

	if !ok {
		http.Error(w, "Invalid Lobby ID", http.StatusBadRequest)
		return
	}

	if len(game.Players) >= 2 &&
		slices.Index(game.Players, data.PlayerID) == game.Game.ActivePlayer &&
		slices.Index(ACTION_TYPES, data.Action.Type) != -1 {
		game.Game.Turn += 1
		game.Game.ActivePlayer = (game.Game.ActivePlayer + 1) % 2

		switch data.Action.Type {
		case SKIP:
			break
		case SINGLE:
			{
			}
		case DOUBLE:
			{
			}
		}

        games[data.LobbyID] = game
	}

	response := ActionRes{
		Ok:   ok,
		Game: game.Game,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// }}}
}

// }}}

// }}}

// {{{ MAIN

var games = make(map[string]GameWrapper)

func main() {
	http.Handle("/", http.FileServer(http.Dir("./static")))
	http.HandleFunc("/api/join", handle_join)
	http.HandleFunc("/api/new/lobby", handle_new_lobby)
	http.HandleFunc("/api/new/player", handle_new_player)
	http.HandleFunc("/api/action", handle_action)

	go func() {
		// {{{ cleanup
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			fmt.Println("Starting cleanup.")

			var keysToDelete []string
			for k, v := range games {
				if time.Since(v.CreatedAt) >= time.Hour {
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

	log.Println("Server is running on http://localhost:6969")
	log.Fatal(http.ListenAndServe(":6969", nil))
}

// }}}
