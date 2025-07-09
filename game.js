const BOARD_SIZE = 8;
const ALL_GEM_TYPES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const INITIAL_GEM_TYPES = 6;
const GEM_EMOJIS = {
    'red': '💎',
    'blue': '💙',
    'green': '💚',
    'yellow': '💛',
    'purple': '💜',
    'orange': '🧡',
    'pink': '💖',
    'cyan': '💠'
};

let board = [];
let score = 0;
let selectedGem = null;
let isProcessing = false;
let hintTimeout = null;
let currentGemTypes = INITIAL_GEM_TYPES;
let lastLevelUp = 0;
let highScore = 0;
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playMatchSound(matchCount) {
    if (!audioContext) initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const baseFreq = 440;
    const freqMultiplier = 1 + (matchCount - 3) * 0.2;
    oscillator.frequency.value = baseFreq * freqMultiplier;
    
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.frequency.value = baseFreq * freqMultiplier * 1.5;
    oscillator2.type = 'triangle';
    
    gainNode2.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator2.start(audioContext.currentTime + 0.05);
    oscillator2.stop(audioContext.currentTime + 0.25);
}

function createBoard() {
    board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            board[row][col] = getRandomGemType();
        }
    }
    
    while (hasInitialMatches()) {
        reshuffleBoard();
    }
}

function getRandomGemType() {
    const availableTypes = ALL_GEM_TYPES.slice(0, currentGemTypes);
    return availableTypes[Math.floor(Math.random() * availableTypes.length)];
}

function hasInitialMatches() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (checkMatch(row, col).length >= 3) {
                return true;
            }
        }
    }
    return false;
}

function reshuffleBoard() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            board[row][col] = getRandomGemType();
        }
    }
}

function renderBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const gem = document.createElement('div');
            gem.className = `gem ${board[row][col]}`;
            gem.dataset.row = row;
            gem.dataset.col = col;
            gem.textContent = GEM_EMOJIS[board[row][col]];
            gem.addEventListener('click', handleGemClick);
            gameBoard.appendChild(gem);
        }
    }
}

function handleGemClick(event) {
    if (isProcessing) return;
    
    clearHint();
    
    const clickedGem = event.target;
    const row = parseInt(clickedGem.dataset.row);
    const col = parseInt(clickedGem.dataset.col);
    
    if (!selectedGem) {
        selectedGem = { row, col, element: clickedGem };
        clickedGem.classList.add('selected');
    } else {
        const isAdjacent = Math.abs(selectedGem.row - row) + Math.abs(selectedGem.col - col) === 1;
        
        if (isAdjacent) {
            isProcessing = true;
            swapGems(selectedGem.row, selectedGem.col, row, col);
        }
        
        selectedGem.element.classList.remove('selected');
        selectedGem = null;
    }
}

function swapGems(row1, col1, row2, col2) {
    const temp = board[row1][col1];
    board[row1][col1] = board[row2][col2];
    board[row2][col2] = temp;
    
    renderBoard();
    
    setTimeout(() => {
        const matches1 = checkMatch(row1, col1);
        const matches2 = checkMatch(row2, col2);
        const allMatches = [...new Set([...matches1, ...matches2])];
        
        if (allMatches.length >= 3) {
            removeMatches(allMatches);
        } else {
            board[row2][col2] = board[row1][col1];
            board[row1][col1] = temp;
            renderBoard();
            isProcessing = false;
        }
    }, 300);
}

function checkMatch(row, col) {
    const gemType = board[row][col];
    const matches = [[row, col]];
    
    let left = col - 1;
    while (left >= 0 && board[row][left] === gemType) {
        matches.push([row, left]);
        left--;
    }
    
    let right = col + 1;
    while (right < BOARD_SIZE && board[row][right] === gemType) {
        matches.push([row, right]);
        right++;
    }
    
    const horizontalMatches = matches.length >= 3 ? [...matches] : [];
    
    matches.length = 0;
    matches.push([row, col]);
    
    let up = row - 1;
    while (up >= 0 && board[up][col] === gemType) {
        matches.push([up, col]);
        up--;
    }
    
    let down = row + 1;
    while (down < BOARD_SIZE && board[down][col] === gemType) {
        matches.push([down, col]);
        down++;
    }
    
    const verticalMatches = matches.length >= 3 ? [...matches] : [];
    
    return [...new Set([...horizontalMatches, ...verticalMatches].map(m => m.join(',')))].map(m => m.split(',').map(Number));
}

function removeMatches(matches) {
    const gems = document.querySelectorAll('.gem');
    matches.forEach(([row, col]) => {
        const index = row * BOARD_SIZE + col;
        gems[index].classList.add('removing');
        board[row][col] = null;
    });
    
    score += matches.length * 10;
    updateScore();
    checkLevelUp();
    playMatchSound(matches.length);
    
    setTimeout(() => {
        dropGems();
        fillEmptySpaces();
        renderBoard();
        
        setTimeout(() => {
            checkBoardForMatches();
        }, 500);
    }, 300);
}

function dropGems() {
    for (let col = 0; col < BOARD_SIZE; col++) {
        let emptyRow = BOARD_SIZE - 1;
        
        for (let row = BOARD_SIZE - 1; row >= 0; row--) {
            if (board[row][col] !== null) {
                if (row !== emptyRow) {
                    board[emptyRow][col] = board[row][col];
                    board[row][col] = null;
                }
                emptyRow--;
            }
        }
    }
}

