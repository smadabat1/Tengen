import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Plus,
  Search,
  FolderPlus,
  Lock,
  LockOpen,
  Trash2,
  Save,
  X,
  KeyRound,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  Expand,
  Info,
  MoreVertical,
  Edit2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";

import { vaultApi } from "@/api/vault";
import { useAppContext } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { CreateNoteFolderModal } from "@/components/vault/CreateNoteFolderModal";
import { RenameNoteFolderModal } from "@/components/vault/RenameNoteFolderModal";
import { DeleteFolderConfirmDialog } from "@/components/vault/DeleteFolderConfirmDialog";
import { PerNoteLockModal } from "@/components/vault/PerNoteLockModal";
import { DeleteNoteConfirmDialog } from "@/components/vault/DeleteNoteConfirmDialog";
import { Select } from "@/components/ui/Select";
import { Tooltip } from "@/components/ui/Tooltip";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function highlight(text, query) {
  if (!query || !text) return text;
  const source = String(text);
  const i = source.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return source;
  const before = source.slice(0, i);
  const hit = source.slice(i, i + query.length);
  const after = source.slice(i + query.length);
  return (
    <>
      {before}
      <mark className="bg-amber-300/50 text-foreground px-0.5 rounded-sm">{hit}</mark>
      {after}
    </>
  );
}

