import { ArrowRightLeft, CalendarDays, Check, ChevronDown, Menu, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { cn } from "./lib/utils";

const STORAGE_KEY = "kanban-board-v2";
const WORKSPACE_STORAGE_KEY = "ctrlboard-workspace-v1";
const columns = [
  { id: "todo", title: "To Do", color: "yellow" },
  { id: "doing", title: "Doing", color: "pink" },
  { id: "done", title: "Done", color: "green" },
] as const;

const priorities = [
  { value: "low", label: "Low priority" },
  { value: "medium", label: "Medium priority" },
  { value: "high", label: "High priority" },
] as const;

const tickerPhrases = [
  "Productivity has been normalized",
  "Task completion is mandatory",
  "Momentum detected",
  "This board is operating within acceptable parameters",
  "Human delay factor increasing",
  "Priorities have been reassigned automatically",
  "Efficiency event recorded",
  "Idle behavior observed",
  "Workflow integrity holding",
  "Completion is encouraged, not required",
  "You are behind schedule in a statistically insignificant way",
  "Task density approaching nominal levels",
  "Additional tabs were unnecessary",
  "Administrative confidence increased by 2%",
  "The board acknowledges your contribution",
  "Progress has been cosmetically improved",
  "System optimism unavailable",
  "This could have been an email",
  "Your workflow has been calibrated",
  "Unfinished tasks remain unfinished",
  "Operational clutter reduced successfully",
  "Deadline proximity rising steadily",
  "This interaction will be documented nowhere",
  "The illusion of control remains stable",
  "You may now continue pretending to organize",
  "Several decisions have been postponed successfully",
  "Queue saturation avoided",
  "Additional coffee recommended",
  "Compliance with self-imposed objectives pending",
  "Time estimates were approximate",
  "Performance review probability increased",
  "Task migration complete",
  "No synergy detected",
  "Workflow friction remains acceptable",
  "Your productivity graph appears confident",
  "Manual organization still outperforming chaos",
  "Reminder suppression unsuccessful",
  "Status colors selected scientifically",
  "Corporate energy simulated successfully",
  "The system believes in you cautiously",
  "Further planning may delay execution",
  "Congratulations on moving the rectangle",
  "The board remains indifferent to excuses",
  "Cross-functional alignment sounds important",
  "The backlog is evolving naturally",
  "Work continues despite evidence",
  "Strategic procrastination detected",
  "Visual organization has improved morale",
  "You are now managing outcomes",
  "Meetings were not prevented",
  "Board stability nominal",
  "Achievement unlocked: opening the app",
] as const;

type ColumnId = (typeof columns)[number]["id"];
type Priority = (typeof priorities)[number]["value"];

type Task = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dateAdded: string;
};

type BoardState = Record<ColumnId, Task[]>;
type SortMode = "dateAdded" | "priority";
type SortState = Record<ColumnId, SortMode>;
type ManagedBoard = {
  id: string;
  name: string;
  columns: BoardState;
  createdAt: string;
};
type WorkspaceState = {
  activeBoardId: string;
  boards: ManagedBoard[];
};

const emptyBoard: BoardState = {
  todo: [],
  doing: [],
  done: [],
};

const defaultSorts: SortState = {
  todo: "dateAdded",
  doing: "dateAdded",
  done: "dateAdded",
};

const priorityRank: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function normalizeTask(task: Partial<Task>): Task | null {
  if (!task.id || !task.title || !task.priority) return null;

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    dateAdded: task.dateAdded ?? new Date().toISOString(),
  };
}

function loadBoard(): BoardState {
  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("kanban-board-v1");
  if (!raw) return emptyBoard;

  try {
    const parsed = JSON.parse(raw) as Partial<BoardState>;
    return {
      todo: (parsed.todo ?? []).map(normalizeTask).filter((task): task is Task => Boolean(task)),
      doing: (parsed.doing ?? []).map(normalizeTask).filter((task): task is Task => Boolean(task)),
      done: (parsed.done ?? []).map(normalizeTask).filter((task): task is Task => Boolean(task)),
    };
  } catch {
    return emptyBoard;
  }
}

