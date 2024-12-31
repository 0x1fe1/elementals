let PLAYER_ID = '';
let LOBBY_ID = '';

async function get(path) {
    try {
        const response = await fetch(path, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

async function post(path, data) {
    try {
        const response = await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

async function init_player() {
    const data = await get("/api/new/player")
    console.log("Response:", data);
    PLAYER_ID = data.player_id ?? '';
}

document.addEventListener("DOMContentLoaded", async () => {
    await init_player()

    const join_lobby_form = document.getElementById("join_lobby");
    const new_lobby_form = document.getElementById("new_lobby");

    join_lobby_form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const lobby_id = document.getElementById("lobby_code").value;
        const data = await post("/api/join", { player_id: PLAYER_ID, lobby_id })
        console.log("Response:", data);
    });
    new_lobby_form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = await post("/api/new/lobby", { player_id: PLAYER_ID })
        console.log("Response:", data);
        LOBBY_ID = data.lobby_id ?? '';
    });
});
