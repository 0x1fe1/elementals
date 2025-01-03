const ELEMENT = {
    AIR: 'air',
    ROCK: 'rock',
    FIRE: 'fire',
    WATER: 'water',
    NATURE: 'nature',
    ENERGY: 'energy',
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
COLORS[ELEMENT.AIR]    /**/ = [{ r: 0x06, g: 0xb6, b: 0xd4 }, { r: 0x7d, g: 0xd3, b: 0xfc }] // cyan-500      sky-300
COLORS[ELEMENT.ROCK]   /**/ = [{ r: 0x71, g: 0x71, b: 0x7a }, { r: 0x3f, g: 0x3f, b: 0x46 }] // zinc-500      zinc-700
COLORS[ELEMENT.FIRE]   /**/ = [{ r: 0xfb, g: 0x92, b: 0x3c }, { r: 0xdc, g: 0x26, b: 0x26 }] // orange-400    red-600
COLORS[ELEMENT.WATER]  /**/ = [{ r: 0x0e, g: 0xa5, b: 0xe9 }, { r: 0x25, g: 0x63, b: 0xeb }] // sky-500       blue-600
COLORS[ELEMENT.NATURE] /**/ = [{ r: 0x22, g: 0xc5, b: 0x5e }, { r: 0x0d, g: 0x94, b: 0x88 }] // green-500     teal-600
COLORS[ELEMENT.ENERGY] /**/ = [{ r: 0xd9, g: 0x46, b: 0xef }, { r: 0x6d, g: 0x28, b: 0xd9 }] // fuchsia-500   violet-700
const SPELL = {
    FS: 'fs',
    HV: 'hv',
    AF: 'af',
    DT: 'dt',
    MS: 'ms',
}

const PI = Math.PI;
let GAME = null;
let LOBBY_ID = null;
let PLAYER_ID = null;
let pointer = { x: -1000, y: -1000 }
let selected_cell_prev = { row: -1, col: -1 }
let selected_cell = { row: -1, col: -1 }

function copy(object) {
    return JSON.parse(JSON.stringify(object))
}

async function get(path) {
    // {{{
    try {
        const response = await fetch(path, { method: 'GET', });
        if (!response.ok) { throw new Error('Network response was not ok'); }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
    // }}}
}

async function post(path, data) {
    // {{{
    try {
        const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) { throw new Error('Network response was not ok'); }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
    // }}}
}

//function render_block({ ctx, x, y, radius }) {
//    // {{{
//    radius *= 1.2;
//    const num_points = 4
//
//    const angles = []
//    for (let i = 0; i < num_points; i++) {
//        angles.push(PI / 4 + i * 2 * PI / num_points)
//    }
//
//    const points = []
//    for (let i = 0; i < num_points; i++) {
//        points.push({
//            x: Math.cos(angles[i]),
//            y: -Math.sin(angles[i]),
//        })
//    }
//
//    const inner_points = []
//    for (let i = 0; i < num_points; i++) {
//        inner_points.push({
//            x: points[i].x * 0.7,
//            y: points[i].y * 0.7,
//        })
//    }
//
//    const vertices = []
//    for (let i = 0; i < num_points; i++) {
//        const prev = points[(i - 1 + num_points) % num_points]
//        const curr = points[i]
//        const next = points[(i + 1) % num_points]
//        vertices.push({ x: curr.x + (prev.x - curr.x) / 6, y: curr.y + (prev.y - curr.y) / 6 })
//        vertices.push({ x: curr.x + (next.x - curr.x) / 6, y: curr.y + (next.y - curr.y) / 6 })
//    }
//
//    for (let i = 0; i < vertices.length; i++) {
//        vertices[i].x = vertices[i].x * radius + x
//        vertices[i].y = vertices[i].y * radius + y
//    }
//    for (let i = 0; i < points.length; i++) {
//        points[i].x = points[i].x * radius + x
//        points[i].y = points[i].y * radius + y
//    } inner_points
//    for (let i = 0; i < inner_points.length; i++) {
//        inner_points[i].x = inner_points[i].x * radius + x
//        inner_points[i].y = inner_points[i].y * radius + y
//    }
//
//    ctx.beginPath();
//    ctx.moveTo(vertices[0].x, vertices[0].y);
//    for (let i = 0; i < vertices.length; i += 2) {
//        const p1 = points[i / 2]
//        const v1 = vertices[i + 1]
//        const v2 = vertices[(i + 2) % vertices.length]
//        ctx.quadraticCurveTo(p1.x, p1.y, v1.x, v1.y)
//        ctx.lineTo(v2.x, v2.y)
//    }
//
//    //const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
//    //gradient.addColorStop(0, COLORS[element][0]);
//    //gradient.addColorStop(1, COLORS[element][1]);
//    ctx.fillStyle = '#737373';
//    ctx.fill();
//    ctx.strokeStyle = '#262626';
//    ctx.lineWidth = 2;
//    ctx.stroke();
//
//    ctx.fillStyle = '#262626';
//    for (let i = 0; i < inner_points.length; i++) {
//        ctx.beginPath();
//        ctx.ellipse(inner_points[i].x, inner_points[i].y, radius * 0.1, radius * 0.1, 0, 0, PI * 2)
//        ctx.fill();
//    }
//    // }}}
//}

function render_elemental({ ctx, x, y, radius, reverse, preview, level, element, health, type }) {
    // {{{
    if (type !== 'elemental') return;

    const num_points = level + 2
    let delta_y = 0;
    if (level === 1) delta_y += radius * 0.15 * (reverse ? -1 : 1);
    if (level === 3) delta_y += radius * 0.05 * (reverse ? -1 : 1);

    const MULTS = {
        1: 0.7,
        2: 0.8,
        3: 0.9,
    }
    const size_mult = MULTS[level] ?? 1.0

    const angles = []
    for (let i = 0; i < num_points; i++) {
        angles.push(
            (reverse ? -1 : 1) * PI * 0.5 +
            i * 2 * PI / num_points
        )
    }

    const points = []
    for (let i = 0; i < num_points; i++) {
        points.push({
            x: Math.cos(angles[i]),
            y: -Math.sin(angles[i]),
        })
    }

    const vertices = []
    for (let i = 0; i < num_points; i++) {
        const prev = points[(i - 1 + num_points) % num_points]
        const curr = points[i]
        const next = points[(i + 1) % num_points]
        vertices.push({ x: curr.x + (prev.x - curr.x) / 6, y: curr.y + (prev.y - curr.y) / 6 })
        vertices.push({ x: curr.x + (next.x - curr.x) / 6, y: curr.y + (next.y - curr.y) / 6 })
    }

    for (let i = 0; i < vertices.length; i++) {
        vertices[i].x = vertices[i].x * radius * size_mult + x
        vertices[i].y = vertices[i].y * radius * size_mult + y + delta_y
    }
    for (let i = 0; i < points.length; i++) {
        points[i].x = points[i].x * radius * size_mult + x
        points[i].y = points[i].y * radius * size_mult + y + delta_y
    }

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 0; i < vertices.length; i += 2) {
        const v12 = points[i / 2]
        const v2 = vertices[i + 1]
        const v3 = vertices[(i + 2) % vertices.length]
        ctx.quadraticCurveTo(v12.x, v12.y, v2.x, v2.y)
        ctx.lineTo(v3.x, v3.y)
    }

    const alpha = preview ? ',0.5' : ''
    const gradient = ctx.createRadialGradient(x, y + delta_y, 0, x, y + delta_y, radius);
    const c1 = COLORS[element][0];
    const c2 = COLORS[element][1];
    gradient.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b}${alpha})`);
    gradient.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b}${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = `rgba(${0x1f},${0x29},${0x37}${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // HEALTH RENDER
    const max_hp = MAX_HEALTH[level - 1];
    const hp_percentage = Math.max(0, Math.min(1, health / max_hp));
    const health_angles = [
        -PI / 2,
        -PI / 2 - hp_percentage * 2 * PI
    ];
    const hp_y = y + (reverse ? -1 : 1) * radius * 0.7;
    const hp_r = radius * 0.2;
    //console.log({ x, y, hp_percentage, max_hp, health_angles })

    ctx.fillStyle = hp_percentage <= 0.33
        ? `rgba(255,0,0${alpha})`
        : hp_percentage <= 0.5
            ? `rgba(255,255,0${alpha})`
            : `rgba(0,255,0${alpha})`;
    ctx.beginPath();
    ctx.moveTo(x, hp_y);
    ctx.lineTo(x, hp_y - hp_r);
    ctx.arc(x, hp_y, hp_r, health_angles[0], health_angles[1], true);
    ctx.closePath();
    ctx.fill();

    if (hp_percentage < 1) {
        ctx.fillStyle = `rgba(${0x1f},${0x29},${0x37}${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x, hp_y);
        ctx.lineTo(x, hp_y - hp_r);
        ctx.arc(x, hp_y, hp_r, health_angles[0], health_angles[1], false);
        ctx.closePath();
        ctx.fill();
    }

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(${0x1f},${0x29},${0x37}${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, hp_y, hp_r, hp_r, 0, 0, PI * 2)
    ctx.stroke();
    // }}}
}

function render() {
    // {{{
    if (GAME === null) {
        requestAnimationFrame(render);
        return;
    }

    const canvas = document.getElementById('cnv');
    if (!canvas || !canvas.getContext) {
        console.error('Canvas not found or not supported!');
        return;
    }

    const BOARD_SIZE = 12;
    const ctx = canvas.getContext('2d');
    let [h, s, l] = [0, 0, 0]
    const m = { x: pointer.x * canvas.width, y: pointer.y * canvas.height }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const delta = 2

    const cell_size = canvas.width / BOARD_SIZE;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const x = col * cell_size;
            const y = row * cell_size;
            const selected = row === selected_cell.row && col === selected_cell.col;
            const hovering = m.x >= x && m.x < x + cell_size && m.y >= y && m.y < y + cell_size;

            if (row < 6) { // green
                if ((col + row) % 2 === 1) {
                    ;[h, s, l] = [140, 70, 45]
                } else {
                    ;[h, s, l] = [140, 75, 35]
                }
            } else { // blue
                if ((col + row) % 2 === 1) {
                    ;[h, s, l] = [200, 80, 45]
                } else {
                    ;[h, s, l] = [200, 90, 35]
                }
            }

            const cell = GAME.board[row][col];
            if (cell.type === 'block') {
                s = 0;
            }
            ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
            ctx.strokeStyle = `#1e293b`
            ctx.lineWidth = 1;
            ctx.fillRect(x, y, cell_size, cell_size);
            ctx.strokeRect(x, y, cell_size, cell_size);

            //if (cell.type === 'block') continue;
            if (hovering) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = `#cbd5e1`
                ctx.strokeRect(x + delta, y + delta, cell_size - delta * 2, cell_size - delta * 2);
            }
            if (selected) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = `#fef08a`
                ctx.strokeRect(x + delta, y + delta, cell_size - delta * 2, cell_size - delta * 2);
            }

            if (cell.type !== 'elemental') continue;
            render_elemental({
                ctx,
                x: x + cell_size / 2,
                y: y + cell_size / 2,
                radius: cell_size / 2,
                reverse: row < 6,
                preview: (col + row) % 2 === 0,
                ...cell,
            })
        }
    }

    requestAnimationFrame(render);
    // }}}
}

