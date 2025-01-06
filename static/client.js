// <<< GAME CONSTS
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
const HEALTH = [1, 2, 6]
const DAMAGE = [1, 2, 4]
const REACH = [3, 5, 7]
const COLORS = {}
COLORS[ELEMENT.AIR]    /**/ = [{ r: 0x06, g: 0xb6, b: 0xd4 }, { r: 0x7d, g: 0xd3, b: 0xfc }] // cyan-500      sky-300
COLORS[ELEMENT.ROCK]   /**/ = [{ r: 0x71, g: 0x71, b: 0x7a }, { r: 0x3f, g: 0x3f, b: 0x46 }] // zinc-500      zinc-700
COLORS[ELEMENT.FIRE]   /**/ = [{ r: 0xfb, g: 0x92, b: 0x3c }, { r: 0xdc, g: 0x26, b: 0x26 }] // orange-400    red-600
COLORS[ELEMENT.WATER]  /**/ = [{ r: 0x0e, g: 0xa5, b: 0xe9 }, { r: 0x25, g: 0x63, b: 0xeb }] // sky-500       blue-600
COLORS[ELEMENT.NATURE] /**/ = [{ r: 0x22, g: 0xc5, b: 0x5e }, { r: 0x0d, g: 0x94, b: 0x88 }] // green-500     teal-600
COLORS[ELEMENT.ENERGY] /**/ = [{ r: 0xd9, g: 0x46, b: 0xef }, { r: 0x6d, g: 0x28, b: 0xd9 }] // fuchsia-500   violet-700
const SPELL = { FS: 'fs', HV: 'hv', AF: 'af', DT: 'dt', MS: 'ms' };
const SPELLS = [SPELL.FS, SPELL.HV, SPELL.AF, SPELL.DT, SPELL.MS];
const CHARGES = {}
CHARGES[SPELL.FS] = 4;
CHARGES[SPELL.HV] = 5;
CHARGES[SPELL.AF] = 7;
CHARGES[SPELL.DT] = 9;
CHARGES[SPELL.MS] = 10;
const CELLTYPE = {
    ELEMENTAL: 'elemental',
    BLOCK: 'block',
    EMPTY: 'empty',
};
const ACTION = {
    SKIP: 'skip',
    SPELL: 'spell',
    MOVE: 'move',
    ATTACK: 'attack',
};
// >>>

const SIZE = 12;
const PI = Math.PI;
let CELL_SIZE = 1;
let GAME = null;
let LOBBY_ID = null;
let PLAYER_ID = null;
let PLAYER_INDEX = 0;
let POINTER = { x: -1000, y: -1000 };
let SELECTED_ELEMENTAL = { row: -1, col: -1 };
let SELECTED_CELL = { row: -1, col: -1 };
let SELECTED_SPELL = '';
let HOVERED_CELL = { row: -1, col: -1 };
let IS_MOBILE = false;
let CAN_USE_SPELL = true;

function copy(object) {
    return JSON.parse(JSON.stringify(object))
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
    return a * (1 - t) + b * t;
}

function valid(pos) {
    return pos.row >= 0 && pos.row < 12 && pos.col >= 0 && pos.col < 12;
}

function correct_player(pos) {
    // <<<
    //return PLAYER_INDEX !== GAME.active_player && pos.row < BOARD_SIZE / 2
    return (PLAYER_INDEX === 1) !== (Math.floor(pos.row / (SIZE / 2)) !== GAME.active_player)
    /*
    what have i created...
PLAYER_INDEX  = 0
active_player = 0
row < 6  -> false
row >= 6 -> true

PLAYER_INDEX  = 0
active_player = 1
row < 6  -> true
row >= 6 -> false

PLAYER_INDEX  = 1
active_player = 0
row < 6  -> true
row >= 6 -> false

PLAYER_INDEX  = 1
active_player = 1
row < 6  -> false
row >= 6 -> true
    */
    // >>>
}

function different_players(pos1, pos2) {
    return Math.floor(pos1.row / (SIZE / 2)) !== Math.floor(pos2.row / (SIZE / 2))
}

