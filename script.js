class Game {
    /** @type {Board} */
    static board;
    /** @type {number} */
    static score;

    static init() {
        Logger.logSystem('Initializing...');

        Board.SIZE = 4;
        Control.bindKeyEvent();
        GameStorage.HIGHSCORE_NUMBER = 10;
        GameStorage.init();
    }

    static start() {
        Logger.logSystem('Starting game...');

        this.board = new Board();
        this.score = 0;
        UI.init();

        this.makeNewCell();
        this.makeNewCell();

        this.update();
    }

    static update() {
        UI.showAnim();
        UI.updateScore();
    }

    /** @param {boolean} isForced */
    static quit(isForced) {
        let alertText = 'Game over! You scored ' + this.score + '. ';
        if(GameStorage.isHighscore(this.score)) {
            ///////////////////////////////////////////////need to break/////////////////////////////////////////////////////////
            alertText += 'Input your name to register your score. '
            let name;
            let nameConfirmed = false;
            while(!nameConfirmed) {
                const tmp = prompt(alertText, 'Anonymous');
                if(tmp == null) {
                    name = 'Anonymous';
                } else {
                    name = tmp;
                }
                nameConfirmed = confirm('Confirm your name: ' + name);
            }
            GameStorage.registerHighscore(name, this.board.getHighestCellLevel(), this.score);
            alert(GameStorage.getHighscores());
        } else if(!isForced) {
            alert(alertText);
        }
    }

    static makeNewCell() {
        this.board.makeNewCell();
    }

    static pushUp()    { this.push(Direction.UP); }
    static pushDown()  { this.push(Direction.DOWN); }
    static pushLeft()  { this.push(Direction.LEFT); }
    static pushRight() { this.push(Direction.RIGHT); }

    /** @param {Direction} direction */
    static push(direction) {
        Logger.logSystem('Pushing ' + direction + '...');

        const isPushed = this.board.tryToPush(direction);
        if(isPushed) {
            this.makeNewCell();
        }
        this.update();
    }

    /** @param {number} mergedCellLevel */
    static addScore(mergedCellLevel) {
        this.score += 2 ** mergedCellLevel;
        Logger.logSystem('Current score: ' + this.score);
    }
}

class Control {
    static bindKeyEvent() {
        document.addEventListener('keydown', this.keyEventListener);
    }

    static keyEventListener(e) {
        Logger.logEvent('Following keydown event occured: ' + e.code);

        switch(e.code) {
            case 'KeyW': case 'ArrowUp':
                Game.pushUp(); break;
            case 'KeyS': case 'ArrowDown':
                Game.pushDown(); break;
            case 'KeyA': case 'ArrowLeft':
                Game.pushLeft(); break;
            case 'KeyD': case 'ArrowRight':
                Game.pushRight(); break;
            default:
                break;
        }
    }
}

class UI {
    /** @type {Element} */
    static fgLayer;
    /** @type {Element} */
    static scoreDiv;
    /** @type {Array<Anim>} */
    static animQueue;

    static init() {
        this.fgLayer = document.getElementsByClassName('foreground-layer')[0];
        this.scoreDiv = document.getElementsByClassName('score')[0].getElementsByClassName('number')[0];
        this.animQueue = new Array();
        this.clearBoard();

        Logger.logUI('Initialized UI');
        Logger.logUI(this.fgLayer);
        Logger.logUI(this.scoreDiv);
    }

    static clearBoard() {
        while(this.fgLayer.childElementCount > 0) {
            this.fgLayer.removeChild(this.fgLayer.children[0]);
        }
    }
/*
    static clearAnimQueue() {
        while(this.animQueue.length > 0) {
            this.animQueue.shift();
        }
    }
*/
    /** @param {Anim} anim */
    static pushAnim(anim) {
        this.animQueue.push(anim);
    }

    /** @param {Array<Anim>} animList */
    static concatAnim(animList) {
        this.animQueue = this.animQueue.concat(animList);
    }

    static showAnim() {
        this.removeOverlappingCells();
        this.removeAnimClasses();

        while(this.animQueue.length > 0) {
            const anim = this.animQueue.shift();
            if(anim instanceof NewCellAnim) {
                this.makeNewCell(anim);
            } else if(anim instanceof MoveAnim) {
                this.moveCell(anim);
            } else if(anim instanceof MergeAnim) {
                this.mergeCell(anim);
            } else {
                throw TypeError(anim + ' is not Anim.');
            }
        }
    }

