import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

// Application layer (use cases)
import { LoginGarzonUseCase } from './application/login-garzon.service';
import { AuthGarzonService } from './application/auth-garzon.service';
import { DashboardGarzonService } from './application/dashboard-garzon.service';
import { DashboardCompleteService } from './application/dashboard-complete.service';
import { WalletGarzonService } from './application/wallet-garzon.service';

// Domain ports - Auth
import { AUTH_GARZON_USE_CASE } from './domain/ports/in/auth-garzon.usecase';
import { AUTH_GARZON_REPOSITORY } from './domain/ports/out/auth-garzon.repository';

// Domain ports - Dashboard
import { DASHBOARD_GARZON_USE_CASE } from './domain/ports/in/dashboard-garzon.usecase';
import { DASHBOARD_GARZON_REPOSITORY } from './domain/ports/out/dashboard-garzon.repository';

// Domain ports - Wallet
import { WALLET_GARZON_USE_CASE } from './domain/ports/in/wallet-garzon.usecase';
import { WALLET_GARZON_REPOSITORY } from './domain/ports/out/wallet-garzon.repository';

// Infrastructure adapters
import { LaravelAuthAdapter } from './infrastructure/adapters/persistence/auth-garzon.repository';
import { LaravelDashboardAdapter } from './infrastructure/adapters/persistence/dashboard-garzon.repository';
import { SuperGarzonWalletAdapter } from './infrastructure/adapters/persistence/wallet-garzon.repository';
import { AuthGarzonController } from './infrastructure/adapters/controllers/auth-garzon.controller';
import { DashboardGarzonController } from './infrastructure/adapters/controllers/dashboard-garzon.controller';
import { WalletGarzonController } from './infrastructure/adapters/controllers/wallet-garzon.controller';

/**
 * Garzon Context Module
 * 
 * This module handles authentication, dashboard data, and wallet information 
 * against the legacy Garzon system and SuperGarzon API.
 * 
 * It follows hexagonal architecture with:
 * - Input ports: AuthGarzonUseCase, DashboardGarzonUseCase, WalletGarzonUseCase (interfaces)
 * - Output ports: AuthGarzonRepository, DashboardGarzonRepository, WalletGarzonRepository (abstract classes)
 * - Application services: LoginGarzonUseCase, AuthGarzonService, DashboardGarzonService, DashboardCompleteService, WalletGarzonService
 * - Infrastructure adapters: LaravelAuthAdapter, LaravelDashboardAdapter, SuperGarzonWalletAdapter
 */
@Module({
    imports: [HttpModule],
    controllers: [AuthGarzonController, DashboardGarzonController, WalletGarzonController],
    providers: [
        // Infrastructure adapter for the auth repository port
        {
            provide: AUTH_GARZON_REPOSITORY,
            useClass: LaravelAuthAdapter,
        },
        // Infrastructure adapter for the dashboard repository port
        {
            provide: DASHBOARD_GARZON_REPOSITORY,
            useClass: LaravelDashboardAdapter,
        },
        // Infrastructure adapter for the wallet repository port
        {
            provide: WALLET_GARZON_REPOSITORY,
            useClass: SuperGarzonWalletAdapter,
        },
        // Application service implementing the auth use case port
        {
            provide: AUTH_GARZON_USE_CASE,
            useClass: LoginGarzonUseCase,
        },
        // Application service implementing the dashboard use case port
        {
            provide: DASHBOARD_GARZON_USE_CASE,
            useClass: DashboardGarzonService,
        },
        // Application service implementing the wallet use case port
        {
            provide: WALLET_GARZON_USE_CASE,
            useClass: WalletGarzonService,
        },
        // Additional services
        AuthGarzonService,
        LoginGarzonUseCase,
        DashboardGarzonService,
        DashboardCompleteService,
        WalletGarzonService,
    ],
    exports: [
        AUTH_GARZON_USE_CASE,
        AUTH_GARZON_REPOSITORY,
        DASHBOARD_GARZON_USE_CASE,
        DASHBOARD_GARZON_REPOSITORY,
        WALLET_GARZON_USE_CASE,
        WALLET_GARZON_REPOSITORY,
        LoginGarzonUseCase,
        AuthGarzonService,
        DashboardGarzonService,
        DashboardCompleteService,
        WalletGarzonService,
    ],
})
export class GarzonModule { }




