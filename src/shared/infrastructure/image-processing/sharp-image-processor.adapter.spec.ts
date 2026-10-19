import * as sharp from 'sharp';
import { SharpImageProcessorAdapter } from './sharp-image-processor.adapter';

describe('SharpImageProcessorAdapter', () => {
  const adapter = new SharpImageProcessorAdapter();

  const makeImage = (width: number, height: number) =>
    sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 200, g: 40, b: 40 },
      },
    })
      .png()
      .toBuffer();

  it('resizes down to the max width and outputs an optimized JPEG', async () => {
    const input = await makeImage(2000, 1000);

    const result = await adapter.resize(
      { buffer: input, originalname: 'foto.png' },
      512,
    );

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(256);
    expect(meta.format).toBe('jpeg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.fileName).toBe('foto_512.jpg');
  });

  it('never enlarges an image smaller than the target width', async () => {
    const input = await makeImage(100, 100);

    const result = await adapter.resize(
      { buffer: input, originalname: 'small.png' },
      512,
    );

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  });

  it('throws when the buffer is not a valid image', async () => {
    await expect(
      adapter.resize(
        { buffer: Buffer.from('not an image'), originalname: 'fake.jpg' },
        512,
      ),
    ).rejects.toThrow();
  });
});
