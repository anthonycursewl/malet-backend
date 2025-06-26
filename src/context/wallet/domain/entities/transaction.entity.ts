export interface TransactionPrimitives {
    id: string;
    name: string;
    amount: number;
    type: string;
    account_id: string;
    issued_at: Date;
}

export class Transaction {
    private readonly id: string;
    private readonly name: string;
    private readonly amount: number;
    private readonly type: string;
    private readonly account_id: string;
    private readonly issued_at: Date;

    constructor(
        id: string,
        name: string,
        amount: number,
        type: string,
        account_id: string,
        issued_at: Date
    ) {
        this.id = id;
        this.name = name;
        this.amount = amount;
        this.type = type;
        this.account_id = account_id;
        this.issued_at = issued_at;
    }

    getId() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    getAmount() {
        return this.amount;
    }

    getType() {
        return this.type;
    }

    getAccountId() {
        return this.account_id;
    }

    getIssuedAt() {
        return this.issued_at;
    }

    toPrimitives() {
        return {
            id: this.id,
            name: this.name,
            amount: this.amount,
            type: this.type,
            account_id: this.account_id,
            issued_at: this.issued_at
        };
    }

    static fromPrimitives(primitives: TransactionPrimitives): Transaction {
        return new Transaction(
            primitives.id,
            primitives.name,
            primitives.amount,
            primitives.type,
            primitives.account_id,
            primitives.issued_at
        );
    }

    static create(transaction: Omit<TransactionPrimitives, 'id' | 'issued_at'>): Transaction {
        return new Transaction(
            'M-' + crypto.randomUUID().split('-')[4],
            transaction.name,
            transaction.amount,
            transaction.type,
            transaction.account_id,
            new Date()
        );
    }
}