document.addEventListener('DOMContentLoaded', async () => {
    // {{{
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const join_lobby_form = document.getElementById('join_lobby');
    const new_lobby = document.getElementById('new_lobby');
    const canvas = document.getElementById('cnv');
    const skip = document.getElementById('skip');
    const confirm = document.getElementById('confirm');

    if (sessionStorage.getItem('PLAYER_ID') != null) {
        PLAYER_ID = sessionStorage.getItem('PLAYER_ID');
    } else {
        PLAYER_ID = (await get('/api/new/player')).player_id;
        sessionStorage.setItem('PLAYER_ID', PLAYER_ID);
    }

    join_lobby_form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const lobby_id = document.getElementById('lobby_code').value;
        const data = await post('/api/join', { lobby_id, player_id: PLAYER_ID })
        console.log('Response:', data);
        if (data.ok !== true) return
        LOBBY_ID = lobby_id;
        GAME = data.game;
        document.querySelector('#response').textContent = `Lobby Code: ${LOBBY_ID}`
    });
    new_lobby.addEventListener('click', async (_) => {
        const data = await post('/api/new/lobby', { player_id: PLAYER_ID })
        console.log('Response:', data);
        if (data.lobby_id == null || data.lobby_id == '') return
        LOBBY_ID = data.lobby_id;
        GAME = data.game;
        document.querySelector('#response').textContent = `Lobby Code: ${LOBBY_ID}`;
    });

    if (!isMobile) {
        canvas.addEventListener('pointermove', (event) => {
            const rect = event.target.getBoundingClientRect();
            const pointerX = (event.clientX - rect.left) / rect.width;
            const pointerY = (event.clientY - rect.top) / rect.height;
            pointer = { x: pointerX, y: pointerY };
        });
    }
    canvas.addEventListener('pointerup', (event) => {
        const rect = event.target.getBoundingClientRect();
        const pointerX = (event.clientX - rect.left) / rect.width;
        const pointerY = (event.clientY - rect.top) / rect.height;
        const col = Math.floor(pointerX * 12);
        const row = Math.floor(pointerY * 12);
        selected_cell_prev = selected_cell;
        selected_cell = { row, col };

        GAME == null ? {} : console.log(
            GAME.board[selected_cell_prev.row][selected_cell_prev.col] ?? {},
            GAME.board[selected_cell.row][selected_cell.col] ?? {},
        )
    });

    skip.addEventListener('click', async (event) => {
        event.preventDefault();
        const data = await post('/api/action', {
            lobby_id: LOBBY_ID,
            player_id: PLAYER_ID,
            action: {
                type: 'skip',
            }
        })
        console.log('Response:', data);
        if (data.ok !== true) return
        GAME = data.game;
        document.querySelector('#response').textContent = `Lobby Code: ${LOBBY_ID}`;
    })
    confirm.addEventListener('click', (_) => {})

    requestAnimationFrame(render);
    // }}}
});