function get_cell(pos) {
    if (!valid(pos) || GAME == null || GAME.board == null) return null
    return GAME.board[pos.row][pos.col]
}

function equal(pos1, pos2) {
    return pos1.col === pos2.col && pos1.row === pos2.row;
}

function update_game(game) {
    // <<<
    if (GAME != null && GAME.active_player != game.active_player) {
        CAN_USE_SPELL = true;
        Array.from(document.querySelectorAll("#spells > *")).map(e => e.style['filter'] = '')
        SELECTED_ELEMENTAL = { row: -1, col: -1 };
        SELECTED_SPELL = '';
    }
    SPELLS.map((s, i) => {
        document.querySelector(`#${s}>p`).textContent = `${game.players[PLAYER_INDEX][i] ?? 0}/${CHARGES[s]}`;
    })
    GAME = game
    if (PLAYER_INDEX === 1) {
        GAME.board = GAME.board.toReversed();
    }
    // >>>
}

function aos2soa(aos) {
    // <<<
    let soa = {
        players: aos.players,
        active_player: aos.active_player,
        turn: aos.turn,
        board_soa: {
            type: new Array(SIZE).fill().map(() => new Array(SIZE).fill()),
            element: new Array(SIZE).fill().map(() => new Array(SIZE).fill()),
            health: new Array(SIZE).fill().map(() => new Array(SIZE).fill()),
            level: new Array(SIZE).fill().map(() => new Array(SIZE).fill()),
        }
    }

    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            soa.board_soa.type[i][j] = aos.board[i][j].type
            soa.board_soa.element[i][j] = aos.board[i][j].element
            soa.board_soa.health[i][j] = aos.board[i][j].health
            soa.board_soa.level[i][j] = aos.board[i][j].level
        }
    }

    return soa
    // >>>
}
function soa2aos(soa) {
    // <<<
    let aos = {
        players: soa.players,
        active_player: soa.active_player,
        turn: soa.turn,
        board: new Array(SIZE).fill(null).map(() => new Array(SIZE).fill(null)),
    }

    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            aos.board[i][j] = {
                type: soa.board_soa.type[i][j],
                element: soa.board_soa.element[i][j],
                health: soa.board_soa.health[i][j],
                level: soa.board_soa.level[i][j],
            }
        }
    }

    return aos
    // >>>
}

function get_path(grid, start, target) {
    // <<<
    const directions = [
        { row: -1, col: 0 }, // Up
        { row: 1, col: 0 },  // Down
        { row: 0, col: -1 }, // Left
        { row: 0, col: 1 }   // Right
    ];

    function is_valid(row, col) {
        return (
            (start.row < SIZE / 2 && row >= 0 && row < SIZE / 2 ||
                start.row >= SIZE / 2 && row >= SIZE / 2 && row < SIZE) &&
            col >= 0 && col < SIZE &&
            grid[row][col].type === CELLTYPE.EMPTY
        );
    }

    const queue = [{ row: start.row, col: start.col, path: [{ row: start.row, col: start.col }] }];
    const visited = new Set();
    visited.add(`${start.row},${start.col}`);

    while (queue.length > 0) {
        const current = queue.shift();
        if (current.row === target.row && current.col === target.col) {
            return { ok: true, path: current.path };
        }
        for (const dir of directions) {
            const newRow = current.row + dir.row;
            const newCol = current.col + dir.col;

            if (is_valid(newRow, newCol) && !visited.has(`${newRow},${newCol}`)) {
                visited.add(`${newRow},${newCol}`);
                queue.push({
                    row: newRow,
                    col: newCol,
                    path: [...current.path, { row: newRow, col: newCol }]
                });
            }
        }
    }

    return { ok: false, path: [] };
    // >>>
}

async function fetch_get(path) {
    // <<<
    try {
        const response = await fetch(path, { method: 'GET', });
        if (!response.ok) {
            console.error('FETCH GET ERROR. RESPONSE:', response)
            const text = await response.text();
            const index = text.indexOf('\n');
            throw new Error(text.substring(0, index === -1 ? text.length : index));
        }
        const result = await response.json();
        return { ok: true, result, error: null };
    } catch (error) {
        console.error('Error:', error);
        document.querySelector('#error-response').textContent = error;
        return { ok: false, result: null, error };
    }
    // >>>
}

