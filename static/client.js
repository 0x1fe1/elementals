const ELEMENT = {
    AIR: "air",
    ROCK: "rock",
    FIRE: "fire",
    WATER: "water",
    NATURE: "nature",
    ENERGY: "energy",
}
const ELEMENTS = [
    ELEMENT.AIR,
    ELEMENT.ROCK,
    ELEMENT.FIRE,
    ELEMENT.WATER,
    ELEMENT.NATURE,
    ELEMENT.ENERGY,
]
const LEVEL = [1, 2, 3]
const MAX_HEALTH = [1, 2, 6]
const DAMAGE = [1, 2, 4]
const REACH = [3, 5, 7]
const COLORS = {}
COLORS[ELEMENT.AIR]    /**/ = ['#06b6d4', '#7dd3fc'] // cyan-500      sky-300
COLORS[ELEMENT.ROCK]   /**/ = ['#71717a', '#3f3f46'] // zinc-500      zinc-700
COLORS[ELEMENT.FIRE]   /**/ = ['#fb923c', '#dc2626'] // orange-400    red-600
COLORS[ELEMENT.WATER]  /**/ = ['#0ea5e9', '#2563eb'] // sky-500       blue-600
COLORS[ELEMENT.NATURE] /**/ = ['#22c55e', '#0d9488'] // green-500     teal-600
COLORS[ELEMENT.ENERGY] /**/ = ['#d946ef', '#6d28d9'] // fuchsia-500   violet-700
//COLORS[ELEMENT.AIR]    /**/ = { fill: { h: 0, s: 0, l: 0 }, stroke: { h: 0, s: 0, l: 0 } }
//COLORS[ELEMENT.ROCK]   /**/ = { fill: { h: 0, s: 0, l: 0 }, stroke: { h: 0, s: 0, l: 0 } }
//COLORS[ELEMENT.FIRE]   /**/ = { fill: { h: 0, s: 0, l: 0 }, stroke: { h: 0, s: 0, l: 0 } }
//COLORS[ELEMENT.WATER]  /**/ = { fill: { h: 0, s: 0, l: 0 }, stroke: { h: 0, s: 0, l: 0 } }
//COLORS[ELEMENT.NATURE] /**/ = { fill: { h: 0, s: 0, l: 0 }, stroke: { h: 0, s: 0, l: 0 } }
//COLORS[ELEMENT.ENERGY] /**/ = { fill: { h: 0, s: 0, l: 0 }, stroke: { h: 0, s: 0, l: 0 } }

let LOBBY_ID = '';
let mouse = { x: -1000, y: -1000 }

function copy(object) {
    return JSON.parse(JSON.stringify(object))
}

async function get(path) {
    // {{{
    try {
        const response = await fetch(path, { method: "GET", });
        if (!response.ok) { throw new Error("Network response was not ok"); }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
    // }}}
}

async function post(path, data) {
    // {{{
    try {
        const response = await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!response.ok) { throw new Error("Network response was not ok"); }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
    // }}}
}


/** @param {CanvasRenderingContext2D} ctx - The canvas rendering context. */
function render_elemental(ctx, x, y, size, level, element, health) {
    // {{{
    const num_edges = level + 2
    if (level === 1) y += size * 0.15;
    if (level === 3) y += size * 0.05;

    const angles = []
    for (let i = 0; i < num_edges; i++) {
        angles.push(Math.PI * 0.5 + i * 2 * Math.PI / num_edges)
    }

    const points = []
    for (let i = 0; i < num_edges; i++) {
        points.push({
            x: Math.cos(angles[i]),
            y: -Math.sin(angles[i]),
        })
    }

    const vertices = []
    for (let i = 0; i < num_edges; i++) {
        const prev = points[(i - 1 + num_edges) % num_edges]
        const curr = points[i]
        const next = points[(i + 1) % num_edges]
        vertices.push({ x: curr.x + (prev.x - curr.x) / 6, y: curr.y + (prev.y - curr.y) / 6 })
        vertices.push({ x: curr.x + (next.x - curr.x) / 6, y: curr.y + (next.y - curr.y) / 6 })
    }

    for (let i = 0; i < vertices.length; i++) {
        vertices[i].x = vertices[i].x * size + x
        vertices[i].y = vertices[i].y * size + y
    }
    for (let i = 0; i < points.length; i++) {
        points[i].x = points[i].x * size + x
        points[i].y = points[i].y * size + y
    }

    //console.log({ vertices, points })

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 0; i < vertices.length; i += 2) {
        const v12 = points[i / 2]
        const v2 = vertices[i + 1]
        const v3 = vertices[(i + 2) % vertices.length]
        ctx.quadraticCurveTo(v12.x, v12.y, v2.x, v2.y)
        ctx.lineTo(v3.x, v3.y)
    }

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, COLORS[element][0]);
    gradient.addColorStop(1, COLORS[element][1]);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.stroke();

    //ctx.strokeStyle = "red"
    //for (let i = 0; i < vertices.length; i++) {
    //    ctx.beginPath();
    //    ctx.ellipse(vertices[i].x, vertices[i].y, 4, 4, 0, 0, Math.PI * 2)
    //    ctx.stroke();
    //}
    //ctx.strokeStyle = "yellow"
    //for (let i = 0; i < sharp_vertices.length; i++) {
    //    ctx.beginPath();
    //    ctx.ellipse(sharp_vertices[i].x, sharp_vertices[i].y, 4, 4, 0, 0, Math.PI * 2)
    //    ctx.stroke();
    //}
    // }}}
}