function fillEmptySpaces() {
    for (let col = 0; col < BOARD_SIZE; col++) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            if (board[row][col] === null) {
                board[row][col] = getRandomGemType();
            }
        }
    }
}

function checkBoardForMatches() {
    let foundMatches = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const matches = checkMatch(row, col);
            if (matches.length >= 3) {
                foundMatches = [...foundMatches, ...matches];
            }
        }
    }
    
    const uniqueMatches = [...new Set(foundMatches.map(m => m.join(',')))].map(m => m.split(',').map(Number));
    
    if (uniqueMatches.length > 0) {
        removeMatches(uniqueMatches);
    } else {
        isProcessing = false;
        
        if (!hasValidMoves()) {
            showGameOverModal();
        }
    }
}

function hasValidMoves() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (col < BOARD_SIZE - 1) {
                const temp = board[row][col];
                board[row][col] = board[row][col + 1];
                board[row][col + 1] = temp;
                
                if (checkMatch(row, col).length >= 3 || checkMatch(row, col + 1).length >= 3) {
                    board[row][col + 1] = board[row][col];
                    board[row][col] = temp;
                    return true;
                }
                
                board[row][col + 1] = board[row][col];
                board[row][col] = temp;
            }
            
            if (row < BOARD_SIZE - 1) {
                const temp = board[row][col];
                board[row][col] = board[row + 1][col];
                board[row + 1][col] = temp;
                
                if (checkMatch(row, col).length >= 3 || checkMatch(row + 1, col).length >= 3) {
                    board[row + 1][col] = board[row][col];
                    board[row][col] = temp;
                    return true;
                }
                
                board[row + 1][col] = board[row][col];
                board[row][col] = temp;
            }
        }
    }
    return false;
}

function findValidMove() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (col < BOARD_SIZE - 1) {
                const temp = board[row][col];
                board[row][col] = board[row][col + 1];
                board[row][col + 1] = temp;
                
                if (checkMatch(row, col).length >= 3 || checkMatch(row, col + 1).length >= 3) {
                    board[row][col + 1] = board[row][col];
                    board[row][col] = temp;
                    return { row1: row, col1: col, row2: row, col2: col + 1 };
                }
                
                board[row][col + 1] = board[row][col];
                board[row][col] = temp;
            }
            
            if (row < BOARD_SIZE - 1) {
                const temp = board[row][col];
                board[row][col] = board[row + 1][col];
                board[row + 1][col] = temp;
                
                if (checkMatch(row, col).length >= 3 || checkMatch(row + 1, col).length >= 3) {
                    board[row + 1][col] = board[row][col];
                    board[row][col] = temp;
                    return { row1: row, col1: col, row2: row + 1, col2: col };
                }
                
                board[row + 1][col] = board[row][col];
                board[row][col] = temp;
            }
        }
    }
    return null;
}

function showHint() {
    if (isProcessing) return;
    
    clearHint();
    
    const move = findValidMove();
    if (move) {
        const gems = document.querySelectorAll('.gem');
        const index1 = move.row1 * BOARD_SIZE + move.col1;
        const index2 = move.row2 * BOARD_SIZE + move.col2;
        
        gems[index1].classList.add('hint');
        gems[index2].classList.add('hint');
        
        hintTimeout = setTimeout(() => {
            clearHint();
        }, 2000);
    }
}

function clearHint() {
    if (hintTimeout) {
        clearTimeout(hintTimeout);
        hintTimeout = null;
    }
    
    const hintedGems = document.querySelectorAll('.gem.hint');
    hintedGems.forEach(gem => gem.classList.remove('hint'));
}

function showGameOverModal() {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverModal').style.display = 'block';
    
    if (score > highScore) {
        const modalContent = document.querySelector('.modal-content p');
        modalContent.innerHTML = '新記録達成！<br>動かせる手がなくなりました！';
        modalContent.style.color = '#ffd700';
    }
}

function closeModal() {
    document.getElementById('gameOverModal').style.display = 'none';
}

function updateScore() {
    document.getElementById('score').textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('3matchHighScore', highScore);
        updateHighScore();
    }
}

function updateHighScore() {
    document.getElementById('highScore').textContent = highScore;
}

function loadHighScore() {
    const saved = localStorage.getItem('3matchHighScore');
    if (saved) {
        highScore = parseInt(saved);
    }
    updateHighScore();
}

function checkLevelUp() {
    if (score >= 1000 && lastLevelUp < 1000 && currentGemTypes < 7) {
        currentGemTypes = 7;
        lastLevelUp = 1000;
        showLevelUpNotification('レベルアップ！<br>ピンクの宝石が追加されました！');
    } else if (score >= 2000 && lastLevelUp < 2000 && currentGemTypes < 8) {
        currentGemTypes = 8;
        lastLevelUp = 2000;
        showLevelUpNotification('レベルアップ！<br>シアンの宝石が追加されました！');
    }
}

function showLevelUpNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'level-up-notification';
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

function resetGame() {
    score = 0;
    selectedGem = null;
    isProcessing = false;
    currentGemTypes = INITIAL_GEM_TYPES;
    lastLevelUp = 0;
    clearHint();
    closeModal();
    updateScore();
    createBoard();
    renderBoard();
}

loadHighScore();
resetGame();

document.addEventListener('click', function() {
    if (!audioContext) {
        initAudio();
    }
}, { once: true });