async function fetch_post(path, data) {
    // <<<
    try {
        const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            console.error('FETCH POST ERROR. RESPONSE:', response)
            const text = await response.text();
            const index = text.indexOf('\n');
            throw new Error(text.substring(0, index === -1 ? text.length : index));
        }
        const result = await response.json();
        return { ok: true, result, error: null };
    } catch (error) {
        console.error('Error:', error);
        document.querySelector('#error-response').textContent = error;
        return { ok: false, result: null, error };
    }
    // >>>
}

function get_attack_range(pos) {
    // <<<
    const cell = GAME.board[pos.row][pos.col]

    const r = REACH[cell.level - 1] ?? 0
    let col_a = clamp(pos.col - 1, 0, SIZE - 1)
    let col_b = clamp(pos.col + 1, 0, SIZE - 1)
    let row_a = clamp(pos.row + 1, SIZE / 2 + 1, SIZE - 1)
    let row_b = clamp(pos.row + r, SIZE / 2 + 1, SIZE - 1)
    if (pos.row >= SIZE / 2) {
        row_a = clamp(pos.row - r, 0, SIZE / 2)
        row_b = clamp(pos.row - 1, 0, SIZE / 2)
    }

    return { col: [col_a, col_b], row: [row_a, row_b] }
    // >>>
}

function able_to_attack(pos) {
    // <<<
    const cell = get_cell(pos)
    if (cell == null) return false;
    if (cell.type !== CELLTYPE.ELEMENTAL) return false;

    const range = get_attack_range(pos)

    for (let i = range.row[0]; i <= range.row[1]; i++) {
        for (let j = range.col[0]; j <= range.col[1]; j++) {
            if (GAME.board[i][j].type == CELLTYPE.ELEMENTAL) {
                return true
            }
        }
    }

    return false
    // >>>
}

function can_attack(from, to) {
    // <<<
    const cell1 = get_cell(from)
    if (cell1 == null || cell1.type !== CELLTYPE.ELEMENTAL) return false;

    const cell2 = get_cell(to)
    if (cell2 == null || cell2.type !== CELLTYPE.ELEMENTAL) return false;

    const reach = REACH[cell1.level - 1]
    if (Math.abs(from.row - to.row) > reach || Math.abs(from.col - to.col) > 1) {
        return false
    }

    return true
    // >>>
}

function draw_arrow({ ctx, from, to, arrowWidth, color }) {
    // <<<
    //variables to be used when creating the arrow
    let headlen = 10;
    let angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.save();
    ctx.strokeStyle = color;

    //starting path of the arrow from the start square to the end square
    //and drawing the stroke
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = arrowWidth;
    ctx.stroke();

    //starting a new path from the head of the arrow to one of the sides of
    //the point
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 7),
        to.y - headlen * Math.sin(angle - Math.PI / 7));

    //path from the side point of the arrow, to the other side point
    ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 7),
        to.y - headlen * Math.sin(angle + Math.PI / 7));

    //path from the side point back to the tip of the arrow, and then
    //again to the opposite side point
    ctx.lineTo(to.x, to.y);
    ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 7),
        to.y - headlen * Math.sin(angle - Math.PI / 7));

    //draws the paths created above
    ctx.stroke();
    ctx.restore();
    // >>>
}

function preview_path(ctx, path) {
    // <<<
    for (let i = 0; i < path.length - 1; i++) {
        const from1 = path[i]
        const to1 = path[i + 1]
        const from2 = {
            x: from1.col * CELL_SIZE + CELL_SIZE / 2,
            y: from1.row * CELL_SIZE + CELL_SIZE / 2,
        }
        const to2 = {
            x: to1.col * CELL_SIZE + CELL_SIZE / 2,
            y: to1.row * CELL_SIZE + CELL_SIZE / 2,
        }
        const from3 = {
            x: lerp(from2.x, to2.x, 0.25),
            y: lerp(from2.y, to2.y, 0.25),
        }
        const to3 = {
            x: lerp(to2.x, from2.x, 0.25),
            y: lerp(to2.y, from2.y, 0.25),
        }
        draw_arrow({ ctx, from: from3, to: to3, arrowWidth: 10, color: 'hsla(200, 95%, 75%)' }
        )
    }
    // >>>
}

