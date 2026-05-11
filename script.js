const STORAGE_KEY = 'kanban-board-v1';
const COLUMN_ORDER = ['todo', 'doing', 'done'];

const boardState = loadState();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-task-form');
    form.addEventListener('submit', onAddTask);

    setupDragAndDrop();
    renderBoard();
});

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { todo: [], doing: [], done: [] };

    try {
        const parsed = JSON.parse(raw);
        return {
            todo: parsed.todo ?? [],
            doing: parsed.doing ?? [],
            done: parsed.done ?? []
        };
    } catch {
        return { todo: [], doing: [], done: [] };
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boardState));
}

function onAddTask(event) {
    event.preventDefault();
    const titleEl = document.getElementById('task-title');
    const descEl = document.getElementById('task-desc');
    const priorityEl = document.getElementById('task-priority');

    const task = {
        id: crypto.randomUUID(),
        title: titleEl.value.trim(),
        description: descEl.value.trim(),
        priority: priorityEl.value
    };

    if (!task.title) return;

    boardState.todo.unshift(task);
    saveState();
    renderBoard();
    event.target.reset();
    titleEl.focus();
}

function renderBoard() {
    COLUMN_ORDER.forEach((column) => {
        const list = document.getElementById(`${column}-list`);
        list.innerHTML = '';

        boardState[column].forEach((task) => {
            list.appendChild(renderTask(task, column));
        });
    });
}

function renderTask(task, column) {
    const template = document.getElementById('task-template');
    const node = template.content.firstElementChild.cloneNode(true);

    node.dataset.id = task.id;
    node.dataset.column = column;
    node.querySelector('.task-title').textContent = task.title;
    node.querySelector('.task-desc').textContent = task.description || 'No description';

    const priorityNode = node.querySelector('.priority');
    priorityNode.textContent = task.priority;
    priorityNode.classList.add(task.priority);

    node.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => handleTaskAction(task.id, column, btn.dataset.action));
    });

    node.addEventListener('dragstart', onDragStart);
    node.addEventListener('dragend', onDragEnd);

    return node;
}

function handleTaskAction(taskId, column, action) {
    if (action === 'delete') {
        boardState[column] = boardState[column].filter((task) => task.id !== taskId);
    } else {
        const currentIndex = COLUMN_ORDER.indexOf(column);
        const targetIndex = action === 'left' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= COLUMN_ORDER.length) return;

        const taskIndex = boardState[column].findIndex((task) => task.id === taskId);
        if (taskIndex < 0) return;

        const [task] = boardState[column].splice(taskIndex, 1);
        boardState[COLUMN_ORDER[targetIndex]].unshift(task);
    }

    saveState();
    renderBoard();
}

function setupDragAndDrop() {
    document.querySelectorAll('.column').forEach((columnEl) => {
        columnEl.addEventListener('dragover', (event) => {
            event.preventDefault();
            columnEl.classList.add('drag-over');
        });

        columnEl.addEventListener('dragleave', () => columnEl.classList.remove('drag-over'));

        columnEl.addEventListener('drop', (event) => {
            event.preventDefault();
            columnEl.classList.remove('drag-over');

            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            if (!data?.taskId || !data?.fromColumn) return;
            moveTask(data.taskId, data.fromColumn, columnEl.dataset.column);
        });
    });
}

function moveTask(taskId, fromColumn, toColumn) {
    if (fromColumn === toColumn) return;

    const index = boardState[fromColumn].findIndex((task) => task.id === taskId);
    if (index < 0) return;

    const [task] = boardState[fromColumn].splice(index, 1);
    boardState[toColumn].unshift(task);
    saveState();
    renderBoard();
}

function onDragStart(event) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({
        taskId: event.currentTarget.dataset.id,
        fromColumn: event.currentTarget.dataset.column
    }));
}

function onDragEnd() {
    document.querySelectorAll('.column').forEach((col) => col.classList.remove('drag-over'));
}
