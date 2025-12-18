export class AuthCredentials {
    username!: string;
    password!: string;
}

export class AuthSession {
    cookies!: string;
    xsrfToken!: string;
    user?: any;
}