function NotesEditor({ value, onChange, locked }) {
  const editor = useEditor({
    editable: !locked,
    extensions: [
      StarterKit.configure({
        codeBlock: true,
        heading: { levels: [1, 2, 3] },
      }),
      Markdown,
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder: "Write your note… Type / for commands." }),
    ],
    content: value || EMPTY_DOC,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value || EMPTY_DOC)) {
      editor.commands.setContent(value || EMPTY_DOC, false);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!locked);
  }, [editor, locked]);

  return (
    <div
      className={cn(
        "flex flex-col flex-1 min-h-[380px] lg:min-h-0 rounded-xl border border-border/50 bg-card overflow-hidden transition-shadow focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50",
        locked && "opacity-80",
      )}
    >
      <div className="px-3 py-2 border-b border-border/40 text-xs text-muted-foreground flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Block editor</span>
        </div>
        <Tooltip
          side="bottom"
          content={
            <div className="space-y-1 p-1">
              <p className="font-semibold text-foreground border-b border-border/40 pb-1 mb-1">Markdown Shortcuts</p>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground text-right w-6">#</span>
                <span>Heading 1</span>
                <span className="text-muted-foreground text-right w-6">##</span>
                <span>Heading 2</span>
                <span className="text-muted-foreground text-right w-6">###</span>
                <span>Heading 3</span>
                <span className="text-muted-foreground text-right w-6">-</span>
                <span>Bullet List</span>
                <span className="text-muted-foreground text-right w-6">1.</span>
                <span>Numbered List</span>
                <span className="text-muted-foreground text-right w-6">&gt;</span>
                <span>Quote</span>
                <span className="text-muted-foreground text-right w-6">```</span>
                <span>Code Block</span>
                <span className="text-muted-foreground text-right w-6">---</span>
                <span>Divider</span>
              </div>
            </div>
          }
        >
          <button
            type="button"
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </button>
        </Tooltip>
      </div>
      <EditorContent
        editor={editor}
        className="p-4 prose prose-sm max-w-none flex-1 overflow-y-auto outline-none [&>div]:outline-none focus-within:outline-none"
      />
    </div>
  );
}

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { pendingViewNote, setPendingViewNote } = useAppContext();

  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(EMPTY_DOC);
  const [tagsInput, setTagsInput] = useState("");
  const [activeFolder, setActiveFolder] = useState(null);
  const [activeTag, setActiveTag] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated_at");
  const [order, setOrder] = useState("desc");
  const [lockSecret, setLockSecret] = useState("");
  const [unlockSecret, setUnlockSecret] = useState("");
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [selectedFolderForAction, setSelectedFolderForAction] = useState(null);
  const [showFolders, setShowFolders] = useState(true);
  const [showList, setShowList] = useState(true);
  const [mobilePanel, setMobilePanel] = useState('notes');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: foldersData } = useQuery({
    queryKey: ["note-folders"],
    queryFn: vaultApi.listNoteFolders,
  });

  const { data: tagsData } = useQuery({
    queryKey: ["note-tags"],
    queryFn: vaultApi.listNoteTags,
  });

  const notesParams = useMemo(
    () => ({
      ...(activeFolder ? { folder_id: activeFolder } : {}),
      ...(activeTag ? { tag: activeTag } : {}),
      ...(search ? { search } : {}),
      sort,
      order,
    }),
    [activeFolder, activeTag, search, sort, order],
  );

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", notesParams],
    queryFn: () => vaultApi.listNotes(notesParams),
  });

  const createNote = useMutation({
    mutationFn: (payload) => vaultApi.createNote(payload),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-folders"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
      setSelectedNoteId(note.id);
      toast.success("Note created");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to create note"),
  });

  const updateNote = useMutation({
    mutationFn: ({ id, payload }) => vaultApi.updateNote(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-folders"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
      toast.success("Saved");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to save note"),
  });

  const deleteNote = useMutation({
    mutationFn: (id) => vaultApi.deleteNote(id),
    onSuccess: () => {
      setSelectedNoteId(null);
      setTitle("");
      setContent(EMPTY_DOC);
      setTagsInput("");
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-folders"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
      toast.success("Note deleted");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to delete note"),
  });

  const createFolder = useMutation({
    mutationFn: (name) => vaultApi.createNoteFolder(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-folders"] });
      toast.success("Folder created");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to create folder"),
  });

  const updateFolder = useMutation({
    mutationFn: ({ id, name }) => vaultApi.updateNoteFolder(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-folders"] });
      toast.success("Folder renamed");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to rename folder"),
  });

  const deleteFolder = useMutation({
    mutationFn: (id) => vaultApi.deleteNoteFolder(id),
    onSuccess: () => {
      if (activeFolder === selectedFolderForAction?.id) setActiveFolder(null);
      queryClient.invalidateQueries({ queryKey: ["note-folders"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Folder deleted");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to delete folder"),
  });

  const lockNote = useMutation({
    mutationFn: ({ id, secret }) => vaultApi.lockNote(id, secret),
    onSuccess: () => {
      setLockSecret("");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note locked");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to lock note"),
  });

  const unlockNote = useMutation({
    mutationFn: ({ id, secret }) => vaultApi.unlockNote(id, secret),
    onSuccess: () => {
      setUnlockSecret("");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note unlocked");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Wrong PIN/password"),
  });

  const removeLock = useMutation({
    mutationFn: (id) => vaultApi.removeNoteLock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Lock removed");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to remove lock"),
  });

  const selected = useMemo(() => notes.find((n) => n.id === selectedNoteId) || null, [notes, selectedNoteId]);

  useEffect(() => {
    if (!notes.length) return;

    if (pendingViewNote) {
      setSelectedNoteId(pendingViewNote.id);
      setPendingViewNote(null);
      return;
    }

    if (!selectedNoteId || !notes.some((n) => n.id === selectedNoteId)) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId, pendingViewNote, setPendingViewNote]);

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title || "");
    setContent(selected.content || EMPTY_DOC);
    setTagsInput((selected.tags || []).join(", "));
  }, [selected]);

  const handleCreate = () => {
    createNote.mutate({
      title: "Untitled",
      content: EMPTY_DOC,
      folder_id: activeFolder || undefined,
      tags: [],
    });
  };

  const handleSave = () => {
    if (!selected) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateNote.mutate({
      id: selected.id,
      payload: {
        title: title || "Untitled",
        content,
        folder_id: selected.folder_id,
        tags,
      },
    });
  };

  const onCreateFolder = () => {
    setIsFolderModalOpen(true);
  };

  const folders = foldersData?.folders || [];
  const noteTags = tagsData?.tags || [];

  return (
    <div className="h-full p-4 md:p-6 flex flex-col">
      {/* Mobile panel tab switcher — hidden on lg+ */}
      <div className="flex lg:hidden mb-3 rounded-xl border border-border/50 bg-card/40 overflow-hidden flex-shrink-0">
        {[['folders', 'Folders'], ['notes', 'Notes'], ['editor', 'Editor']].map(([p, label]) => (
          <button
            key={p}
            onClick={() => setMobilePanel(p)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              mobilePanel === p
                ? 'bg-secondary text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "grid gap-4 flex-1 min-h-0 transition-all duration-300",
          showFolders && showList
            ? "grid-cols-1 lg:grid-cols-[240px_320px_minmax(0,1fr)]"
            : !showFolders && showList
              ? "grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]"
              : "grid-cols-1",
        )}
      >
        {/* Folders panel — mobile: show only when mobilePanel==='folders', desktop: respect showFolders+showList */}
        <aside className={cn(
          "border border-border/50 rounded-xl bg-card/40 p-3 overflow-y-auto",
          mobilePanel === 'folders' ? 'block' : 'hidden',
          showFolders && showList ? 'lg:block' : 'lg:hidden',
        )}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Folders</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowFolders(false)}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
                <button
                  onClick={onCreateFolder}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveFolder(null)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-md text-sm mb-1",
                !activeFolder
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              All notes
            </button>

            {folders.map((f) => (
              <div
                key={f.id}
                className={cn(
                  "relative flex items-center group w-full px-2 py-0.5 rounded-md text-sm mb-1 gap-1",
                  activeFolder === f.id
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                <button
                  onClick={() => setActiveFolder(f.id)}
                  className="flex-1 flex items-center justify-between text-left py-1 min-w-0"
                >
                  <span className="truncate pr-2">{f.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{f.note_count}</span>
                </button>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="opacity-40 group-hover:opacity-100 data-[state=open]:opacity-100 p-1 -mr-1 rounded-md hover:bg-background/80 transition-opacity outline-none focus-visible:ring-1 focus-visible:ring-primary/50">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      className="z-50 min-w-[140px] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-md animate-in fade-in-80 zoom-in-95"
                    >
                      <DropdownMenu.Item
                        onSelect={() => {
                          setSelectedFolderForAction(f);
                          setIsRenameFolderModalOpen(true);
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-xs outline-none transition-colors hover:bg-secondary focus:bg-secondary"
                      >
                        <Edit2 className="mr-2 w-3.5 h-3.5" />
                        <span>Rename folder</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onSelect={() => {
                          setSelectedFolderForAction(f);
                          setIsDeleteFolderModalOpen(true);
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-xs text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
                      >
                        <Trash2 className="mr-2 w-3.5 h-3.5" />
                        <span>Delete folder</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            ))}

            <div className="mt-4 pt-3 border-t border-border/40">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Tags</p>
              <button
                onClick={() => setActiveTag("")}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md text-sm mb-1",
                  !activeTag
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                All tags
              </button>
              {noteTags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTag(t.name)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-md text-sm mb-1 flex items-center justify-between",
                    activeTag === t.name
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  <span className="truncate">#{t.name}</span>
                  <span className="text-[10px] text-muted-foreground">{t.note_count}</span>
                </button>
              ))}
            </div>
          </aside>

        {/* Notes list panel — mobile: show only when mobilePanel==='notes', desktop: respect showList */}
        <section className={cn(
          "border border-border/50 rounded-xl bg-card/40 p-3 overflow-hidden min-h-0 flex flex-col",
          mobilePanel === 'notes' ? 'block' : 'hidden',
          showList ? 'lg:flex' : 'lg:hidden',
        )}>
            <div className="flex items-center gap-2 mb-3">
              {!showFolders && (
                <button
                  onClick={() => setShowFolders(true)}
                  className="p-1.5 -ml-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                  title="Show folders"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search notes"
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-input text-sm"
                />
              </div>
              <button
                onClick={handleCreate}
                className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Select
                value={sort}
                onValueChange={setSort}
                options={[
                  { value: "updated_at", label: "Last updated" },
                  { value: "created_at", label: "Created" },
                  { value: "title", label: "Title" },
                ]}
                className="h-8 w-32 bg-input border-border"
              />
              <button
                onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
                className="h-8 px-2 rounded-lg border border-border bg-input text-xs"
              >
                {order === "desc" ? "↓" : "↑"}
              </button>
              {search && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                  }}
                  className="h-8 px-2 rounded-lg border border-border bg-input text-xs text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 space-y-1">
              {isLoading && <p className="text-sm text-muted-foreground px-2 py-3">Loading notes…</p>}
              {!isLoading && notes.length === 0 && (
                <p className="text-sm text-muted-foreground px-2 py-3">No notes found.</p>
              )}
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => { setSelectedNoteId(note.id); setMobilePanel('editor') }}
                  className={cn(
                    "w-full text-left p-2 rounded-lg border transition-colors",
                    selectedNoteId === note.id
                      ? "border-primary/40 bg-secondary/70"
                      : "border-border/40 hover:bg-secondary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{highlight(note.title, search)}</p>
                    {note.is_locked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{highlight(note.folder_name, search)}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(note.tags || []).map((t) => (
                      <span
                        key={`${note.id}-${t}`}
                        className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] text-muted-foreground"
                      >
                        #{highlight(t, search)}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </section>

        {/* Editor panel — mobile: show only when mobilePanel==='editor', desktop: always shown */}
        <section className={cn(
          "border border-border/50 rounded-xl bg-card/40 p-4 overflow-hidden min-h-0 flex flex-col",
          mobilePanel === 'editor' ? 'flex' : 'hidden',
          'lg:flex',
        )}>
          {!selected ? (
            <div className="m-auto text-sm text-muted-foreground flex flex-col items-center gap-2">
              <p>Select or create a note to start editing.</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const isFocused = !showFolders && !showList;
                    if (isFocused) {
                      setShowFolders(true);
                      setShowList(true);
                    } else {
                      setShowFolders(false);
                      setShowList(false);
                    }
                  }}
                  className={cn(
                    "h-10 px-3 rounded-lg border border-border text-sm flex items-center justify-center transition-colors shrink-0",
                    !showFolders && !showList
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-input text-muted-foreground hover:bg-secondary",
                  )}
                  title={!showFolders && !showList ? "Show sidebar" : "Focus mode"}
                >
                  <Expand className="w-4 h-4" />
                </button>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  className="flex-1 h-10 rounded-lg border border-border bg-input px-3 text-sm"
                />
                <button
                  onClick={handleSave}
                  className="h-10 px-3 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
                {(!selected.is_locked || selected.is_unlocked) && (
                  <button
                    onClick={() => setIsLockModalOpen(true)}
                    className={cn(
                      "h-10 px-3 rounded-lg border text-sm flex items-center gap-1.5 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      selected.is_locked
                        ? "border-amber-500/40 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
                        : "border-border/40 text-muted-foreground hover:bg-secondary/40",
                    )}
                    title={selected.is_locked ? "Remove Security Lock" : "Secure Note"}
                  >
                    {selected.is_locked ? <LockOpen className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{selected.is_locked ? "Remove Lock" : "Lock"}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="h-10 px-3 rounded-lg border border-destructive/40 text-destructive text-sm flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-2">
                <Select
                  value={selected.folder_id}
                  onValueChange={(val) => updateNote.mutate({ id: selected.id, payload: { folder_id: Number(val) } })}
                  options={folders.map((f) => ({ value: f.id, label: f.name }))}
                  placeholder="Select a folder"
                  className="h-10 bg-input border-border"
                />
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onBlur={handleSave}
                  placeholder="Tags, comma separated"
                  className="h-9 rounded-lg border border-border bg-input px-3 text-sm"
                />
              </div>

              {selected.is_locked && !selected.is_unlocked && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                    <Lock className="w-4 h-4" />
                    This note is locked
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={unlockSecret}
                      onChange={(e) => setUnlockSecret(e.target.value)}
                      type="password"
                      placeholder="Enter PIN/password"
                      className="flex-1 h-9 rounded-lg border border-border bg-input px-3 text-sm"
                    />
                    <button
                      onClick={() => unlockNote.mutate({ id: selected.id, secret: unlockSecret })}
                      className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Unlock
                    </button>
                  </div>
                </div>
              )}

              {(!selected.is_locked || selected.is_unlocked) && (
                <NotesEditor value={content} onChange={setContent} locked={false} />
              )}
            </div>
          )}
        </section>
      </div>
      <CreateNoteFolderModal
        open={isFolderModalOpen}
        onOpenChange={setIsFolderModalOpen}
        onConfirm={(name) => createFolder.mutate(name)}
      />

      {selectedFolderForAction && (
        <RenameNoteFolderModal
          open={isRenameFolderModalOpen}
          onOpenChange={setIsRenameFolderModalOpen}
          folder={selectedFolderForAction}
          onConfirm={(name) => updateFolder.mutate({ id: selectedFolderForAction.id, name })}
        />
      )}

      {selectedFolderForAction && (
        <DeleteFolderConfirmDialog
          open={isDeleteFolderModalOpen}
          onOpenChange={setIsDeleteFolderModalOpen}
          folder={selectedFolderForAction}
          onConfirm={() => {
            deleteFolder.mutate(selectedFolderForAction.id);
            setIsDeleteFolderModalOpen(false);
          }}
          isPending={deleteFolder.isPending}
        />
      )}

      {selected && (
        <PerNoteLockModal
          open={isLockModalOpen}
          onOpenChange={setIsLockModalOpen}
          isLocked={selected.is_locked}
          onLock={(secret) => lockNote.mutate({ id: selected.id, secret })}
          onRemoveLock={() => removeLock.mutate(selected.id)}
        />
      )}
      {selected && (
        <DeleteNoteConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          note={selected}
          onConfirm={() => deleteNote.mutate(selected.id)}
          isPending={deleteNote.isPending}
        />
      )}
    </div>
  );
}
