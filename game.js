const gameState = {
    board: [],
    solution: [],
    selectedCell: null,
    difficulty: 'medium',
    startTime: null,
    pausedTime: 0,
    totalPauseDuration: 0,
    timerInterval: null,
    hintsUsed: 0,
    streak: 0,
    totalPoints: 0,
    gamesWon: 0,
    currentSkin: 'classic',
    unlockedSkins: ['classic'], // Fix: Initialize with default skin
    isPaused: false,
    gameInProgress: false,
    isRevealing: false
};

// ===== SKIN DEFINITIONS =====
const skins = [
    { id: 'classic', name: 'Classic', cost: 0, color: '#4f46e5' },
    { id: 'ocean', name: 'Ocean', cost: 250, color: '#0891b2' },
    { id: 'sunset', name: 'Sunset', cost: 500, color: '#f97316' },
    { id: 'forest', name: 'Forest', cost: 750, color: '#16a34a' },
    { id: 'neon', name: 'Neon', cost: 1000, color: '#d946ef' },
    { id: 'galaxy', name: 'Galaxy', cost: 1500, color: '#8b5cf6' },
    { id: 'golden', name: 'Golden', cost: 2000, color: '#f59e0b' },
    { id: 'rainbow', name: 'Rainbow', cost: 3000, color: '#ec4899' }
];

// ===== DIFFICULTY SETTINGS =====
const difficultySettings = {
    easy: { clues: 45, basePoints: 100, targetTime: 600 },
    medium: { clues: 35, basePoints: 250, targetTime: 480 },
    hard: { clues: 28, basePoints: 500, targetTime: 360 },
    expert: { clues: 22, basePoints: 1000, targetTime: 300 }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize grid first so we can render to it
        initializeGrid();
        initializeSkins();
        loadGameState();

        // Event Listeners with null checks
        const newGameBtn = document.getElementById('newGameBtn');
        const hintBtn = document.getElementById('hintBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const difficultySelect = document.getElementById('difficulty');
        const closeModalBtn = document.getElementById('closeModal');

        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                if (gameState.gameInProgress) {
                    handleMainButtonClick();
                } else {
                    startNewGame();
                }
            });
        }

        if (hintBtn) hintBtn.addEventListener('click', useHint);
        if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                gameState.difficulty = e.target.value;
            });
        }
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeVictoryModal);

        const confirmRevealBtn = document.getElementById('confirmReveal');
        const cancelRevealBtn = document.getElementById('cancelReveal');

        if (confirmRevealBtn) confirmRevealBtn.addEventListener('click', () => {
            closeRevealModal();
            revealSolution();
        });
        if (cancelRevealBtn) cancelRevealBtn.addEventListener('click', closeRevealModal);

        // Number pad listeners
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.dataset.num);
                if (gameState.selectedCell !== null) {
                    placeNumber(num);
                }
            });
        });

        // Keyboard support
        document.addEventListener('keydown', handleKeyPress);

        // Initial UI Update based on state
        updateUI();

    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// ===== SUDOKU GENERATOR =====
function generateSudoku(difficulty) {
    const board = Array(9).fill(null).map(() => Array(9).fill(0));

    // Fill diagonal 3x3 boxes first (they don't affect each other)
    fillDiagonalBoxes(board);

    // Fill remaining cells
    solveSudoku(board);

    // Create a copy as solution
    const solution = board.map(row => [...row]);

    // Remove numbers based on difficulty while ensuring unique solution
    const cluesTarget = difficultySettings[difficulty].clues;

    // Create list of all cell positions
    let cells = [];
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            cells.push([i, j]);
        }
    }
    shuffleArray(cells);

    let currentClues = 81;

    for (const [row, col] of cells) {
        if (currentClues <= cluesTarget) break;

        const backup = board[row][col];
        board[row][col] = 0;

        // Check if solution is still unique
        // We pass a limit of 2 because we only care if there is > 1 solution
        const copyBoard = board.map(r => [...r]);
        if (countSolutions(copyBoard, 2) !== 1) {
            board[row][col] = backup; // Put it back, removing it creates ambiguity
        } else {
            currentClues--;
        }
    }

    return { board, solution };
}

function countSolutions(board, limit) {
    const emptyCell = findEmptyCell(board);
    if (!emptyCell) return 1;

    const [row, col] = emptyCell;
    let count = 0;

    for (let num = 1; num <= 9; num++) {
        if (isValid(board, row, col, num)) {
            board[row][col] = num;
            count += countSolutions(board, limit);
            board[row][col] = 0; // Backtrack

            if (count >= limit) return count;
        }
    }

    return count;
}

