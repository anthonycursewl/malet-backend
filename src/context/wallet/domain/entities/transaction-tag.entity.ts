export interface TransactionTagPrimitives {
  id: string;
  name: string;
  slug: string;
  color?: string;
  palette?: string[];
  user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

function generateTagId(): string {
  return (
    'TAG-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).substring(2, 8)
  );
}

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export class TransactionTag {
  private readonly id: string;
  private readonly name: string;
  private readonly slug: string;
  private readonly color?: string;
  private readonly palette?: string[];
  private readonly user_id: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date;

  constructor(props: TransactionTagPrimitives) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.color = props.color;
    this.palette = props.palette;
    this.user_id = props.user_id;
    this.created_at = props.created_at;
    this.updated_at = props.updated_at;
    this.deleted_at = props.deleted_at;
  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  getSlug() {
    return this.slug;
  }

  getColor() {
    return this.color;
  }

  getUserId() {
    return this.user_id;
  }

  isDeleted() {
    return !!this.deleted_at;
  }

  toPrimitives() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      color: this.color,
      palette: this.palette,
      user_id: this.user_id,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };
  }

  static fromPrimitives(primitives: TransactionTagPrimitives): TransactionTag {
    return new TransactionTag(primitives);
  }

  static create(params: {
    name: string;
    color?: string;
    userId: string;
    available_colors?: string[];
  }): TransactionTag {
    const now = new Date();
    const slug = normalizeSlug(params.name);
    return new TransactionTag({
      id: generateTagId(),
      name: params.name,
      slug,
      color: params.color,
      palette: params.available_colors,
      user_id: params.userId,
      created_at: now,
      updated_at: now,
    });
  }

  update(params: { name?: string; color?: string }): TransactionTag {
    const now = new Date();
    return new TransactionTag({
      ...this.toPrimitives(),
      name: params.name ?? this.name,
      slug: params.name ? normalizeSlug(params.name) : this.slug,
      color: params.color ?? this.color,
      updated_at: now,
    });
  }

  delete(): TransactionTag {
    return new TransactionTag({
      ...this.toPrimitives(),
      deleted_at: new Date(),
    });
  }
}