function preview_elemental(ctx, from, to) {
    // <<<
    if (valid(from) && valid(to) &&
        !equal(from, to) &&
        !different_players(from, to) &&
        get_cell(from).type === CELLTYPE.ELEMENTAL &&
        get_cell(to).type === CELLTYPE.EMPTY) {
        render_elemental({
            ctx,
            x: to.col * CELL_SIZE + CELL_SIZE / 2,
            y: to.row * CELL_SIZE + CELL_SIZE / 2,
            radius: CELL_SIZE / 2,
            reverse: to.row < (SIZE / 2),
            preview: true,
            ...get_cell(from),
        })
    }
    // >>>
}

function render_health({ ctx, x, y, radius, reverse, level, health, alpha, damage }) {
    // <<<
    const max_hp = HEALTH[level - 1];
    const hp_percentage = clamp(health / max_hp, 0, 1);
    const health_angles = [
        -PI / 2,
        -PI / 2 - hp_percentage * 2 * PI
    ];

    const damage_percentage = clamp(damage / health, 0, 0.999)
    const damage_angles = [
        health_angles[1],
        lerp(health_angles[1], health_angles[0], damage_percentage),
    ];

    const circle_x = x;
    const circle_y = y + (reverse ? -1 : 1) * radius * 0.7;
    const circle_r = radius * 0.2 * (damage > 0 ? 1.5 : 1);
    //console.log({ x, y, hp_percentage, max_hp, health_angles })

    // health
    ctx.fillStyle = hp_percentage <= 0.33
        ? `rgba(255,0,0${alpha})`
        : hp_percentage <= 0.5
            ? `rgba(255,255,0${alpha})`
            : `rgba(0,255,0${alpha})`;
    ctx.beginPath();
    ctx.moveTo(circle_x, circle_y);
    ctx.lineTo(circle_x, circle_y - circle_r);
    ctx.arc(circle_x, circle_y, circle_r, health_angles[0], health_angles[1], true);
    ctx.closePath();
    ctx.fill();

    // damage
    if (damage > 0) {
        ctx.fillStyle = `rgba(255,0,0${alpha})`;
        ctx.beginPath();
        ctx.moveTo(circle_x, circle_y);
        ctx.lineTo(circle_x, circle_y - circle_r);
        ctx.arc(circle_x, circle_y, circle_r, health_angles[0], damage_angles[1], false);
        ctx.closePath();
        ctx.fill();
    }

    // empty
    if (hp_percentage < 1) {
        ctx.fillStyle = `rgba(${0x1f},${0x29},${0x37}${alpha})`;
        ctx.beginPath();
        ctx.moveTo(circle_x, circle_y);
        ctx.lineTo(circle_x, circle_y - circle_r);
        ctx.arc(circle_x, circle_y, circle_r, health_angles[0], health_angles[1], false);
        ctx.lineTo(circle_x, circle_y);
        ctx.closePath();
        ctx.fill();
    }

    // border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(${0x1f},${0x29},${0x37}${alpha})`;
    ctx.beginPath();
    ctx.ellipse(circle_x, circle_y, circle_r, circle_r, 0, 0, PI * 2)
    ctx.stroke();
    // >>>
}

function render_elemental({ ctx, x, y, radius, reverse, preview, level, element, health, type, damage }) {
    // <<<
    if (type !== CELLTYPE.ELEMENTAL) return;

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

    render_health({ ctx, x, y, radius, reverse, preview, level, health, alpha, damage })
    // >>>
}

