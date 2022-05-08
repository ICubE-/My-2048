class Game {
    static board;

    static init() {
        Logger.logSystem('Initializing...');

        Board.size = 4;
        Control.bindKeyEvent();
        UI.init();
    }

    static start() {
        Logger.logSystem('Starting Game...');

        this.board = new Board();

        this.makeNewCell();
        this.makeNewCell();

        this.update();
    }

    static update() {
        UI.showAnimation();
    }

    static makeNewCell() {
        this.board.makeNewCell();
    }

    static pushUp()    { this.push(Direction.UP); }
    static pushDown()  { this.push(Direction.DOWN); }
    static pushLeft()  { this.push(Direction.LEFT); }
    static pushRight() { this.push(Direction.RIGHT); }

    static push(direction) {
        Logger.logSystem('Pushing ' + direction + '...');

        const isPushed = this.board.tryToPush(direction);
        if(isPushed) {
            this.makeNewCell();
        }
        this.update();
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
    static fgLayer;
    static animationQueue;

    static init() {
        this.fgLayer = document.getElementsByClassName('foreground-layer')[0];
        this.animationQueue = new Array();
        this.clearBoard();

        Logger.logUI('Initialized UI');
    }

    static clearBoard() {
        while(this.fgLayer.childElementCount > 0) {
            this.fgLayer.removeChild(this.fgLayer.children[0]);
        }
    }

    static clearAnimationQueue() {
        while(this.animationQueue.length > 0) {
            this.animationQueue.shift();
        }
    }

    static pushAnimation(animation) {
        this.animationQueue.push(animation);
    }

    static concatAnimation(animationList) {
        this.animationQueue = this.animationQueue.concat(animationList);
    }

    static showAnimation() {
        while(this.animationQueue.length > 0) {
            const anim = this.animationQueue.shift();
            if(anim instanceof NewCellAnimation) {
                this.makeNewCell(anim);
            } else if(anim instanceof MoveAnimation) {
                this.moveCell(anim);
            } else if(anim instanceof DoubleAnimation) {
                this.doubleCell(anim);
            } else {
                throw TypeError(anim + ' is not an animation.');
            }
        }
        this.clearAnimationQueue();
    }

    static makeNewCell(anim) {
        const newCell = document.createElement('div');
        newCell.classList.add('cell', 'lv-1', 'cell-new');
        newCell.classList.add(anim.coord.toSq());
        this.fgLayer.appendChild(newCell);

        //Logger.logUI(anim);
    }

    static moveCell(anim) {
        const startSq = anim.start.toSq();
        const endSq = anim.end.toSq();
        if(startSq == endSq) return;

        const movingCell = this.fgLayer.getElementsByClassName(startSq)[0];
        movingCell.classList.add(endSq);
        movingCell.classList.remove(startSq);

        //Logger.logUI(anim);
    }

    static doubleCell(anim) {   ///////////////////// Merge???
        const sq = anim.coord.toSq();
        const cells = this.fgLayer.getElementsByClassName(sq);
        while(cells.length > 0) {
            cells[0].remove();
        }
        const newCell = document.createElement('div');
        newCell.classList.add('cell', 'lv-' + anim.level);
        newCell.classList.add(sq);
        this.fgLayer.appendChild(newCell);

        //Logger.logUI(anim);
    }
}

class Board {
    static size = 4;

    constructor() {
        this.init();
    }

    init() {
        this.arr = new Array();
        for(let i = 0; i < Board.size; i++) {
            const r = new Array(Board.size);
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

        UI.pushAnimation(new NewCellAnimation(coord));

        Logger.logBoard(this, 'Made new cell on ' + coord.r + ' ' + coord.c);
    }
    
    getEmptyCoords() {
        const emptyCoords = new Array();
        for(let i = 0; i < Board.size; i++) {
            for(let j = 0; j < Board.size; j++) {
                if(this.arr[i][j] == 0) {
                    emptyCoords.push(new Coord(i, j));
                }
            }
        }
        return emptyCoords;
    }

    tryToPush(direction) {
        const directionTypeError = TypeError(direction + ' is not a direction.');
        
        let isSomeLineChanged = false;
        for(let i = 0; i < Board.size; i++) {
            let oldLine, newLine;

            if(Direction.isVertical(direction)) {
                oldLine = this.getCol(i);
            } else if(Direction.isHorizontal(direction)) {
                oldLine = this.getRow(i);
            } else throw directionTypeError;

            this.tmpAnimList = new Array();
            if(Direction.isUpOrLeft(direction)) {
                newLine = this.getPushedLineToFirst(oldLine);
            } else if(Direction.isDownOrRight(direction)) {
                newLine = this.getPushedLineToFirst(oldLine.reverse()).reverse();
                this.tmpAnimList = this.tmpAnimList.map(a => a.flipRow());
            } else throw directionTypeError;
            this.tmpAnimList = this.tmpAnimList.map(a => a.setCol(i));

            let isChanged;
            if(Direction.isVertical(direction)) {
                isChanged = this.replaceColAndReturnIfChanged(i, newLine);
            } else if(Direction.isHorizontal(direction)) {
                isChanged = this.replaceRowAndReturnIfChanged(i, newLine);
                this.tmpAnimList = this.tmpAnimList.map(a => a.exchangeRC());
            } else throw directionTypeError;
            isSomeLineChanged ||= isChanged;

            UI.concatAnimation(this.tmpAnimList);
        }
        
        Logger.logBoard(this,
            'Tried to push ' + direction + ' and '
            + (isSomeLineChanged? 'succeeded' : 'failed')
        );

        return isSomeLineChanged;
    }

    getRow(num) {
        const row = new Array();
        for(let c = 0; c < Board.size; c++) {
            row.push(this.arr[num][c]);
        }
        return row;
    }

    getCol(num) {
        const col = new Array();
        for(let r = 0; r < Board.size; r++) {
            col.push(this.arr[r][num]);
        }
        return col;
    }

    getPushedLineToFirst(oldArr) {
        const newArr = new Array();

        let buffer = 0, bufidx;
        for(let i = 0; i < Board.size; i++) {
            if(oldArr[i] == 0) {
                continue;
            }

            if(buffer == 0) {
                buffer = oldArr[i], bufidx = i;
            } else if(buffer == oldArr[i]) {
                this.tmpAnimList.push(new MoveAnimation(bufidx, newArr.length));
                this.tmpAnimList.push(new MoveAnimation(i, newArr.length));
                this.tmpAnimList.push(new DoubleAnimation(newArr.length, buffer + 1));
                newArr.push(buffer + 1);
                buffer = 0, bufidx = undefined;
            } else {
                this.tmpAnimList.push(new MoveAnimation(bufidx, newArr.length));
                newArr.push(buffer);
                buffer = oldArr[i], bufidx = i;
            }
        }
        if(buffer != 0) {
            this.tmpAnimList.push(new MoveAnimation(bufidx, newArr.length));
            newArr.push(buffer);
        }

        while(newArr.length < Board.size) {
            newArr.push(0);
        }
        
        return newArr;
    }

    replaceRowAndReturnIfChanged(num, rowArr) {
        let isChanged = false;
        for(let c = 0; c < Board.size; c++) {
            if(this.arr[num][c] != rowArr[c]) {
                isChanged = true;
            }
            this.arr[num][c] = rowArr[c];
        }
        return isChanged;
    }

    replaceColAndReturnIfChanged(num, colArr) {
        let isChanged = false;
        for(let r = 0; r < Board.size; r++) {
            if(this.arr[r][num] != colArr[r]) {
                isChanged = true;
            }
            this.arr[r][num] = colArr[r];
        }
        return isChanged;
    }
}

class Coord {
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

    static isVertical(direction) {
        return direction == this.UP || direction == this.DOWN;
    }
    static isHorizontal(direction) {
        return direction == this.LEFT || direction == this.RIGHT;
    }
    static isUpOrLeft(direction) {
        return direction == this.UP || direction == this.LEFT;
    }
    static isDownOrRight(direction) {
        return direction == this.DOWN || direction == this.RIGHT;
    }
}

class Animation {}

class NewCellAnimation extends Animation {
    constructor(coord) {
        super();
        this.coord = coord;
    }
}

class MoveAnimation extends Animation {
    constructor(startIdx, endIdx) { /////////////////Make constructor more generally(startcoord, endcoord)
        super();
        this.start = new Coord(startIdx, -1);
        this.end = new Coord(endIdx, -1);
    }

    flipRow() {
        this.start.r = Board.size - 1 - this.start.r;
        this.end.r = Board.size - 1 - this.end.r;
        return this;/////////////////////Return new instance rather than returning this
    }

    setCol(idx) {
        this.start.c = idx;
        this.end.c = idx;
        return this;/////////////////////Return new instance rather than returning this
    }

    exchangeRC() {/////////////////////Rename
        const t1 = this.start.r;
        this.start.r = this.start.c;
        this.start.c = t1;
        const t2 = this.end.r;
        this.end.r = this.end.c;
        this.end.c = t2;
        return this;/////////////////////Return new instance rather than returning this
    }
}

class DoubleAnimation extends Animation { /////Merge??
    constructor(idx, lvl) { /////////////////Make constructor more generally
        super();
        this.coord = new Coord(idx, -1);
        this.level = lvl;
    }

    flipRow() {
        this.coord.r = Board.size - 1 - this.coord.r;
        return this;/////////////////////Return new instance rather than returning this
    }

    setCol(idx) {
        this.coord.c = idx;
        return this;/////////////////////Return new instance rather than returning this
    }

    exchangeRC() {/////////////////////Rename
        const t = this.coord.r;
        this.coord.r = this.coord.c;
        this.coord.c = t;
        return this;/////////////////////Return new instance rather than returning this
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

    static allowSystemLog = true;
    static allowEventLog = true;
    static allowLogicLog = true;
    static allowUILog = true;

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
        for(let i = 0; i < Board.size; i++) {
            for(let j = 0; j < Board.size; j++) {
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