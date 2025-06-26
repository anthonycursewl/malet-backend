import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export interface UserPrimitives {
    id: string;
    name: string;
    username: string;
    email: string;
    created_at: Date;
    password: string;
}

export class User {
    private readonly id: string;
    private readonly name: string;
    private readonly username: string;
    private readonly email: string;
    private readonly created_at: Date;
    private readonly password: string;

    constructor(params: {
        id: string;
        name: string;
        username: string;
        email: string;
        created_at: Date;
        password: string;
    }) {
        this.id = params.id;
        this.name = params.name;
        this.username = params.username;
        this.email = params.email;
        this.created_at = params.created_at;
        this.password = params.password
    }

    static async create(user: Omit<UserPrimitives, 'id' | 'created_at'>): Promise<User> {
        const hashedPassword = await this.hashPassword(user.password);
    
        return new User({
            id: crypto.randomUUID().split('-')[4],
            name: user.name,
            username: user.username,
            email: user.email,
            created_at: new Date(),
            password: hashedPassword
        })
    }

    toPrimitives(): UserPrimitives {
        return {
            id: this.id,
            name: this.name,
            username: this.username,
            email: this.email,
            created_at: this.created_at,
            password: this.password
        };
    }

    static fromPrimitives(primitives: UserPrimitives): User {
        return new User(primitives);
    }
    
    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getUsername(): string {
        return this.username
    }

    getEmail(): string {
        return this.email
    }

    getCreatedAt(): Date {
        return this.created_at
    }

    getPassword(): string {
        return this.password;
    }

    async comparePassword(plainPassword: string): Promise<boolean> {
        if (!plainPassword || !this.password) {
            throw new Error('Both plainPassword and hashedPassword are required for comparison');
        }
        
        return bcrypt.compare(plainPassword, this.password);
    }

    // Método estático para hashear contraseñas
    private static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }
}

/**
 * User example
  
    {
        "name": "Anthony Cursewl",
        "username": "anthonycursewl",
        "email": "zerpaanthony.wx@breadriuss.com",
        "password": ""
    }

 * 
*/
