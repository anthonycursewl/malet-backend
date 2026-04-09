import { Injectable } from '@nestjs/common';
import { Snowflake } from 'nodejs-snowflake';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class SnowflakeService {
    private snowflake: Snowflake;

    constructor() {
        this.snowflake = new Snowflake({
            custom_epoch: 1744032000000,
            instance_id: Number(process.env.INSTANCE_ID),
        });
    }

    generate(): string {
        return this.snowflake.getUniqueID().toString();
    }

    generateFromDate(date: Date): string {
        return this.snowflake.idFromTimestamp(date.getTime()).toString();
    }
}