export interface SharedAccountPrimitives {
    id: string;
    name: string;
    account_id: string;
    user_id: string;
    identification_number?: string | null;
    phone_associated?: string | null;
    email_associated?: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date | null;
}

export class SharedAccount {
    private readonly id: string;
    private readonly name: string;
    private readonly account_id: string;
    private readonly user_id: string;
    private readonly identification_number?: string | null;
    private readonly phone_associated?: string | null;
    private readonly email_associated?: string | null;
    private readonly created_at: Date;
    private readonly updated_at: Date;
    private readonly deleted_at?: Date | null;

    constructor(
        id: string,
        name: string,
        account_id: string,
        user_id: string,
        identification_number: string | null | undefined,
        phone_associated: string | null | undefined,
        email_associated: string | null | undefined,
        created_at: Date,
        updated_at: Date,
        deleted_at?: Date | null,
    ) {
        this.id = id;
        this.name = name;
        this.account_id = account_id;
        this.user_id = user_id;
        this.identification_number = identification_number;
        this.phone_associated = phone_associated;
        this.email_associated = email_associated;
        this.created_at = created_at;
        this.updated_at = updated_at;
        this.deleted_at = deleted_at;
    }

    static create(
        data: Omit<SharedAccountPrimitives, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>,
    ): SharedAccount {
        return new SharedAccount(
            SharedAccount.generateId(),
            data.name,
            data.account_id,
            data.user_id,
            data.identification_number,
            data.phone_associated,
            data.email_associated,
            new Date(),
            new Date(),
            null,
        );
    }

    private static generateId(): string {
        return Array(12)
            .fill(0)
            .map(() => Math.floor(Math.random() * 10))
            .join('');
    }

    toPrimitives(): SharedAccountPrimitives {
        return {
            id: this.id,
            name: this.name,
            account_id: this.account_id,
            user_id: this.user_id,
            identification_number: this.identification_number,
            phone_associated: this.phone_associated,
            email_associated: this.email_associated,
            created_at: this.created_at,
            updated_at: this.updated_at,
            deleted_at: this.deleted_at,
        };
    }

    static fromPrimitives(primitives: SharedAccountPrimitives): SharedAccount {
        return new SharedAccount(
            primitives.id,
            primitives.name,
            primitives.account_id,
            primitives.user_id,
            primitives.identification_number,
            primitives.phone_associated,
            primitives.email_associated,
            primitives.created_at,
            primitives.updated_at,
            primitives.deleted_at,
        );
    }

    getId() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    getAccountId() {
        return this.account_id;
    }

    getUserId() {
        return this.user_id;
    }

    getIdentificationNumber() {
        return this.identification_number;
    }

    getPhoneAssociated() {
        return this.phone_associated;
    }

    getEmailAssociated() {
        return this.email_associated;
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

    update(data: Partial<Omit<SharedAccountPrimitives, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): SharedAccount {
        return new SharedAccount(
            this.id,
            data.name !== undefined ? data.name : this.name,
            data.account_id !== undefined ? data.account_id : this.account_id,
            this.user_id,
            data.identification_number !== undefined ? data.identification_number : this.identification_number,
            data.phone_associated !== undefined ? data.phone_associated : this.phone_associated,
            data.email_associated !== undefined ? data.email_associated : this.email_associated,
            this.created_at,
            new Date(),
            this.deleted_at,
        );
    }
}