function createManagedBoard(name: string, boardColumns: BoardState = emptyBoard): ManagedBoard {
  return {
    id: crypto.randomUUID(),
    name,
    columns: {
      todo: [...boardColumns.todo],
      doing: [...boardColumns.doing],
      done: [...boardColumns.done],
    },
    createdAt: new Date().toISOString(),
  };
}

function loadWorkspace(): WorkspaceState {
  const rawWorkspace = localStorage.getItem(WORKSPACE_STORAGE_KEY);

  if (rawWorkspace) {
    try {
      const parsed = JSON.parse(rawWorkspace) as Partial<WorkspaceState>;
      const parsedBoards = (parsed.boards ?? [])
        .map((board) => {
          if (!board?.id || !board.name || !board.columns) return null;

          return {
            id: board.id,
            name: board.name,
            columns: {
              todo: (board.columns.todo ?? []).map(normalizeTask).filter((task): task is Task => Boolean(task)),
              doing: (board.columns.doing ?? []).map(normalizeTask).filter((task): task is Task => Boolean(task)),
              done: (board.columns.done ?? []).map(normalizeTask).filter((task): task is Task => Boolean(task)),
            },
            createdAt: board.createdAt ?? new Date().toISOString(),
          };
        })
        .filter((board): board is ManagedBoard => Boolean(board));

      if (parsedBoards.length > 0) {
        const activeBoardId =
          parsed.activeBoardId && parsedBoards.some((board) => board.id === parsed.activeBoardId)
            ? parsed.activeBoardId
            : parsedBoards[0].id;

        return { activeBoardId, boards: parsedBoards };
      }
    } catch {
      // Fall through to old single-board migration.
    }
  }

  const migratedBoard = createManagedBoard("Main Board", loadBoard());
  return {
    activeBoardId: migratedBoard.id,
    boards: [migratedBoard],
  };
}

function formatDateAdded(dateAdded: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateAdded));
}

function sortTasks(tasks: Task[], sortMode: SortMode) {
  return [...tasks].sort((first, second) => {
    if (sortMode === "priority") {
      const priorityDifference = priorityRank[second.priority] - priorityRank[first.priority];
      if (priorityDifference !== 0) return priorityDifference;
    }

    return new Date(second.dateAdded).getTime() - new Date(first.dateAdded).getTime();
  });
}

