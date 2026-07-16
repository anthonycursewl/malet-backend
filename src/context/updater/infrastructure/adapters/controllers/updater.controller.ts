import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Header,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';
import { ApiKeyGuard } from '../../../../../auth/guards/api-key.guard';
import { UpdaterService } from '../../../application/updater.service';

@Controller()
export class UpdaterController {
  constructor(private readonly updaterService: UpdaterService) {}

  @Get('updates/updater.json')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'no-cache')
  getUpdater() {
    return this.updaterService.getManifest();
  }

  @Get('releases/:filename')
  @HttpCode(HttpStatus.OK)
  async downloadRelease(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = this.updaterService.getReleasePath(filename);
    if (!filePath) {
      throw new NotFoundException('Release file not found');
    }

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Put('releases/upload')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: path.resolve(process.env.RELEASES_DIR || 'storage/releases'),
        filename: (_req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadRelease(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return {
      message: 'Release uploaded successfully',
      filename: file.originalname,
      size: file.size,
    };
  }

  @Post('updates/publish')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async publishUpdate(
    @Body()
    body: {
      version: string;
      notes: string;
      platform: string;
      signature: string;
      installer_filename: string;
    },
  ) {
    return this.updaterService.publishUpdate(
      body.version,
      body.notes,
      body.platform,
      body.signature,
      body.installer_filename,
    );
  }
}
