import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    'windows-x86_64'?: {
      signature: string;
      url: string;
    };
    'darwin-x86_64'?: {
      signature: string;
      url: string;
    };
    'darwin-aarch64'?: {
      signature: string;
      url: string;
    };
    'linux-x86_64'?: {
      signature: string;
      url: string;
    };
  };
}

@Injectable()
export class UpdaterService {
  private readonly logger = new Logger(UpdaterService.name);
  private readonly updatesDir: string;
  private readonly releasesDir: string;
  private readonly manifestPath: string;

  constructor() {
    this.updatesDir = path.resolve(process.env.UPDATES_DIR || 'storage/updates');
    this.releasesDir = path.resolve(process.env.RELEASES_DIR || 'storage/releases');
    this.manifestPath = path.join(this.updatesDir, 'updater.json');
  }

  getManifest(): UpdateManifest {
    try {
      const raw = fs.readFileSync(this.manifestPath, 'utf-8');
      return JSON.parse(raw) as UpdateManifest;
    } catch (error: any) {
      this.logger.error(`Failed to read updater manifest: ${error.message}`);
      return {
        version: '0.1.0',
        notes: '',
        pub_date: new Date().toISOString(),
        platforms: {
          'windows-x86_64': { signature: '', url: '' },
        },
      };
    }
  }

  getReleasePath(filename: string): string | null {
    const filePath = path.join(this.releasesDir, filename);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
    return null;
  }

  async publishUpdate(
    version: string,
    notes: string,
    platform: string,
    signature: string,
    installerFilename: string,
  ): Promise<UpdateManifest> {
    if (!version) {
      throw new BadRequestException('version is required');
    }
    if (!platform) {
      throw new BadRequestException('platform is required');
    }
    if (!signature) {
      throw new BadRequestException('signature is required');
    }
    if (!installerFilename) {
      throw new BadRequestException('installer_filename is required');
    }

    const manifest = this.getManifest();

    manifest.version = version;
    manifest.notes = notes || '';
    manifest.pub_date = new Date().toISOString();

    const installerUrl = `https://apimalet.breadriuss.com/releases/${installerFilename}`;

    const platformKey = platform as keyof UpdateManifest['platforms'];
    manifest.platforms[platformKey] = {
      signature,
      url: installerUrl,
    };

    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    this.logger.log(`Update published: ${version} for ${platform}`);

    return manifest;
  }
}