function render_attack(ctx, pos) {
    // <<<
    if (!valid(pos) || get_cell(pos).type !== CELLTYPE.ELEMENTAL) { return }

    const range = get_attack_range(pos)
    const x1 = clamp(range.col[0], 0, SIZE) * CELL_SIZE
    const x2 = clamp(range.col[1] + 1, 0, SIZE) * CELL_SIZE
    const y1 = clamp(range.row[0], 0, SIZE / 2) * CELL_SIZE
    const y2 = clamp(range.row[1] + 1, 0, SIZE / 2) * CELL_SIZE
    ctx.fillStyle = 'hsl(0, 60%, 60%, 0.25)';
    ctx.strokeStyle = 'hsl(0, 60%, 60%, 0.5)';
    ctx.lineWidth = 2;
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    // >>>
}

function render_blank() {
    // <<<
    const canvas = document.getElementById('cnv');
    if (!canvas || !canvas.getContext) {
        console.error('Canvas not found or not supported!');
        return;
    }

    const ctx = canvas.getContext('2d');
    let [h, s, l] = [0, 0, 0]

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cell_size = canvas.width / SIZE;
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const x = col * cell_size;
            const y = row * cell_size;

            if (row < SIZE / 2) {
                if ((col + row) % 2 === 1) { // green
                    ;[h, s, l] = [140, 70, 45]
                } else {
                    ;[h, s, l] = [140, 75, 35]
                }
            } else {
                if ((col + row) % 2 === 1) { // blue
                    ;[h, s, l] = [200, 80, 45]
                } else {
                    ;[h, s, l] = [200, 90, 35]
                }
            }

            ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
            ctx.strokeStyle = `#1e293b`
            ctx.lineWidth = 1;
            ctx.fillRect(x, y, cell_size, cell_size);
            ctx.strokeRect(x, y, cell_size, cell_size);
        }
    }
    // >>>
}

function render() {
    // <<<
    if (GAME === null) {
        return;
    }

    const canvas = document.getElementById('cnv');
    if (!canvas || !canvas.getContext) {
        console.error('Canvas not found or not supported!');
        return;
    }

    const ctx = canvas.getContext('2d');
    let [h, s, l] = [0, 0, 0]

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const delta = 2

    let attacked = null;
    if (valid(SELECTED_CELL) && valid(SELECTED_ELEMENTAL) &&
        get_cell(SELECTED_CELL).type === CELLTYPE.ELEMENTAL &&
        get_cell(SELECTED_ELEMENTAL).type === CELLTYPE.ELEMENTAL &&
        correct_player(SELECTED_ELEMENTAL) &&
        different_players(SELECTED_CELL, SELECTED_ELEMENTAL) &&
        can_attack(SELECTED_ELEMENTAL, SELECTED_CELL)) {
        attacked = { from: SELECTED_ELEMENTAL, to: SELECTED_CELL };
    }

    CELL_SIZE = canvas.width / SIZE;
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;

            if (row < SIZE / 2) {
                if ((col + row) % 2 === 1) { // green
                    ;[h, s, l] = [140, 70, 45]
                } else {
                    ;[h, s, l] = [140, 75, 35]
                }
            } else {
                if ((col + row) % 2 === 1) { // blue
                    ;[h, s, l] = [200, 80, 45]
                } else {
                    ;[h, s, l] = [200, 90, 35]
                }
            }

            const cell = get_cell({ row, col });
            if (cell.type === CELLTYPE.BLOCK) {
                s = 0;
            }
            if ((PLAYER_INDEX === 1) !== (GAME.active_player === Math.floor(row / (SIZE / 2)))) {
                s *= 0.5;
                l *= 0.75;
            }
            ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
            ctx.strokeStyle = `#1e293b`
            ctx.lineWidth = 1;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

            if (equal({ col, row }, HOVERED_CELL)) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = `#cbd5e1`
                ctx.strokeRect(x + delta, y + delta, CELL_SIZE - delta * 2, CELL_SIZE - delta * 2);
            }
            if (equal({ col, row }, SELECTED_CELL)) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = `#fdba74`
                ctx.strokeRect(x + delta, y + delta, CELL_SIZE - delta * 2, CELL_SIZE - delta * 2);
            }
            if (equal({ col, row }, SELECTED_ELEMENTAL)) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = `#93c5fd`
                ctx.strokeRect(x + delta, y + delta, CELL_SIZE - delta * 2, CELL_SIZE - delta * 2);
            }

            if (cell.type === CELLTYPE.ELEMENTAL) {
                render_elemental({
                    ctx,
                    x: x + CELL_SIZE / 2,
                    y: y + CELL_SIZE / 2,
                    radius: CELL_SIZE / 2,
                    reverse: row < SIZE / 2,
                    preview: false, //(PLAYER_INDEX === 1) !== (GAME.active_player === Math.floor(row / (BOARD_SIZE / 2))),
                    damage: (attacked != null && equal({ row, col }, attacked.to)) ? DAMAGE[get_cell(attacked.from).level - 1] : 0,
                    ...cell,
                })
            }
        }
    }

    if (valid(SELECTED_CELL) &&
        get_cell(SELECTED_CELL).type === CELLTYPE.EMPTY &&
        SELECTED_CELL.row >= SIZE / 2) {
        const path = get_path(GAME.board, SELECTED_ELEMENTAL, SELECTED_CELL);
        if (path.ok) {
            preview_path(ctx, path.path)
        }
        preview_elemental(ctx, SELECTED_ELEMENTAL, SELECTED_CELL);
    }
    if (valid(SELECTED_ELEMENTAL) &&
        get_cell(SELECTED_ELEMENTAL).type === CELLTYPE.ELEMENTAL &&
        SELECTED_ELEMENTAL.row >= SIZE / 2 &&
        able_to_attack(SELECTED_ELEMENTAL)) {
        render_attack(ctx, SELECTED_ELEMENTAL);
    }

    // >>>
}

