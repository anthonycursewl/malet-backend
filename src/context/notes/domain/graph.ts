/** Grafo de conocimiento del usuario: notas como nodos y enlaces como aristas. */
export interface NoteGraphNode {
  id: string;
  title: string;
  pinned: boolean;
}

export interface NoteGraphEdge {
  source: string;
  target: string;
}

export interface NoteGraph {
  nodes: NoteGraphNode[];
  edges: NoteGraphEdge[];
  /** `true` cuando hay más notas que el límite del grafo. */
  truncated: boolean;
}