export function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => loadWorkspace());
  const [sorts, setSorts] = useState<SortState>(defaultSorts);
  const boardRef = useRef<HTMLElement | null>(null);
  const brandBlockRef = useRef<HTMLDivElement | null>(null);
  const appTitleRef = useRef<HTMLHeadingElement | null>(null);
  const mobileTabScrollTimeoutRef = useRef<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [editingTask, setEditingTask] = useState<{
    taskId: string;
    columnId: ColumnId;
    title: string;
    description: string;
    priority: Priority;
  } | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ taskId: string; fromColumn: ColumnId } | null>(null);
  const [isPhoneView, setIsPhoneView] = useState(false);
  const [activeMobileColumn, setActiveMobileColumn] = useState<ColumnId>("todo");
  const [addTaskColumn, setAddTaskColumn] = useState<ColumnId>("todo");
  const [newBoardDialogOpen, setNewBoardDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<{ task: Task; columnId: ColumnId } | null>(null);
  const [boardNameDraft, setBoardNameDraft] = useState("");
  const [touchPreview, setTouchPreview] = useState<{
    task: Task;
    x: number;
    y: number;
  } | null>(null);
  const selectedPriority = useMemo(
    () => priorities.find((item) => item.value === priority) ?? priorities[1],
    [priority],
  );
  const activeBoard = workspace.boards.find((board) => board.id === workspace.activeBoardId) ?? workspace.boards[0];
  const board = activeBoard.columns;

  useEffect(() => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  useEffect(() => {
    const phoneQuery = window.matchMedia("(max-width: 640px)");
    const updatePhoneView = () => setIsPhoneView(phoneQuery.matches);

    updatePhoneView();
    phoneQuery.addEventListener("change", updatePhoneView);
    return () => phoneQuery.removeEventListener("change", updatePhoneView);
  }, []);

  useEffect(() => {
    const titleElement = appTitleRef.current;
    const brandElement = brandBlockRef.current;
    if (!titleElement || !brandElement) return;

    if (!isPhoneView) {
      titleElement.style.removeProperty("font-size");
      return;
    }

    const fitTitle = () => {
      const availableWidth = brandElement.clientWidth;
      if (!availableWidth) return;

      titleElement.style.fontSize = "80px";
      const titleWidth = titleElement.scrollWidth;
      const fittedSize = Math.floor(80 * Math.min(1, availableWidth / titleWidth));
      titleElement.style.fontSize = `${Math.max(fittedSize, 24)}px`;
    };

    fitTitle();
    document.fonts?.ready.then(fitTitle);

    const resizeObserver = new ResizeObserver(fitTitle);
    resizeObserver.observe(brandElement);
    window.addEventListener("resize", fitTitle);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", fitTitle);
    };
  }, [isPhoneView]);

  function updateActiveBoard(updater: (current: BoardState) => BoardState) {
    setWorkspace((current) => ({
      ...current,
      boards: current.boards.map((managedBoard) =>
        managedBoard.id === current.activeBoardId
          ? { ...managedBoard, columns: updater(managedBoard.columns) }
          : managedBoard,
      ),
    }));
  }

  function switchBoard(boardId: string) {
    setWorkspace((current) => ({ ...current, activeBoardId: boardId }));
    setEditingTask(null);
    setDraggedTask(null);
    setTouchPreview(null);
    setTaskPendingDelete(null);
    setActiveMobileColumn("todo");
    boardRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  function openNewBoardDialog() {
    setBoardNameDraft("");
    setNewBoardDialogOpen(true);
  }

  function openRenameDialog() {
    setBoardNameDraft(activeBoard.name);
    setRenameDialogOpen(true);
  }

  function addManagedBoard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = boardNameDraft.trim();
    if (!trimmedName) return;

    const managedBoard = createManagedBoard(trimmedName);
    setWorkspace((current) => ({
      activeBoardId: managedBoard.id,
      boards: [...current.boards, managedBoard],
    }));
    setEditingTask(null);
    setActiveMobileColumn("todo");
    setNewBoardDialogOpen(false);
    setBoardNameDraft("");
  }

  function renameActiveBoard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = boardNameDraft.trim();
    if (!trimmedName) return;

    setWorkspace((current) => ({
      ...current,
      boards: current.boards.map((managedBoard) =>
        managedBoard.id === current.activeBoardId ? { ...managedBoard, name: trimmedName } : managedBoard,
      ),
    }));
    setRenameDialogOpen(false);
    setBoardNameDraft("");
  }

  function deleteActiveBoard() {
    if (workspace.boards.length <= 1) return;

    setWorkspace((current) => {
      const remainingBoards = current.boards.filter((managedBoard) => managedBoard.id !== current.activeBoardId);
      return {
        activeBoardId: remainingBoards[0].id,
        boards: remainingBoards,
      };
    });
    setEditingTask(null);
    setDraggedTask(null);
    setTouchPreview(null);
    setTaskPendingDelete(null);
    setActiveMobileColumn("todo");
    setDeleteDialogOpen(false);
  }

  function openAddTaskDialog(columnId: ColumnId) {
    setAddTaskColumn(columnId);
    setAddTaskDialogOpen(true);
  }

  function addTask(event: React.FormEvent<HTMLFormElement>, targetColumn: ColumnId = "todo") {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const task: Task = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      description: description.trim(),
      priority,
      dateAdded: new Date().toISOString(),
    };

    updateActiveBoard((current) => ({ ...current, [targetColumn]: [task, ...current[targetColumn]] }));
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAddTaskDialogOpen(false);
  }

  function moveTask(taskId: string, fromColumn: ColumnId, toColumn: ColumnId) {
    if (fromColumn === toColumn) return;
    updateActiveBoard((current) => {
      const task = current[fromColumn].find((item) => item.id === taskId);
      if (!task) return current;
      return {
        ...current,
        [fromColumn]: current[fromColumn].filter((item) => item.id !== taskId),
        [toColumn]: [task, ...current[toColumn]],
      };
    });
  }

  function deleteTask(taskId: string, columnId: ColumnId) {
    updateActiveBoard((current) => ({
      ...current,
      [columnId]: current[columnId].filter((task) => task.id !== taskId),
    }));
    if (editingTask?.taskId === taskId) setEditingTask(null);
  }

  function openDeleteTaskDialog(task: Task, columnId: ColumnId) {
    setTaskPendingDelete({ task, columnId });
    setDeleteTaskDialogOpen(true);
  }

  function confirmDeleteTask() {
    if (!taskPendingDelete) return;
    deleteTask(taskPendingDelete.task.id, taskPendingDelete.columnId);
    setTaskPendingDelete(null);
    setDeleteTaskDialogOpen(false);
  }

  function startEditing(task: Task, columnId: ColumnId) {
    setEditingTask({
      taskId: task.id,
      columnId,
      title: task.title,
      description: task.description,
      priority: task.priority,
    });
  }

  function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask) return;

    const trimmedTitle = editingTask.title.trim();
    if (!trimmedTitle) return;

    updateActiveBoard((current) => ({
      ...current,
      [editingTask.columnId]: current[editingTask.columnId].map((task) =>
        task.id === editingTask.taskId
          ? {
              ...task,
              title: trimmedTitle,
              description: editingTask.description.trim(),
              priority: editingTask.priority,
            }
          : task,
      ),
    }));
    setEditingTask(null);
  }

  function finishTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (isPhoneView || !draggedTask) return;

    const touch = event.changedTouches[0];
    const dropColumn = document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.closest<HTMLElement>("[data-column-id]")
      ?.dataset.columnId as ColumnId | undefined;

    if (dropColumn) moveTask(draggedTask.taskId, draggedTask.fromColumn, dropColumn);
    setDraggedTask(null);
    setTouchPreview(null);
  }

  function startTouchMove(event: React.TouchEvent<HTMLElement>, task: Task, columnId: ColumnId, isEditing: boolean) {
    if (isPhoneView || isEditing) return;

    const touch = event.touches[0];
    setDraggedTask({ taskId: task.id, fromColumn: columnId });
    setTouchPreview({ task, x: touch.clientX, y: touch.clientY });
  }

  function updateTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (isPhoneView || !touchPreview) return;

    event.preventDefault();
    const touch = event.touches[0];
    setTouchPreview((current) => (current ? { ...current, x: touch.clientX, y: touch.clientY } : current));
  }

  function scrollToColumn(columnId: ColumnId) {
    const boardElement = boardRef.current;
    const targetColumn = boardElement?.querySelector<HTMLElement>(`[data-column-id="${columnId}"]`);
    if (!boardElement || !targetColumn) return;

    if (mobileTabScrollTimeoutRef.current) window.clearTimeout(mobileTabScrollTimeoutRef.current);
    boardElement.scrollTo({ left: targetColumn.offsetLeft - boardElement.offsetLeft, behavior: "smooth" });
    setActiveMobileColumn(columnId);
    mobileTabScrollTimeoutRef.current = window.setTimeout(() => {
      mobileTabScrollTimeoutRef.current = null;
      updateActiveMobileColumn();
    }, 420);
  }

  function updateActiveMobileColumn() {
    if (mobileTabScrollTimeoutRef.current) return;
    const boardElement = boardRef.current;
    if (!boardElement) return;

    const scrollPosition = boardElement.scrollLeft;
    const columnWidth = boardElement.clientWidth;
    const columnIndex = Math.round(scrollPosition / columnWidth);
    const column = columns[Math.min(Math.max(columnIndex, 0), columns.length - 1)];
    setActiveMobileColumn(column.id);
  }

  return (
    <main className="app-shell">
      <section className="app-header">
        <div className="brand-block" ref={brandBlockRef}>
          <h1 className="app-title" ref={appTitleRef}>
            CTRLBOARD
          </h1>
        </div>
        <div className="primary-menu-group">
          <Drawer>
            <DrawerTrigger asChild>
              <Button className="board-drawer-trigger" variant="noShadow" type="button">
                <span>{activeBoard.name}</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="primary-drawer-inner">
                <DrawerHeader>
                  <DrawerTitle>Board Menu</DrawerTitle>
                  <DrawerDescription>Switch boards or manage the current workspace.</DrawerDescription>
                </DrawerHeader>
                <div className="drawer-section">
                  <p className="drawer-section-label">Boards</p>
                  <div className="drawer-board-list">
                    {workspace.boards.map((managedBoard) => (
                      <DrawerClose asChild key={managedBoard.id}>
                        <button
                          type="button"
                          className={cn("drawer-board-button", managedBoard.id === activeBoard.id && "drawer-board-active")}
                          onClick={() => switchBoard(managedBoard.id)}
                        >
                          {managedBoard.name}
                        </button>
                      </DrawerClose>
                    ))}
                  </div>
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      className="drawer-action-button drawer-action-primary"
                      variant="noShadow"
                      onClick={openNewBoardDialog}
                    >
                      <Plus size={18} strokeWidth={3} />
                      New board
                    </Button>
                  </DrawerClose>
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      className="drawer-action-button drawer-action-secondary"
                      variant="noShadow"
                      onClick={openRenameDialog}
                    >
                      <Pencil size={18} strokeWidth={3} />
                      Rename
                    </Button>
                  </DrawerClose>
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      className="drawer-action-button"
                      variant="danger"
                      disabled={workspace.boards.length <= 1}
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 size={18} strokeWidth={3} />
                      Delete
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer>
            <DrawerTrigger asChild>
              <Button className="menu-trigger" type="button" aria-label="Open menu">
                <Menu size={22} strokeWidth={3} />
                Menu
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="primary-drawer-inner">
                <DrawerHeader>
                  <DrawerTitle>Settings</DrawerTitle>
                  <DrawerDescription>Additional controls will live here.</DrawerDescription>
                </DrawerHeader>
                <div className="drawer-placeholder">
                  <p>Settings are not configured yet.</p>
                </div>
                <DrawerFooter className="drawer-footer-single">
                  <DrawerClose asChild>
                    <Button type="button" variant="noShadow">
                      Close
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </section>

      <div className="status-ticker" aria-label="System status updates">
        <div className="status-ticker-track">
          {[...tickerPhrases, ...tickerPhrases].map((phrase, index) => (
            <span key={`${phrase}-${index}`}>{phrase}</span>
          ))}
        </div>
      </div>

      <Dialog open={newBoardDialogOpen} onOpenChange={setNewBoardDialogOpen}>
        <DialogContent>
          <form className="dialog-form" onSubmit={addManagedBoard}>
            <DialogHeader>
              <DialogTitle>New board</DialogTitle>
              <DialogDescription>Create a fresh board with its own To Do, Doing, and Done lanes.</DialogDescription>
            </DialogHeader>
            <div className="dialog-grid">
              <div className="dialog-field">
                <Label htmlFor="new-board-name">Board name</Label>
                <Input
                  id="new-board-name"
                  name="boardName"
                  maxLength={60}
                  value={boardNameDraft}
                  onChange={(event) => setBoardNameDraft(event.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="dialog-primary-button">
                Create board
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <form className="dialog-form" onSubmit={renameActiveBoard}>
            <DialogHeader>
              <DialogTitle>Rename board</DialogTitle>
              <DialogDescription>Give this board a name that is easy to spot in the switcher.</DialogDescription>
            </DialogHeader>
            <div className="dialog-grid">
              <div className="dialog-field">
                <Label htmlFor="rename-board-name">Board name</Label>
                <Input
                  id="rename-board-name"
                  name="boardName"
                  maxLength={60}
                  value={boardNameDraft}
                  onChange={(event) => setBoardNameDraft(event.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="dialog-primary-button">
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete board</DialogTitle>
            <DialogDescription>
              Delete "{activeBoard.name}" and all tasks on it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="danger" onClick={deleteActiveBoard}>
              Delete board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTaskDialogOpen}
        onOpenChange={(open) => {
          setDeleteTaskDialogOpen(open);
          if (!open) setTaskPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              Delete "{taskPendingDelete?.task.title}" from this board. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="danger" onClick={confirmDeleteTask}>
              Delete task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
        <DialogContent>
          <form className="dialog-form" onSubmit={(event) => addTask(event, addTaskColumn)}>
            <DialogHeader>
              <DialogTitle>Add task</DialogTitle>
              <DialogDescription>
                Add a new task to the {columns.find((column) => column.id === addTaskColumn)?.title} lane on "
                {activeBoard.name}".
              </DialogDescription>
            </DialogHeader>
            <div className="dialog-grid">
              <div className="dialog-field">
                <Label htmlFor="mobile-task-title">Task title</Label>
                <Input
                  id="mobile-task-title"
                  name="title"
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="dialog-field">
                <Label htmlFor="mobile-task-description">Details</Label>
                <textarea
                  id="mobile-task-description"
                  className="nb-input nb-textarea dialog-textarea"
                  name="description"
                  maxLength={400}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="dialog-field">
                <Label>Priority</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className={cn("priority-trigger", `priority-${selectedPriority.value}`)}
                      variant="noShadow"
                      type="button"
                    >
                      <span>{selectedPriority.label}</span>
                      <ChevronDown size={20} strokeWidth={3} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="priority-menu" align="start">
                    <DropdownMenuLabel>Priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {priorities.map((item) => (
                      <DropdownMenuItem key={item.value} onSelect={() => setPriority(item.value)}>
                        <span className={cn("priority-dot", `priority-dot-${item.value}`)} />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="dialog-primary-button">
                Add Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <form className="task-form desktop-task-form nb-panel" onSubmit={(event) => addTask(event)} aria-label="Add new task">
        <input
          className="nb-input"
          type="text"
          placeholder="New task title"
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <textarea
          className="nb-input nb-textarea"
          placeholder="Optional details"
          maxLength={400}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn("priority-trigger", `priority-${selectedPriority.value}`)}
              variant="noShadow"
              type="button"
            >
              <span>{selectedPriority.label}</span>
              <ChevronDown size={20} strokeWidth={3} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="priority-menu" align="start">
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {priorities.map((item) => (
              <DropdownMenuItem key={item.value} onSelect={() => setPriority(item.value)}>
                <span className={cn("priority-dot", `priority-dot-${item.value}`)} />
                <span>{item.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="submit" className="add-button">
          <Plus size={20} strokeWidth={3} />
          Add Task
        </Button>
      </form>

      <nav className="mobile-board-tabs" aria-label="Board columns">
        {columns.map((column) => (
          <button
            key={column.id}
            type="button"
            className={cn("mobile-board-tab", activeMobileColumn === column.id && "mobile-board-tab-active")}
            onClick={() => scrollToColumn(column.id)}
            aria-current={activeMobileColumn === column.id ? "true" : undefined}
          >
            {column.title}
          </button>
        ))}
      </nav>

      <section
        ref={boardRef}
        className="board"
        aria-label="Kanban board"
        onScroll={updateActiveMobileColumn}
      >
        {columns.map((column) => {
          const sortMode = sorts[column.id];

          return (
          <div key={column.id} className="column-slide" data-column-id={column.id}>
            <article
              className={cn("column nb-panel", `column-${column.color}`, draggedTask && "column-drop-ready")}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedTask) moveTask(draggedTask.taskId, draggedTask.fromColumn, column.id);
                setDraggedTask(null);
              }}
            >
              <header className="column-header">
                <div className="column-title-row">
                  <h2>{column.title}</h2>
                  <span>{board[column.id].length}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="sort-trigger" variant="noShadow" type="button">
                      <span>{sortMode === "dateAdded" ? "Date added" : "Priority"}</span>
                      <ChevronDown size={16} strokeWidth={3} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="sort-menu" align="end">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setSorts((current) => ({ ...current, [column.id]: "dateAdded" }))}>
                      Date added
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSorts((current) => ({ ...current, [column.id]: "priority" }))}>
                      Priority
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </header>
              <div className="task-list">
                {sortTasks(board[column.id], sortMode).map((task) => {
                  const isEditing = editingTask?.taskId === task.id;
                  const hasDescription = Boolean(task.description);

                  return (
                    <article
                      key={task.id}
                      className={cn(
                        "task-card",
                        !hasDescription && "task-card-compact",
                        touchPreview?.task.id === task.id && "task-card-touch-source",
                      )}
                      draggable={!isEditing && !isPhoneView}
                      onDragStart={() => !isEditing && setDraggedTask({ taskId: task.id, fromColumn: column.id })}
                      onDragEnd={() => setDraggedTask(null)}
                      onTouchStart={(event) => startTouchMove(event, task, column.id, isEditing)}
                      onTouchMove={updateTouchMove}
                      onTouchEnd={finishTouchMove}
                      onTouchCancel={() => {
                        setDraggedTask(null);
                        setTouchPreview(null);
                      }}
                    >
                      {isEditing && editingTask ? (
                        <form className="edit-task-form" onSubmit={saveTask} aria-label={`Edit ${task.title}`}>
                          <input
                            className="edit-task-input"
                            type="text"
                            maxLength={120}
                            value={editingTask.title}
                            onChange={(event) => setEditingTask({ ...editingTask, title: event.target.value })}
                            required
                          />
                          <textarea
                            className="edit-task-input edit-task-textarea"
                            maxLength={400}
                            value={editingTask.description}
                            onChange={(event) => setEditingTask({ ...editingTask, description: event.target.value })}
                            placeholder="Optional details"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                className={cn("edit-priority-trigger", `priority-${editingTask.priority}`)}
                                variant="noShadow"
                                type="button"
                              >
                                <span>{editingTask.priority}</span>
                                <ChevronDown size={16} strokeWidth={3} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="priority-menu" align="start">
                              <DropdownMenuLabel>Priority</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {priorities.map((item) => (
                                <DropdownMenuItem
                                  key={item.value}
                                  onSelect={() => setEditingTask({ ...editingTask, priority: item.value })}
                                >
                                  <span className={cn("priority-dot", `priority-dot-${item.value}`)} />
                                  <span>{item.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <footer className="task-actions task-actions-compact">
                            <Button type="submit" className="task-icon-button" aria-label="Save task">
                              <Check size={15} strokeWidth={3} />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="task-icon-button"
                              aria-label="Cancel edit"
                              onClick={() => setEditingTask(null)}
                            >
                              <X size={15} strokeWidth={3} />
                            </Button>
                          </footer>
                        </form>
                      ) : (
                        <>
                          <header className={cn("task-card-header", !hasDescription && "task-card-compact-main")}>
                            <h3>{task.title}</h3>
                            <span className={cn("priority-pill", `priority-${task.priority}`)}>{task.priority}</span>
                          </header>
                          {hasDescription && (
                            <div className="task-card-body">
                              <p>{task.description}</p>
                            </div>
                          )}
                          <footer className="task-footer">
                            <time dateTime={task.dateAdded}>
                              <CalendarDays size={15} strokeWidth={3} />
                              {formatDateAdded(task.dateAdded)}
                            </time>
                            <div className="task-icon-actions">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="bare-icon-button"
                                    aria-label="Move task"
                                    title="Move"
                                  >
                                    <ArrowRightLeft size={18} strokeWidth={3} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="move-menu" align="end">
                                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {columns.map((targetColumn) => (
                                    <DropdownMenuItem
                                      key={targetColumn.id}
                                      disabled={targetColumn.id === column.id}
                                      onSelect={() => moveTask(task.id, column.id, targetColumn.id)}
                                    >
                                      {targetColumn.title}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <button
                                type="button"
                                className="bare-icon-button"
                                aria-label="Edit task"
                                title="Edit"
                                onClick={() => startEditing(task, column.id)}
                              >
                                <Pencil size={18} strokeWidth={3} />
                              </button>
                              <button
                                type="button"
                                className="bare-icon-button bare-icon-button-danger"
                                aria-label="Delete task"
                                title="Delete"
                                onClick={() => openDeleteTaskDialog(task, column.id)}
                              >
                                <Trash2 size={18} strokeWidth={3} />
                              </button>
                            </div>
                          </footer>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
              <Button type="button" className="mobile-add-task-button" onClick={() => openAddTaskDialog(column.id)}>
                <Plus size={20} strokeWidth={3} />
                Add Task
              </Button>
            </article>
          </div>
          );
        })}
      </section>

      {touchPreview && (
        <article
          className="task-card task-card-touch-preview"
          style={{ transform: `translate(${touchPreview.x}px, ${touchPreview.y}px) translate(-50%, -50%)` }}
          aria-hidden="true"
        >
          <header className="task-card-header">
            <h3>{touchPreview.task.title}</h3>
            <span className={cn("priority-pill", `priority-${touchPreview.task.priority}`)}>
              {touchPreview.task.priority}
            </span>
          </header>
          {touchPreview.task.description && (
            <div className="task-card-body">
              <p>{touchPreview.task.description}</p>
            </div>
          )}
        </article>
      )}
    </main>
  );
}