let time_then = 0
let time_delta = 0
let clock = 0
//let delta_min = 1000
//let delta_max = 0
//let delta_avg = 0
//let delta_num = 1
//let deltas = []
async function loop(time_now) {
    // <<<
    time_delta = time_now - time_then;
    time_then = time_now;
    clock += time_delta
    //let fps = 1000 / time_delta
    //deltas.push(fps)
    //
    //delta_avg = deltas.reduce((a,b)=>a+b) / deltas.length
    //delta_min = Math.round(Math.min(fps, delta_min))
    //delta_max = Math.round(Math.max(fps, delta_max))
    //document.querySelector('#error-response').innerHTML = `<p>current: ${Math.round(fps)}</p> <p>maximum: ${delta_max}</p> <p>minimum: ${delta_min}</p> <p>average: ${Math.round(delta_avg)}</p>`

    if (clock > 1000 && LOBBY_ID != null && GAME != null) {
        clock = 0;
        const data = await fetch_post('/api/read', { lobby_id: LOBBY_ID })
        if (data.ok && data.result.ok) {
            update_game(soa2aos(data.result.game_soa));
        } else {
            clock -= 1000
        }
    }

    render()

    requestAnimationFrame(loop);
    // >>>
}

async function handle_move() {
    // <<<
    const request = {
        lobby_id: LOBBY_ID,
        player_id: PLAYER_ID,
        action: {
            type: ACTION.MOVE,
            spell: '',
            from: {
                col: SELECTED_ELEMENTAL.col,
                row: SELECTED_ELEMENTAL.row,
            },
            to: {
                col: SELECTED_CELL.col,
                row: SELECTED_CELL.row,
            },
        },
    }
    if (PLAYER_INDEX === 1) {
        request.action.from.row = SIZE - 1 - request.action.from.row
        request.action.to.row = SIZE - 1 - request.action.to.row
    }
    const data = await fetch_post('/api/action', request);
    console.log("response:", data)
    if (!data.ok || !data.result.ok) {
        console.log('confirm (move) was unconfirmed:', request, data)
        return false
    }
    update_game(soa2aos(data.result.game_soa));
    return true
    // >>>
}