    static removeOverlappingCells() {
        const cells = this.fgLayer.getElementsByClassName('cell-will-be-removed');
        while(cells.length > 0) {
            cells[0].remove();
        }
    }

    static removeAnimClasses() {
        const newCells = this.fgLayer.getElementsByClassName('cell-new');
        while(newCells.length > 0) {
            newCells[0].classList.remove('cell-new');
        }
        const mergedCells = this.fgLayer.getElementsByClassName('cell-merge');
        while(mergedCells.length > 0) {
            mergedCells[0].classList.remove('cell-merge');
        }
    }

    /** @param {NewCellAnim} anim */
    static makeNewCell(anim) {
        const sq = anim.coord.toSq();
        const newCell = document.createElement('div');
        newCell.classList.add('cell', 'lv-1', 'cell-new');
        newCell.classList.add(sq);
        this.fgLayer.appendChild(newCell);

        Logger.logUI('New cell is made on ' + sq);
        Logger.logUI(newCell);
    }

    /** @param {MoveAnim} anim */
    static moveCell(anim) {
        const startSq = anim.start.toSq();
        const endSq = anim.end.toSq();
        if(startSq == endSq) return;

        const movingCell = this.fgLayer.getElementsByClassName(startSq)[0];
        movingCell.classList.add(endSq);
        movingCell.classList.remove(startSq);

        Logger.logUI('A cell is moved from ' + startSq + ' to ' + endSq);
        Logger.logUI(movingCell);
    }

    /** @param {MergeAnim} anim */
    static mergeCell(anim) {
        const sq = anim.coord.toSq();

        const mergingCells = this.fgLayer.getElementsByClassName(sq);
        for(let i = 0; i < mergingCells.length; i++) {
            mergingCells[i].classList.add('cell-will-be-removed');
        }

        const mergedCell = document.createElement('div');
        mergedCell.classList.add('cell', 'lv-' + anim.level, 'cell-merge');
        mergedCell.classList.add(sq);
        this.fgLayer.appendChild(mergedCell);

        Logger.logUI('Two cells are merged on ' + sq);
        Logger.logUI(mergedCell);
    }

    static updateScore() {
        this.scoreDiv.textContent = Game.score.toString();
    }
}

class Board {
    static SIZE = 4;

    constructor() {
        this.init();
    }

    init() {
        /** @type {Array<number>} */
        this.arr = new Array();
        for(let i = 0; i < Board.SIZE; i++) {
            const r = new Array(Board.SIZE);
            r.fill(0);
            this.arr.push(r);
        }

        Logger.logBoard(this, 'Initialized board');
    }

    makeNewCell() {
        const emptyCoords = this.getEmptyCoords();
        const idx = Util.randomInt(emptyCoords.length);
        const coord = emptyCoords[idx];
        this.arr[coord.r][coord.c] = 1;

        UI.pushAnim(new NewCellAnim(coord));

        Logger.logBoard(this, 'Made new cell on ' + coord.r + ' ' + coord.c);
    }

    getEmptyCoords() {
        /** @type {Array<Coord>} */
        const emptyCoords = new Array();
        for(let i = 0; i < Board.SIZE; i++) {
            for(let j = 0; j < Board.SIZE; j++) {
                if(this.arr[i][j] == 0) {
                    emptyCoords.push(new Coord(i, j));
                }
            }
        }
        return emptyCoords;
    }

    getHighestCellLevel() {
        let highestCellLevel = 0;
        for(let i = 0; i < Board.SIZE; i++) {
            for(let j = 0; j < Board.SIZE; j++) {
                highestCellLevel = Math.max(highestCellLevel, this.arr[i][j]);
            }
        }
        return highestCellLevel;
    }

