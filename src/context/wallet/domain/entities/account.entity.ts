export interface AccountPrimitives {
  id: string;
  name: string;
  balance: number;
  currency: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  icon?: string;
  deleted_at?: Date | null;
}


export class Account {
  private readonly id: string;
  private readonly name: string;
  private readonly balance: number;
  private readonly currency: string;
  private readonly icon?: string;
  private readonly user_id: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;


  constructor(
    id: string,
    name: string,
    balance: number,
    currency: string,
    user_id: string,
    created_at: Date,
    updated_at: Date,
    icon?: string,
    deleted_at?: Date | null,
  ) {

    this.id = id;
    this.name = name;
    this.balance = balance;
    this.currency = currency;
    this.user_id = user_id;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.icon = icon;
    this.deleted_at = deleted_at;
  }


  static create(
    account: Omit<AccountPrimitives, 'id' | 'created_at' | 'updated_at'>,
  ): Account {
    return new Account(
      Account.generateAccountId(),
      account.name,
      account.balance,
      account.currency,
      account.user_id,
      new Date(),
      new Date(),
      account.icon,
    );
  }

  private static generateAccountId(): string {
    return Array(12)
      .fill(0)
      .map(() => Math.floor(Math.random() * 10))
      .join('');
  }

  toPrimitives(): AccountPrimitives {
    return {
      id: this.id,
      name: this.name,
      balance: this.balance,
      currency: this.currency,
      icon: this.icon,
      user_id: this.user_id,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };

  }

  static fromPrimitives(primitives: AccountPrimitives): Account {
    return new Account(
      primitives.id,
      primitives.name,
      primitives.balance,
      primitives.currency,
      primitives.user_id,
      primitives.created_at,
      primitives.updated_at,
      primitives.icon,
      primitives.deleted_at,
    );

  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  getBalance() {
    return this.balance;
  }

  getCurrency() {
    return this.currency;
  }

  getIcon() {
    return this.icon;
  }

  getUserId() {
    return this.user_id;
  }

  getCreatedAt() {
    return this.created_at;
  }

  getUpdatedAt() {
    return this.updated_at;
  }

  getDeletedAt() {
    return this.deleted_at;
  }
}

