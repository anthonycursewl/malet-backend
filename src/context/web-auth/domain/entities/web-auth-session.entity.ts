
export class WebAuthSession {
    constructor(
        private readonly id: string,
        private readonly sessionToken: string,
        private readonly qrCode: string,
        private status: string,
        private userId: string | null,
        private readonly ipAddress: string | null,
        private readonly userAgent: string | null,
        private readonly location: string | null,
        private readonly expiresAt: Date,
        private readonly createdAt: Date,
        private authorizedAt: Date | null,
    ) { }

    static create(id: string, sessionToken: string, qrCode: string, ip: string | null, userAgent: string | null, location: string | null): WebAuthSession {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes session

        return new WebAuthSession(
            id,
            sessionToken,
            qrCode,
            'pending',
            null,
            ip,
            userAgent,
            location,
            expiresAt,
            new Date(),
            null
        );
    }

    authorize(userId: string): void {
        if (this.isExpired()) {
            throw new Error('Session expired');
        }
        this.status = 'authorized';
        this.userId = userId;
        this.authorizedAt = new Date();
    }

    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    isAuthorized(): boolean {
        return this.status === 'authorized' || this.status === 'consumed';
    }

    consume(): void {
        this.status = 'consumed';
    }

    // Getters
    getId() { return this.id; }
    getSessionToken() { return this.sessionToken; }
    getQrCode() { return this.qrCode; }
    getStatus() { return this.status; }
    getUserId() { return this.userId; }
    getIpAddress() { return this.ipAddress; }
    getUserAgent() { return this.userAgent; }
    getLocation() { return this.location; }
    getExpiresAt() { return this.expiresAt; }
    getCreatedAt() { return this.createdAt; }
    getAuthorizedAt() { return this.authorizedAt; }
}