function render() {
    // {{{
    const canvas = document.getElementById("cnv");
    if (!canvas || !canvas.getContext) {
        console.error("Canvas not found or not supported!");
        return;
    }

    const BOARD_SIZE = 12;
    const ctx = canvas.getContext("2d");
    let [h, s, l] = [0, 0, 0]

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cell_size = canvas.width / BOARD_SIZE;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const x = col * cell_size;
            const y = row * cell_size;
            const hovering = mouse.x >= x && mouse.x < x + cell_size && mouse.y >= y && mouse.y < y + cell_size;

            if (row < 6) { // green
                if ((col + row) % 2 === 1) {
                    ;[h, s, l] = [140, 70, 45]
                } else {
                    ;[h, s, l] = [140, 75, 35]
                }
            } else { // blue
                if ((col + row) % 2 === 1) {
                    ;[h, s, l] = [200, 90, 50]
                } else {
                    ;[h, s, l] = [200, 100, 40]
                }
            }
            //if (hovering) {
            //    ;[h,s,l] = [48, 96, 53]
            //}

            ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
            ctx.lineWidth = 1;
            ctx.strokeStyle = hovering ? `#e7e7e7` : `#1e293b`
            //ctx.strokeStyle = row < 6 ? `#4ade80` : `#2563eb`
            ctx.fillRect(x, y, cell_size, cell_size);
            ctx.strokeRect(x + 1*hovering, y + 1*hovering, cell_size - 2*hovering, cell_size - 2*hovering);

            //if (selected) {
            //    ctx.fillStyle = `hsl(48, 96%, 53%)`;
            //    ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
            //    ctx.fillStyle = `hsl()`;
            //}
        }
    }

    for (let i = 0; i < 12; i++) {
        render_elemental(ctx, cell_size * 0 + cell_size / 2, cell_size * i + cell_size / 2, cell_size / 2, 1, ELEMENTS[i % 6], 1);
        render_elemental(ctx, cell_size * 1 + cell_size / 2, cell_size * i + cell_size / 2, cell_size / 2, 2, ELEMENTS[i % 6], 1);
        render_elemental(ctx, cell_size * 2 + cell_size / 2, cell_size * i + cell_size / 2, cell_size / 2, 3, ELEMENTS[i % 6], 1);
    }

    requestAnimationFrame(render);
    // }}}
}

document.addEventListener("DOMContentLoaded", async () => {
    // {{{
    const join_lobby_form = document.getElementById("join_lobby");
    const new_lobby_form = document.getElementById("new_lobby");

    join_lobby_form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const lobby_id = document.getElementById("lobby_code").value;
        const data = await post("/api/join", { lobby_id })
        console.log("Response:", data);
        if (data.ok !== true) return
        LOBBY_ID = lobby_id;
        document.querySelector('#response').textContent = `Lobby Code: ${LOBBY_ID}`
    });
    new_lobby_form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = await get("/api/new/lobby")
        console.log("Response:", data);
        if (data.lobby_id == null || data.lobby_id == '') return
        LOBBY_ID = data.lobby_id;
        document.querySelector('#response').textContent = `Lobby Code: ${LOBBY_ID}`
    });

    document.getElementById("cnv").addEventListener("mousemove", (event) => {
        const rect = event.target.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        mouse = { x: mouseX, y: mouseY }
    });
    requestAnimationFrame(render);
    // }}}
});