function fillDiagonalBoxes(board) {
    for (let box = 0; box < 9; box += 3) {
        fillBox(board, box, box);
    }
}

function fillBox(board, row, col) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    shuffleArray(nums);

    let idx = 0;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            board[row + i][col + j] = nums[idx++];
        }
    }
}

function solveSudoku(board) {
    const emptyCell = findEmptyCell(board);
    if (!emptyCell) return true;

    const [row, col] = emptyCell;
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    shuffleArray(nums);

    for (let num of nums) {
        if (isValid(board, row, col, num)) {
            board[row][col] = num;

            if (solveSudoku(board)) {
                return true;
            }

            board[row][col] = 0;
        }
    }

    return false;
}

function findEmptyCell(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                return [row, col];
            }
        }
    }
    return null;
}

function isValid(board, row, col, num) {
    // Check row
    for (let x = 0; x < 9; x++) {
        if (board[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
        if (board[x][col] === num) return false;
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[boxRow + i][boxCol + j] === num) return false;
        }
    }

    return true;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// ===== GRID MANAGEMENT =====
function initializeGrid() {
    const grid = document.getElementById('sudokuGrid');
    if (!grid) {
        console.error('Sudoku grid element not found');
        return;
    }

    grid.innerHTML = '';

    for (let i = 0; i < 81; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('tabindex', '-1');
        cell.addEventListener('click', () => selectCell(i));
        grid.appendChild(cell);
    }
}

function renderBoard() {
    const cells = document.querySelectorAll('.cell');

    cells.forEach((cell, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const value = gameState.board[row][col];
        const solutionValue = gameState.solution[row][col];

        cell.textContent = value || '';
        cell.classList.remove('fixed', 'selected', 'error', 'correct', 'highlight');

        // Mark fixed cells (initial clues)
        if (value && value === solutionValue && !cell.dataset.userPlaced) {
            cell.classList.add('fixed');
        }
    });

    // Highlight selected cell
    if (gameState.selectedCell !== null) {
        const selectedIndex = gameState.selectedCell;
        cells[selectedIndex].classList.add('selected');

        // Highlight same row, column, and box
        const row = Math.floor(selectedIndex / 9);
        const col = selectedIndex % 9;

        cells.forEach((cell, index) => {
            const cellRow = Math.floor(index / 9);
            const cellCol = index % 9;

            if (cellRow === row || cellCol === col ||
                (Math.floor(cellRow / 3) === Math.floor(row / 3) &&
                    Math.floor(cellCol / 3) === Math.floor(col / 3))) {
                if (index !== selectedIndex) {
                    cell.classList.add('highlight');
                }
            }
        });
    }
}

function selectCell(index) {
    if (gameState.isPaused) return;

    const row = Math.floor(index / 9);
    const col = index % 9;
    const cell = document.querySelectorAll('.cell')[index];

    // Don't allow selecting fixed cells
    if (cell.classList.contains('fixed')) {
        return;
    }

    gameState.selectedCell = index;
    renderBoard();
}

function placeNumber(num) {
    if (gameState.selectedCell === null || gameState.isPaused) return;

    const index = gameState.selectedCell;
    const row = Math.floor(index / 9);
    const col = index % 9;
    const cell = document.querySelectorAll('.cell')[index];

    // Don't allow modifying fixed cells
    if (cell.classList.contains('fixed')) return;

    // Place or erase number
    if (num === 0) {
        gameState.board[row][col] = 0;
        cell.dataset.userPlaced = '';
    } else {
        gameState.board[row][col] = num;
        cell.dataset.userPlaced = 'true';

        // Check if correct against solution
        if (num === gameState.solution[row][col]) {
            cell.classList.add('correct');
            gameState.streak++;
            setTimeout(() => cell.classList.remove('correct'), 400);

            // Check if 3x3 square is complete
            checkSquareCompletion(row, col);
        } else {
            // Enhanced error animation
            cell.classList.add('error', 'shake-hard');
            gameState.streak = 0;
            setTimeout(() => {
                cell.classList.remove('error', 'shake-hard');
            }, 600);
        }

        // Auto-check for conflicts (duplicate numbers in row/col/box)
        autoCheckConflicts(row, col, num);
    }

    renderBoard();
    updateUI();
    saveGameState();

    // Check if puzzle is complete
    if (isPuzzleComplete()) {
        handleVictory();
    }
}

function autoCheckConflicts(placedRow, placedCol, num) {
    const cells = document.querySelectorAll('.cell');

    cells.forEach((cell, index) => {
        const cellRow = Math.floor(index / 9);
        const cellCol = index % 9;
        const cellValue = gameState.board[cellRow][cellCol];

        // Skip empty cells and the cell we just placed
        if (!cellValue || (cellRow === placedRow && cellCol === placedCol)) return;

        // Check if this cell has the same number in same row, column, or box
        if (cellValue === num) {
            const sameRow = cellRow === placedRow;
            const sameCol = cellCol === placedCol;
            const sameBox = Math.floor(cellRow / 3) === Math.floor(placedRow / 3) &&
                Math.floor(cellCol / 3) === Math.floor(placedCol / 3);

            if (sameRow || sameCol || sameBox) {
                // Highlight conflict temporarily
                cell.classList.add('error');
                setTimeout(() => cell.classList.remove('error'), 800);
            }
        }
    });
}

function checkSquareCompletion(row, col) {
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    // Check if all cells in the 3x3 box are filled correctly
    let isComplete = true;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const r = boxRow + i;
            const c = boxCol + j;
            if (gameState.board[r][c] !== gameState.solution[r][c]) {
                isComplete = false;
                break;
            }
        }
        if (!isComplete) break;
    }

    // Animate the completed square
    if (isComplete) {
        const cells = document.querySelectorAll('.cell');
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const r = boxRow + i;
                const c = boxCol + j;
                const cellIndex = r * 9 + c;
                const cell = cells[cellIndex];

                // Add completion animation with stagger
                setTimeout(() => {
                    cell.classList.add('square-complete');
                    setTimeout(() => {
                        cell.classList.remove('square-complete');
                    }, 800);
                }, (i * 3 + j) * 50);
            }
        }
    }
}