async function handle_attack() {
    // <<<
    const request = {
        lobby_id: LOBBY_ID,
        player_id: PLAYER_ID,
        action: {
            type: ACTION.ATTACK,
            spell: '',
            from: {
                col: SELECTED_ELEMENTAL.col,
                row: SELECTED_ELEMENTAL.row,
            },
            to: {
                col: SELECTED_CELL.col,
                row: SELECTED_CELL.row,
            },
        },
    }
    if (PLAYER_INDEX === 1) {
        request.action.from.row = SIZE - 1 - request.action.from.row
        request.action.to.row = SIZE - 1 - request.action.to.row
    }
    const data = await fetch_post('/api/action', request);
    console.log("response:", data)
    if (!data.ok || !data.result.ok) {
        console.log('confirm (attack) was unconfirmed:', request, data)
        return false
    }
    update_game(soa2aos(data.result.game_soa));
    return true
    // >>>
}

async function handle_spell() {
    // <<<
    const request = {
        lobby_id: LOBBY_ID,
        player_id: PLAYER_ID,
        action: {
            type: ACTION.SPELL,
            spell: SELECTED_SPELL,
            to: { row: -1, col: -1 },
            from: { row: -1, col: -1 },
        },
    }
    if (SELECTED_SPELL !== SPELL.DT) {
        if (PLAYER_INDEX === 0) {
            request.action.to = {
                col: SELECTED_CELL.col,
                row: SELECTED_CELL.row,
            }
        } else {
            request.action.to = {
                col: SELECTED_CELL.col,
                row: SIZE - 1 - SELECTED_CELL.row,
            }
        }
    }
    const data = await fetch_post('/api/action', request);
    console.log("response:", data)
    if (!data.ok || !data.result.ok) {
        console.log('confirm (spell) was unconfirmed:', request, data)
        return false
    }
    update_game(soa2aos(data.result.game_soa));

    document.querySelector(`#${SELECTED_SPELL}>p`).textContent = `${GAME.players[PLAYER_INDEX][SPELLS.indexOf(SELECTED_SPELL)] ?? 0}/${CHARGES[SELECTED_SPELL]}`;
    SELECTED_SPELL = ''
    CAN_USE_SPELL = false;
    Array.from(document.querySelectorAll("#spells > *")).map(e => e.style['filter'] = 'grayscale(80%)')

    return true
    // >>>
}