    /** @param {Direction} direction */
    tryToPush(direction) {
        const directionTypeError = TypeError(direction + ' is not a direction.');

        let isSomeLineChanged = false;
        for(let i = 0; i < Board.SIZE; i++) {
            let oldLine, newLine;

            // Get a clone of the line
            if(Direction.isVertical(direction)) {
                oldLine = this.getCol(i);
            } else if(Direction.isHorizontal(direction)) {
                oldLine = this.getRow(i);
            } else throw directionTypeError;

            // Push the clone line
            /** @type {Array<Anim>} */
            this.tmpAnimList = new Array();
            if(Direction.isUpOrLeft(direction)) {
                newLine = this.getPushedLineToFirst(oldLine);
            } else if(Direction.isDownOrRight(direction)) {
                newLine = this.getPushedLineToFirst(oldLine.reverse()).reverse();
                this.tmpAnimList = this.tmpAnimList.map(a => a.rowFlipped());
            } else throw directionTypeError;
            this.tmpAnimList = this.tmpAnimList.map(a => a.colSet(i));

            // Replace the line and check if changed
            let isChanged;
            if(Direction.isVertical(direction)) {
                isChanged = this.replaceColAndReturnIfChanged(i, newLine);
            } else if(Direction.isHorizontal(direction)) {
                isChanged = this.replaceRowAndReturnIfChanged(i, newLine);
                this.tmpAnimList = this.tmpAnimList.map(a => a.transposed());
            } else throw directionTypeError;
            isSomeLineChanged ||= isChanged;

            UI.concatAnim(this.tmpAnimList);
        }

        Logger.logBoard(this,
            'Tried to push ' + direction + ' and '
            + (isSomeLineChanged? 'succeeded' : 'failed')
        );

        return isSomeLineChanged;
    }

    getRow(num) {
        const row = new Array();
        for(let c = 0; c < Board.SIZE; c++) {
            row.push(this.arr[num][c]);
        }
        return row;
    }

    getCol(num) {
        const col = new Array();
        for(let r = 0; r < Board.SIZE; r++) {
            col.push(this.arr[r][num]);
        }
        return col;
    }

    getPushedLineToFirst(oldArr) {
        const newArr = new Array();

        let buffer = 0, bufidx;
        for(let i = 0; i < Board.SIZE; i++) {
            if(oldArr[i] == 0) {
                continue;
            }

            if(buffer == 0) {
                buffer = oldArr[i], bufidx = i;
            } else if(buffer == oldArr[i]) {
                this.tmpAnimList.push(MoveAnim.newWithRow(bufidx, newArr.length));
                this.tmpAnimList.push(MoveAnim.newWithRow(i, newArr.length));
                this.tmpAnimList.push(MergeAnim.newWithRow(newArr.length, buffer + 1));
                newArr.push(buffer + 1);
                Game.addScore(buffer + 1);
                buffer = 0, bufidx = undefined;
            } else {
                this.tmpAnimList.push(MoveAnim.newWithRow(bufidx, newArr.length));
                newArr.push(buffer);
                buffer = oldArr[i], bufidx = i;
            }
        }
        if(buffer != 0) {
            this.tmpAnimList.push(MoveAnim.newWithRow(bufidx, newArr.length));
            newArr.push(buffer);
        }

        while(newArr.length < Board.SIZE) {
            newArr.push(0);
        }

        return newArr;
    }

    replaceRowAndReturnIfChanged(num, rowArr) {
        let isChanged = false;
        for(let c = 0; c < Board.SIZE; c++) {
            if(this.arr[num][c] != rowArr[c]) {
                isChanged = true;
            }
            this.arr[num][c] = rowArr[c];
        }
        return isChanged;
    }

    replaceColAndReturnIfChanged(num, colArr) {
        let isChanged = false;
        for(let r = 0; r < Board.SIZE; r++) {
            if(this.arr[r][num] != colArr[r]) {
                isChanged = true;
            }
            this.arr[r][num] = colArr[r];
        }
        return isChanged;
    }
}

class Coord {
    /**
     * @param {number} r 
     * @param {number} c 
     */
    constructor(r, c) {
        this.r = r;
        this.c = c;
    }

    toSq() {
        return 'sq-' + this.r + this.c;
    }
}

class Direction {
    static UP = 'up';
    static DOWN = 'down';
    static LEFT = 'left';
    static RIGHT = 'right';

    static isVertical(direction)   { return direction == this.UP   || direction == this.DOWN; }
    static isHorizontal(direction) { return direction == this.LEFT || direction == this.RIGHT; }

    static isUpOrLeft(direction)    { return direction == this.UP   || direction == this.LEFT; }
    static isDownOrRight(direction) { return direction == this.DOWN || direction == this.RIGHT; }
}

class Anim {}

class NewCellAnim extends Anim {
    constructor(coord) {
        super();
        this.coord = coord;
    }
}