// ===== GAME CONTROLS =====
function startNewGame() {
    // Stop existing timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    // Generate new puzzle
    const { board, solution } = generateSudoku(gameState.difficulty);
    gameState.board = board;
    gameState.solution = solution;
    gameState.selectedCell = null;
    gameState.hintsUsed = 0;
    gameState.streak = 0;
    gameState.startTime = Date.now();
    gameState.pausedTime = 0; // Reset paused time
    gameState.totalPauseDuration = 0; // Track total time spent in pause
    gameState.isPaused = false;
    gameState.gameInProgress = true;
    gameState.isRevealing = false;

    // Update main button
    const mainBtn = document.getElementById('newGameBtn');
    mainBtn.innerHTML = '<span class="btn-icon">👁️</span>Reveal Solution';
    mainBtn.classList.add('btn-reveal');

    // Update pause button
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.innerHTML = '<span class="btn-icon">⏸</span>Pause';

    // Unpause grid
    const grid = document.getElementById('sudokuGrid');
    if (grid) grid.classList.remove('paused');

    // Mark initial cells
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        if (!cell) return;
        cell.dataset.userPlaced = '';
        cell.classList.remove('revealed');
    });

    renderBoard();
    updateUI();
    saveGameState();

    // Start timer
    gameState.timerInterval = setInterval(updateTimer, 1000);
}

function handleMainButtonClick() {
    if (gameState.gameInProgress && !gameState.isRevealing) {
        showRevealModal();
    } else if (!gameState.isRevealing) {
        startNewGame();
    }
}

async function revealSolution() {
    gameState.isRevealing = true;
    gameState.gameInProgress = false;

    // Stop timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    const mainBtn = document.getElementById('newGameBtn');
    mainBtn.innerHTML = '<span class="btn-icon">⌛</span>Revealing...';
    mainBtn.classList.add('loading');

    const cells = document.querySelectorAll('.cell');

    // Smooth staggered reveal
    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;

        if (gameState.board[row][col] !== gameState.solution[row][col]) {
            await new Promise(resolve => setTimeout(resolve, 20)); // Delay between cells
            gameState.board[row][col] = gameState.solution[row][col];
            cells[i].textContent = gameState.solution[row][col];
            cells[i].classList.add('revealed');
            cells[i].dataset.userPlaced = 'true';
        }
    }

    // Reset button after reveal
    setTimeout(() => {
        mainBtn.innerHTML = '<span class="btn-icon">🎮</span>New Game';
        mainBtn.classList.remove('btn-reveal', 'loading');
        gameState.isRevealing = false;
        saveGameState();
    }, 1000);
}

