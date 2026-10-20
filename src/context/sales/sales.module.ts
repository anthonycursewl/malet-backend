import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { FileStorageModule } from 'src/shared/infrastructure/file-storage/file-storage.module';
import { ImageProcessingModule } from 'src/shared/infrastructure/image-processing/image-processing.module';

import { StoresController } from './infrastructure/adapters/controllers/stores.controller';
import { StoreMembersController } from './infrastructure/adapters/controllers/store-members.controller';
import { ProductsController } from './infrastructure/adapters/controllers/products.controller';
import { PaymentMethodsController } from './infrastructure/adapters/controllers/payment-methods.controller';
import { SalesController } from './infrastructure/adapters/controllers/sales.controller';
import { InvoicesController } from './infrastructure/adapters/controllers/invoices.controller';
import { StoreInviteCodesController } from './infrastructure/adapters/controllers/store-invite-codes.controller';
import { StoreInvitesController } from './infrastructure/adapters/controllers/store-invites.controller';
import { ReceiptsController } from './infrastructure/adapters/controllers/receipts.controller';
import { PublicReceiptsController } from './infrastructure/adapters/controllers/public-receipts.controller';
import { CustomersController } from './infrastructure/adapters/controllers/customers.controller';
import { StoreNotificationsController } from './infrastructure/adapters/controllers/store-notifications.controller';

import { STORE_REPOSITORY_PORT } from './domain/ports/out/store.repository';
import { PRODUCT_REPOSITORY_PORT } from './domain/ports/out/product.repository';
import { PAYMENT_METHOD_REPOSITORY_PORT } from './domain/ports/out/payment-method.repository';
import { SALE_REPOSITORY_PORT } from './domain/ports/out/sale.repository';
import { INVOICE_REPOSITORY_PORT } from './domain/ports/out/invoice.repository';
import { STORE_INVITE_REPOSITORY_PORT } from './domain/ports/out/store-invite.repository';
import { RECEIPT_REPOSITORY_PORT } from './domain/ports/out/receipt.repository';
import { CUSTOMER_REPOSITORY_PORT } from './domain/ports/out/customer.repository';
import { NOTIFICATION_LOG_REPOSITORY_PORT } from './domain/ports/out/notification-log.repository';

import { STORES_USECASE } from './domain/ports/in/stores.usecase';
import { STORE_MEMBERS_USECASE } from './domain/ports/in/store-members.usecase';
import { PRODUCTS_USECASE } from './domain/ports/in/products.usecase';
import { PAYMENT_METHODS_USECASE } from './domain/ports/in/payment-methods.usecase';
import { SALES_USECASE } from './domain/ports/in/sales.usecase';
import { INVOICES_USECASE } from './domain/ports/in/invoices.usecase';
import { SALES_REPORTS_USECASE } from './domain/ports/in/sales-reports.usecase';
import { STORE_INVITES_USECASE } from './domain/ports/in/store-invites.usecase';
import { RECEIPTS_USECASE } from './domain/ports/in/receipts.usecase';
import { CUSTOMERS_USECASE } from './domain/ports/in/customers.usecase';
import { STORE_NOTIFICATIONS_USECASE } from './domain/ports/in/store-notifications.usecase';

import { StoreRepositoryAdapter } from './infrastructure/persistence/store.repository.adapter';
import { ProductRepositoryAdapter } from './infrastructure/persistence/product.repository.adapter';
import { PaymentMethodRepositoryAdapter } from './infrastructure/persistence/payment-method.repository.adapter';
import { SaleRepositoryAdapter } from './infrastructure/persistence/sale.repository.adapter';
import { InvoiceRepositoryAdapter } from './infrastructure/persistence/invoice.repository.adapter';
import { StoreInviteRepositoryAdapter } from './infrastructure/persistence/store-invite.repository.adapter';
import { ReceiptRepositoryAdapter } from './infrastructure/persistence/receipt.repository.adapter';
import { CustomerRepositoryAdapter } from './infrastructure/persistence/customer.repository.adapter';
import { NotificationLogRepositoryAdapter } from './infrastructure/persistence/notification-log.repository.adapter';

import { StoresService } from './application/stores.service';
import { StoreMembersService } from './application/store-members.service';
import { ProductsService } from './application/products.service';
import { PaymentMethodsService } from './application/payment-methods.service';
import { SalesService } from './application/sales.service';
import { InvoicesService } from './application/invoices.service';
import { SalesReportsService } from './application/sales-reports.service';
import { StoreInvitesService } from './application/store-invites.service';
import { ReceiptsService } from './application/receipts.service';
import { CustomersService } from './application/customers.service';
import { StoreNotificationsService } from './application/store-notifications.service';
import { StoreNotificationsScheduler } from './application/store-notifications.scheduler';

@Module({
  imports: [PrismaModule, FileStorageModule, ImageProcessingModule],
  controllers: [
    StoresController,
    StoreMembersController,
    ProductsController,
    PaymentMethodsController,
    SalesController,
    InvoicesController,
    StoreInviteCodesController,
    StoreInvitesController,
    ReceiptsController,
    CustomersController,
    StoreNotificationsController,
    PublicReceiptsController,
  ],
  providers: [
    {
      provide: STORE_REPOSITORY_PORT,
      useClass: StoreRepositoryAdapter,
    },
    {
      provide: PRODUCT_REPOSITORY_PORT,
      useClass: ProductRepositoryAdapter,
    },
    {
      provide: PAYMENT_METHOD_REPOSITORY_PORT,
      useClass: PaymentMethodRepositoryAdapter,
    },
    {
      provide: SALE_REPOSITORY_PORT,
      useClass: SaleRepositoryAdapter,
    },
    {
      provide: INVOICE_REPOSITORY_PORT,
      useClass: InvoiceRepositoryAdapter,
    },
    {
      provide: STORE_INVITE_REPOSITORY_PORT,
      useClass: StoreInviteRepositoryAdapter,
    },
    {
      provide: RECEIPT_REPOSITORY_PORT,
      useClass: ReceiptRepositoryAdapter,
    },
    {
      provide: CUSTOMER_REPOSITORY_PORT,
      useClass: CustomerRepositoryAdapter,
    },
    {
      provide: NOTIFICATION_LOG_REPOSITORY_PORT,
      useClass: NotificationLogRepositoryAdapter,
    },
    { provide: STORES_USECASE, useClass: StoresService },
    { provide: STORE_MEMBERS_USECASE, useClass: StoreMembersService },
    { provide: PRODUCTS_USECASE, useClass: ProductsService },
    { provide: PAYMENT_METHODS_USECASE, useClass: PaymentMethodsService },
    { provide: SALES_USECASE, useClass: SalesService },
    { provide: INVOICES_USECASE, useClass: InvoicesService },
    { provide: SALES_REPORTS_USECASE, useClass: SalesReportsService },
    { provide: STORE_INVITES_USECASE, useClass: StoreInvitesService },
    { provide: RECEIPTS_USECASE, useClass: ReceiptsService },
    { provide: CUSTOMERS_USECASE, useClass: CustomersService },
    {
      provide: STORE_NOTIFICATIONS_USECASE,
      useClass: StoreNotificationsService,
    },
    // Tareas programadas: resumen diario y reintentos de avisos.
    StoreNotificationsScheduler,
    // SalesService lo inyecta por tipo para construir el snapshot del recibo.
    ReceiptsService,
  ],
  exports: [STORES_USECASE],
})
export class SalesModule {}