document.addEventListener('DOMContentLoaded', async () => {
    // <<<
    IS_MOBILE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const join_lobby = document.querySelector('#join_lobby');
    const new_lobby = document.querySelector('#new_lobby');
    const canvas = document.querySelector('#cnv');
    const cancel = document.querySelector('#cancel');
    const skip = document.querySelector('#skip');
    const confirm = document.querySelector('#confirm');
    const fs = document.querySelector('#fs');
    const hv = document.querySelector('#hv');
    const af = document.querySelector('#af');
    const dt = document.querySelector('#dt');
    const ms = document.querySelector('#ms');
    const spell_elements = [fs, hv, af, dt, ms];

    if (sessionStorage.getItem('PLAYER_ID') != null) {
        PLAYER_ID = sessionStorage.getItem('PLAYER_ID');
    } else {
        const data = await fetch_get('/api/new/player');
        if (data.ok) {
            PLAYER_ID = data.result.player_id;
            sessionStorage.setItem('PLAYER_ID', PLAYER_ID);
        }
    }

    new_lobby.addEventListener('click', async (_) => {
        // <<<
        const data = await fetch_post('/api/new/lobby', { player_id: PLAYER_ID })
        console.log('Response:', data);
        if (!data.ok) return
        LOBBY_ID = data.result.lobby_id;
        update_game(soa2aos(data.result.game_soa));
        document.getElementById('lobby_code').value = LOBBY_ID;
        // >>>
    });
    join_lobby.addEventListener('click', async (_) => {
        // <<<
        const lobby_id = document.getElementById('lobby_code').value.toUpperCase();
        const data = await fetch_post('/api/join', { lobby_id, player_id: PLAYER_ID })
        console.log('Response:', data);
        if (!data.ok || !data.result.ok) return
        LOBBY_ID = lobby_id;
        if (data.result.player_index > 0) {
            PLAYER_INDEX = 1;
        }
        update_game(soa2aos(data.result.game_soa));
        // >>>
    });

    if (!IS_MOBILE) {
        canvas.addEventListener('pointermove', (event) => {
            // <<<
            const rect = event.target.getBoundingClientRect();
            const pointerX = (event.clientX - rect.left) / rect.width;
            const pointerY = (event.clientY - rect.top) / rect.height;
            POINTER = { x: pointerX, y: pointerY };
            const col = Math.floor(pointerX * SIZE);
            const row = Math.floor(pointerY * SIZE);
            HOVERED_CELL = { row, col };
            // >>>
        });
    }
    canvas.addEventListener('pointerup', (event) => {
        // <<<
        const rect = event.target.getBoundingClientRect();
        const pointerX = (event.clientX - rect.left) / rect.width;
        const pointerY = (event.clientY - rect.top) / rect.height;
        const col = Math.floor(pointerX * SIZE);
        const row = Math.floor(pointerY * SIZE);
        SELECTED_CELL = { row, col };
        if (valid(SELECTED_CELL) && GAME != null && correct_player(SELECTED_CELL) &&
            get_cell(SELECTED_CELL).type === CELLTYPE.ELEMENTAL) {
            SELECTED_ELEMENTAL = SELECTED_CELL;
        }
        // >>>
    });

    cancel.addEventListener('click', async (_) => {
        // <<<
        SELECTED_CELL = { row: -1, col: -1 }
        SELECTED_ELEMENTAL = { row: -1, col: -1 }
        SELECTED_SPELL = ''
        spell_elements.forEach(e => {
            e.classList.remove('highlight');
        })
        // >>>
    })
    skip.addEventListener('click', async (_) => {
        // <<<
        const data = await fetch_post('/api/action', {
            lobby_id: LOBBY_ID,
            player_id: PLAYER_ID,
            action: { type: ACTION.SKIP, }
        })
        console.log('Response:', data);
        if (!data.ok || !data.result.ok) return
        update_game(soa2aos(data.result.game_soa));
        // >>>
    })
    confirm.addEventListener('click', async (_) => {
        // <<<
        if (!valid(SELECTED_CELL) && SELECTED_SPELL !== SPELL.DT) return;

        if (CAN_USE_SPELL && SELECTED_SPELL !== '' && PLAYER_INDEX === GAME.active_player) {
            await handle_spell();
            return;
        }

        if (!valid(SELECTED_ELEMENTAL) || equal(SELECTED_CELL, SELECTED_ELEMENTAL)) return


        if (get_cell(SELECTED_CELL).type === CELLTYPE.EMPTY &&
            get_cell(SELECTED_ELEMENTAL).type === CELLTYPE.ELEMENTAL) {
            const path = get_path(GAME.board, SELECTED_ELEMENTAL, SELECTED_CELL);
            if (!path.ok) { return; }
            let ok = await handle_move();
            if (ok) { SELECTED_ELEMENTAL = SELECTED_CELL; }
            return;
        }

        if (get_cell(SELECTED_CELL).type === CELLTYPE.ELEMENTAL &&
            get_cell(SELECTED_ELEMENTAL).type === CELLTYPE.ELEMENTAL &&
            correct_player(SELECTED_ELEMENTAL) &&
            different_players(SELECTED_CELL, SELECTED_ELEMENTAL) &&
            can_attack(SELECTED_ELEMENTAL, SELECTED_CELL)) {
            await handle_attack();
            return;
        }
        // >>>
    })

    spell_elements.forEach((e, i) => {
        // <<<
        e.addEventListener('click', (_) => {
            if (CAN_USE_SPELL) {
                spell_elements.forEach(ee => {
                    ee.classList.remove('highlight');
                })
                SELECTED_SPELL = SPELLS[i];
                e.classList.add('highlight');
            }
        })
        // >>>
    })

    render_blank()

    requestAnimationFrame(loop);
    // >>>
});