function togglePause() {
    if (!gameState.gameInProgress || gameState.isRevealing) return; // Only pause active games

    gameState.isPaused = !gameState.isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    const grid = document.getElementById('sudokuGrid');

    if (gameState.isPaused) {
        // Pause the game
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;

        pauseBtn.innerHTML = '<span class="btn-icon">▶</span>Resume';
        if (grid) grid.classList.add('paused');

        gameState.pausedTime = Date.now(); // Record when we started pausing
    } else {
        // Resume the game
        if (gameState.pausedTime) {
            const currentPauseDuration = Date.now() - gameState.pausedTime;
            gameState.totalPauseDuration = (gameState.totalPauseDuration || 0) + currentPauseDuration;
            gameState.pausedTime = 0; // Reset current pause start time
        }

        gameState.timerInterval = setInterval(updateTimer, 1000);
        pauseBtn.innerHTML = '<span class="btn-icon">⏸</span>Pause';
        if (grid) grid.classList.remove('paused');
    }
    saveGameState();
}

function useHint() {
    if (gameState.isPaused) return;

    if (gameState.selectedCell === null) {
        // Find a random empty cell
        const emptyCells = [];
        for (let i = 0; i < 81; i++) {
            const row = Math.floor(i / 9);
            const col = i % 9;
            if (gameState.board[row][col] === 0) {
                emptyCells.push(i);
            }
        }

        if (emptyCells.length === 0) return;

        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        gameState.selectedCell = randomIndex;
    }

    const index = gameState.selectedCell;
    const row = Math.floor(index / 9);
    const col = index % 9;

    if (gameState.board[row][col] === 0) {
        gameState.board[row][col] = gameState.solution[row][col];
        gameState.hintsUsed++;
        gameState.streak = 0;

        const cell = document.querySelectorAll('.cell')[index];
        cell.dataset.userPlaced = 'true';
        cell.classList.add('correct');
        setTimeout(() => cell.classList.remove('correct'), 400);

        renderBoard();
        updateUI();
        saveGameState();

        if (isPuzzleComplete()) {
            handleVictory();
        }
    }
}

function isPuzzleComplete() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (gameState.board[row][col] !== gameState.solution[row][col]) {
                return false;
            }
        }
    }
    return true;
}

// ===== VICTORY HANDLING =====
function handleVictory() {
    // Stop timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    gameState.gameInProgress = false;

    // Reset main button
    const mainBtn = document.getElementById('newGameBtn');
    mainBtn.innerHTML = '<span class="btn-icon">🎮</span>New Game';
    mainBtn.classList.remove('btn-reveal');

    const elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000);
    const settings = difficultySettings[gameState.difficulty];

    // Calculate base points
    let points = settings.basePoints;

    // ----- Tiered Time Bonus System -----
    let timeBonus = 0;
    let timePercentage = (elapsedTime / settings.targetTime) * 100;

    // Base bonus calculation (standard formula)
    let baseBonus = Math.max(0, Math.floor((settings.targetTime - elapsedTime) / 10) * 10);

    if (elapsedTime < settings.targetTime) {
        if (timePercentage < 25) {
            // Master Tier: Fast completion (< 25% of target time)
            timeBonus = baseBonus * 2;
        } else if (timePercentage < 50) {
            // Expert Tier (< 50% of target time)
            timeBonus = baseBonus * 1.5;
        } else if (timePercentage < 75) {
            // Advanced Tier (< 75% of target time)
            timeBonus = baseBonus;
        } else {
            // Standard Tier (< 100% of target time)
            timeBonus = baseBonus * 0.5;
        }
    }

    timeBonus = Math.floor(timeBonus);

    // Hint penalty
    const hintPenalty = gameState.hintsUsed * 50;

    // Total points
    const totalEarned = Math.max(0, points + timeBonus - hintPenalty);
    gameState.totalPoints += totalEarned;
    gameState.gamesWon++;

    // Check for skin unlocks
    const newlyUnlocked = [];
    skins.forEach(skin => {
        if (!gameState.unlockedSkins.includes(skin.id) &&
            gameState.totalPoints >= skin.cost) {
            gameState.unlockedSkins.push(skin.id);
            newlyUnlocked.push(skin.name);
        }
    });

    // Update UI
    updateUI();
    saveGameState();

    // Show victory modal
    showVictoryModal(elapsedTime, totalEarned, timeBonus, newlyUnlocked);
}

