package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"time"
)

// = GAME =========================================================================

// - types ------------------------------------------------------------------------

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

	FS Spell = "FS"
	HV Spell = "HV"
	AF Spell = "AF"
	DT Spell = "DT"
	MS Spell = "MS"
) // }}}

var ( // {{{
	ACTION_TYPES = [...]ActionType{SKIP, SINGLE, DOUBLE}
	CELL_TYPES   = [...]CellType{EMPTY, BLOCK, ELEMENTAL}
	SPELLS       = [...]Spell{FS, HV, AF, DT, MS}
	ELEMENTS     = [...]Element{AIR, ROCK, FIRE, WATER, NATURE, ENERGY}
	LEVELS       = [...]int{1, 2, 3} // 111 -> _2_ points+1 | 222 -> _3_ points+2
	HEALTH       = [...]int{1, 2, 6}
	DAMAGE       = [...]int{1, 2, 4}
	REACH        = [...]int{3, 5, 7}
	SPELL_INDEX  = map[string]int{
		"FS": 0, // Forest  Staff
		"HV": 1, // Healing Vial
		"AF": 2, // Ancient Figurine
		"DT": 3, // Double  Turn
		"MS": 4, // Meteor  Shower
	}
	SPELL_POINTS = [...]int{4, 5, 7, 9, 10}
	SPELL_DAMAGE = [...]int{2, 1, 4}
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

type Action struct {
	// {{{
	Type     ActionType `json:"type"`     // skip == other fields are ignored
	Spell    Spell      `json:"spell"`    // empty means none was used
	Cell     [4]int     `json:"cell"`     // [x  y  0 0] if single; [x1  y1  x2  y2 ] if double
	Moved    [4]int     `json:"moved"`    // [x' y' 0 0] if single; [x1' y1' x2' y2'] if double
	Attacked [4]int     `json:"attacked"` // [x" y" 0 0] if single; [x1" y1" x2" y2"] if double
	// }}}
}

// - functions --------------------------------------------------------------------

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

// = NETWORK ======================================================================

// - types ------------------------------------------------------------------------

type ReqJoinLobby struct {
	LobbyID string `json:"lobby_id"`
}
type ResJoinLobby struct {
	Ok bool `json:"ok"`
}

// type ReqNewLobby struct { }
type ResNewLobby struct {
	LobbyID string `json:"lobby_id"`
}

// - functions --------------------------------------------------------------------

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

func handle_test(w http.ResponseWriter, r *http.Request) {
	// {{{
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	response := make_random_game()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// }}}
}

func handle_join_lobby(w http.ResponseWriter, r *http.Request) {
	// {{{
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var join_data ReqJoinLobby
	err := json.NewDecoder(r.Body).Decode(&join_data)
	if err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}

	log.Printf("Received JSON: %v\n", join_data)

	response := ResJoinLobby{
		Ok: true,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// }}}
}

func handle_new_lobby(w http.ResponseWriter, r *http.Request) {
	// {{{
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	response := ResNewLobby{
		LobbyID: make_id(6),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	// }}}
}

// ================================================================================
// MAIN

func main() {
	http.Handle("/", http.FileServer(http.Dir("./static")))
	http.HandleFunc("/api/test", handle_test)
	http.HandleFunc("/api/join", handle_join_lobby)
	http.HandleFunc("/api/new/lobby", handle_new_lobby)

	// Start the server
	log.Println("Server is running on http://localhost:6969")
	log.Fatal(http.ListenAndServe(":6969", nil))
}