class MoveAnim extends Anim {
    constructor(startCoord, endCoord) {
        super();
        this.start = startCoord;
        this.end = endCoord;
    }

    static newWithRow(startIdx, endIdx) {
        return new MoveAnim(
            new Coord(startIdx, -1),
            new Coord(endIdx, -1)
        );
    }

    rowFlipped() {
        const sr = Board.SIZE - 1 - this.start.r;
        const er = Board.SIZE - 1 - this.end.r;
        return new MoveAnim(
            new Coord(sr, -1),
            new Coord(er, -1)
        );
    }

    colSet(idx) {
        return new MoveAnim(
            new Coord(this.start.r, idx),
            new Coord(this.end.r, idx)
        );
    }

    transposed() {
        return new MoveAnim(
            new Coord(this.start.c, this.start.r),
            new Coord(this.end.c, this.end.r)
        );
    }
}

class MergeAnim extends Anim {
    constructor(coord, level) {
        super();
        this.coord = coord;
        this.level = level;
    }

    static newWithRow(idx, level) {
        return new MergeAnim(new Coord(idx, -1), level);
    }

    rowFlipped() {
        const r = Board.SIZE - 1 - this.coord.r;
        return new MergeAnim(new Coord(r, -1), this.level);
    }

    colSet(idx) {
        return new MergeAnim(new Coord(this.coord.r, idx), this.level);
    }

    transposed() {
        return new MergeAnim(new Coord(this.coord.c, this.coord.r), this.level);
    }
}

class GameStorage {
    static HIGHSCORE_NUMBER = 10;
    static KEY_HIGHSCORES = '2048.highscores';

    static init() {
        const highscores = this.getHighscores();
        // if it's not in form, set highscore.
    }
    
    static getHighscores() {
        localStorage.getItem(this.KEY_HIGHSCORES);
    }
    
    static setHighscores(text) {
        localStorage.setItem(this.KEY_HIGHSCORES, text);
    }
    
    static isHighscore(score) {
        return confirm('is highscore?');
    }
    
    static registerHighscore(name, highestCellLevel, score) {
        //
    }
    }

class Util {
    static randomInt(arg1, arg2) {
        // randomInt() - 0.
        // randomInt(end) - [0, end).
        // randomInt(start, end) - [start, end).

        let start, end;
        if(arg1 == undefined && arg2 == undefined) {
            start = 0;
            end = 1;
        } else if(arg2 == undefined) {
            start = 0;
            end = arg1;
        } else {
            start = arg1;
            end = arg2;
        }
        return parseInt(Math.random() * (end-start) + start);
    }
}

class Logger {
    static allowLog = true;

    static allowSystemLog = false;
    static allowEventLog = false;
    static allowLogicLog = false;
    static allowUILog = false;

    static log(msg) {
        if(this.allowLog) console.log(msg);
    }

    static logSystem(msg) {
        if(this.allowSystemLog) this.log(msg);
    }

    static logEvent(msg) {
        if(this.allowEventLog) this.log(msg);
    }

    static logLogic(msg) {
        if(this.allowLogicLog) this.log(msg);
    }

    static logBoard(board, msg) {
        if(!this.allowLogicLog || !this.allowLog) return;
        let stringBuffer = '';
        for(let i = 0; i < Board.SIZE; i++) {
            for(let j = 0; j < Board.SIZE; j++) {
                stringBuffer += board.arr[i][j] + ' ';
            }
            stringBuffer += '\n';
        }
        stringBuffer += msg;
        this.logLogic(stringBuffer);
    }

    static logUI(msg) {
        if(this.allowUILog) this.log(msg);
    }
}

var main = function() {
    Game.init();
    Game.start();
}

main();



function newGame() {
    Game.quit(true);
    Game.start();
}

function toggleMenu() {
    const collapseClassName = 'collapsed';
    const menu = document.getElementsByClassName('menu')[0];
    menu.classList.toggle(collapseClassName);
}

function selectColorTheme(e) {
    document.documentElement.setAttribute('color-theme', e.target.value);
}
let colorThemeDropdown = document.getElementsByClassName('dropdown-color-theme')[0];
document.documentElement.setAttribute('color-theme', colorThemeDropdown[0].value);
colorThemeDropdown.addEventListener('change', selectColorTheme);