function showVictoryModal(time, points, timeBonus, newSkins) {
    const modal = document.getElementById('victoryModal');
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    document.getElementById('victoryTime').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('pointsEarned').textContent = points;
    document.getElementById('timeBonus').textContent = `+${timeBonus}`;

    const skinMessage = document.getElementById('skinUnlocked');
    if (newSkins.length > 0) {
        skinMessage.textContent = `🎨 New skin${newSkins.length > 1 ? 's' : ''} unlocked: ${newSkins.join(', ')}!`;
        skinMessage.style.display = 'block';
    } else {
        skinMessage.style.display = 'none';
    }

    modal.classList.add('active');
    createConfetti();
}

function closeVictoryModal() {
    document.getElementById('victoryModal').classList.remove('active');
    document.getElementById('confetti').innerHTML = '';
}

function showRevealModal() {
    const modal = document.getElementById('revealModal');
    if (modal) modal.classList.add('active');
}

function closeRevealModal() {
    const modal = document.getElementById('revealModal');
    if (modal) modal.classList.remove('active');
}

function createConfetti() {
    const container = document.getElementById('confetti');
    const colors = ['#4f46e5', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 3 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(confetti);
    }
}

// ===== SKINS MANAGEMENT =====
function initializeSkins() {
    const skinsGrid = document.getElementById('skinsGrid');
    if (!skinsGrid) {
        console.error('Skins grid element not found');
        return;
    }

    skinsGrid.innerHTML = '';

    skins.forEach(skin => {
        const card = document.createElement('div');
        card.className = 'skin-card';
        card.setAttribute('role', 'listitem');

        const isLocked = !gameState.unlockedSkins.includes(skin.id);
        const isActive = skin.id === gameState.currentSkin;

        if (isLocked) {
            card.classList.add('locked');
            card.setAttribute('aria-disabled', 'true');
        }

        if (isActive) {
            card.classList.add('active');
            card.setAttribute('aria-current', 'true');
        }

        const preview = document.createElement('div');
        preview.className = 'skin-preview';
        preview.style.background = `linear-gradient(135deg, ${skin.color}, ${adjustColor(skin.color, -20)})`;
        preview.setAttribute('aria-hidden', 'true');

        const name = document.createElement('div');
        name.className = 'skin-name';
        name.textContent = skin.name;

        const cost = document.createElement('div');
        cost.className = 'skin-cost';
        cost.textContent = skin.cost === 0 ? 'Default' : `${skin.cost} pts`;

        card.appendChild(preview);
        card.appendChild(name);
        card.appendChild(cost);

        if (gameState.unlockedSkins.includes(skin.id)) {
            card.addEventListener('click', () => applySkin(skin.id));
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${skin.name} theme, ${cost.textContent}. ${isActive ? 'Currently active' : 'Click to activate'}`);
        } else {
            card.setAttribute('aria-label', `${skin.name} theme, locked. Requires ${skin.cost} points to unlock`);
        }

        skinsGrid.appendChild(card);
    });
}

function applySkin(skinId) {
    gameState.currentSkin = skinId;
    document.body.dataset.skin = skinId;
    saveGameState();
    initializeSkins();
}

function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ===== UI UPDATES =====
function updateUI() {
    document.getElementById('totalPoints').textContent = gameState.totalPoints;
    document.getElementById('gamesWon').textContent = gameState.gamesWon;
    document.getElementById('streakCounter').textContent = `Streak: ${gameState.streak}`;
    document.getElementById('hintsUsed').textContent = `Hints: ${gameState.hintsUsed}`;

    initializeSkins();
}

function updateTimer() {
    if (!gameState.startTime) return;

    // Calculate effective elapsed time: (Now - Start) - Total time spent paused
    // If currently paused, we freeze the "Now" at the pausedTime
    const now = gameState.isPaused ? gameState.pausedTime : Date.now();
    const effectiveElapsed = Math.floor((now - gameState.startTime - (gameState.totalPauseDuration || 0)) / 1000);

    // Sanity check
    const elapsed = Math.max(0, effectiveElapsed);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// ===== KEYBOARD SUPPORT =====
function handleKeyPress(e) {
    if (gameState.selectedCell === null || gameState.isPaused) return;

    const key = e.key;

    if (key >= '1' && key <= '9') {
        placeNumber(parseInt(key));
    } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
        placeNumber(0);
    } else if (key === 'ArrowUp' || key === 'ArrowDown' ||
        key === 'ArrowLeft' || key === 'ArrowRight') {
        e.preventDefault();
        navigateCell(key);
    }
}

function navigateCell(direction) {
    const row = Math.floor(gameState.selectedCell / 9);
    const col = gameState.selectedCell % 9;

    let newRow = row;
    let newCol = col;

    switch (direction) {
        case 'ArrowUp':
            newRow = Math.max(0, row - 1);
            break;
        case 'ArrowDown':
            newRow = Math.min(8, row + 1);
            break;
        case 'ArrowLeft':
            newCol = Math.max(0, col - 1);
            break;
        case 'ArrowRight':
            newCol = Math.min(8, col + 1);
            break;
    }

    gameState.selectedCell = newRow * 9 + newCol;
    renderBoard();
}

// ===== LOCAL STORAGE =====
function saveGameState() {
    try {
        const stateToSave = {
            board: gameState.board,
            solution: gameState.solution,
            difficulty: gameState.difficulty,
            startTime: gameState.startTime,
            hintsUsed: gameState.hintsUsed,
            totalPoints: gameState.totalPoints,
            gamesWon: gameState.gamesWon,
            currentSkin: gameState.currentSkin,
            unlockedSkins: gameState.unlockedSkins,
            gameInProgress: gameState.gameInProgress,

            // New persistent state
            isPaused: gameState.isPaused,
            pausedTime: gameState.pausedTime,
            totalPauseDuration: gameState.totalPauseDuration || 0
        };
        localStorage.setItem('sudokuGameState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('Error saving game state:', error);
    }
}

function loadGameState() {
    try {
        const saved = localStorage.getItem('sudokuGameState');

        if (saved) {
            const data = JSON.parse(saved);
            gameState.totalPoints = data.totalPoints || 0;
            gameState.gamesWon = data.gamesWon || 0;
            gameState.currentSkin = data.currentSkin || 'classic';
            gameState.unlockedSkins = data.unlockedSkins || ['classic'];

            // Apply saved skin
            document.body.dataset.skin = gameState.currentSkin;

            // Restore game if it was in progress
            if (data.board && data.solution) {
                gameState.board = data.board;
                gameState.solution = data.solution;
                gameState.difficulty = data.difficulty || 'medium';
                gameState.startTime = data.startTime;
                gameState.hintsUsed = data.hintsUsed || 0;
                gameState.gameInProgress = data.gameInProgress || false;
                gameState.isRevealing = false;

                // Restore pause state
                gameState.isPaused = data.isPaused || false;
                gameState.pausedTime = data.pausedTime || 0;
                gameState.totalPauseDuration = data.totalPauseDuration || 0;

                // Sync button state
                const mainBtn = document.getElementById('newGameBtn');
                if (gameState.gameInProgress && !isPuzzleComplete()) {
                    if (mainBtn) {
                        mainBtn.innerHTML = '<span class="btn-icon">👁️</span>Reveal Solution';
                        mainBtn.classList.add('btn-reveal');
                    }
                } else {
                    if (mainBtn) {
                        mainBtn.innerHTML = '<span class="btn-icon">🎮</span>New Game';
                        mainBtn.classList.remove('btn-reveal');
                    }
                }

                // Initial render
                renderBoard();

                // Handle timer and pause UI
                if (gameState.gameInProgress && !isPuzzleComplete()) {
                    if (gameState.isPaused) {
                        // If paused, keep timer stopped and show resume button
                        const pauseBtn = document.getElementById('pauseBtn');
                        const grid = document.getElementById('sudokuGrid');

                        if (pauseBtn) pauseBtn.innerHTML = '<span class="btn-icon">▶</span>Resume';
                        if (grid) grid.classList.add('paused');

                        // If it was paused and reloaded, we need to add the "time since last save" to the pause duration
                        // because the time between "last save" and "now" is technically "offline/paused" time.
                        if (gameState.pausedTime > 0) {
                            // The diff between now and when we paused needs to be accounted for, 
                            // but simpler: just update pausedTime to NOW so that when we resume,
                            // we calculate the diff correctly from this new session start.
                            // Actually, let's just leave pausedTime as is? No, if we reload 1 hour later,
                            // the browser time progressed 1 hour.
                            // If we rely on Date.now() - pausedTime in togglePause, we are good.
                        }

                        // Force a timer update to show the frozen time
                        updateTimer();
                    } else {
                        // If running, restart timer
                        gameState.timerInterval = setInterval(updateTimer, 1000);
                        updateTimer();
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading game state:', error);
        // Reset to defaults on error
        gameState.totalPoints = 0;
        gameState.gamesWon = 0;
        gameState.currentSkin = 'classic';
        gameState.unlockedSkins = ['classic'];
    }
}
