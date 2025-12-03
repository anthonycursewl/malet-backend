import { Test, TestingModule } from '@nestjs/testing';
import { UpdateUserProfileService } from './update-user-profile.service';
import { UserRepository, USER_REPOSITORY_PORT } from '../domain/ports/out/user.repository';
import { FileStoragePort, FILE_STORAGE_PORT } from 'src/shared/infrastructure/file-storage/file-storage.port';
import { User } from '../domain/entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UpdateUserProfileService', () => {
    let service: UpdateUserProfileService;
    let userRepository: jest.Mocked<UserRepository>;
    let fileStorage: jest.Mocked<FileStoragePort>;

    const mockUser = User.fromPrimitives({
        id: 'test-id',
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        created_at: new Date(),
        avatar_url: 'https://old-avatar.com/avatar.jpg',
        banner_url: 'https://old-banner.com/banner.jpg'
    });

    beforeEach(async () => {
        const mockUserRepository: Partial<UserRepository> = {
            findById: jest.fn(),
            updateProfile: jest.fn(),
        };

        const mockFileStorage: Partial<FileStoragePort> = {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateUserProfileService,
                {
                    provide: USER_REPOSITORY_PORT,
                    useValue: mockUserRepository,
                },
                {
                    provide: FILE_STORAGE_PORT,
                    useValue: mockFileStorage,
                },
            ],
        }).compile();

        service = module.get<UpdateUserProfileService>(UpdateUserProfileService);
        userRepository = module.get(USER_REPOSITORY_PORT);
        fileStorage = module.get(FILE_STORAGE_PORT);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('execute', () => {
        it('should throw NotFoundException if user does not exist', async () => {
            userRepository.findById.mockResolvedValue(null);

            await expect(
                service.execute({
                    userId: 'non-existent-id',
                    name: 'New Name',
                })
            ).rejects.toThrow(NotFoundException);
        });

        it('should update user profile with new name and username', async () => {
            const updatedUser = User.fromPrimitives({
                ...mockUser.toPrimitives(),
                name: 'New Name',
                username: 'newusername',
            });

            userRepository.findById.mockResolvedValue(mockUser);
            userRepository.updateProfile.mockResolvedValue(updatedUser);

            const result = await service.execute({
                userId: 'test-id',
                name: 'New Name',
                username: 'newusername',
            });

            expect(userRepository.findById).toHaveBeenCalledWith('test-id');
            expect(userRepository.updateProfile).toHaveBeenCalledWith({
                userId: 'test-id',
                name: 'New Name',
                username: 'newusername',
                avatarUrl: mockUser.getAvatarUrl(),
                bannerUrl: mockUser.getBannerUrl(),
            });
            expect(result.getName()).toBe('New Name');
            expect(result.getUsername()).toBe('newusername');
        });

        it('should upload new avatar and delete old one', async () => {
            const newAvatarUrl = 'https://new-avatar.com/avatar.jpg';
            const avatarFile = {
                buffer: Buffer.from('fake-image-data'),
                fileName: 'avatar.jpg',
                mimeType: 'image/jpeg',
            };

            const updatedUser = User.fromPrimitives({
                ...mockUser.toPrimitives(),
                avatar_url: newAvatarUrl,
            });

            userRepository.findById.mockResolvedValue(mockUser);
            fileStorage.uploadFile.mockResolvedValue(newAvatarUrl);
            fileStorage.deleteFile.mockResolvedValue(undefined);
            userRepository.updateProfile.mockResolvedValue(updatedUser);

            const result = await service.execute({
                userId: 'test-id',
                avatarFile,
            });

            expect(fileStorage.deleteFile).toHaveBeenCalledWith(mockUser.getAvatarUrl());
            expect(fileStorage.uploadFile).toHaveBeenCalledWith({
                file: avatarFile.buffer,
                fileName: avatarFile.fileName,
                mimeType: avatarFile.mimeType,
                folder: 'avatars',
            });
            expect(result.getAvatarUrl()).toBe(newAvatarUrl);
        });

        it('should upload new banner and delete old one', async () => {
            const newBannerUrl = 'https://new-banner.com/banner.jpg';
            const bannerFile = {
                buffer: Buffer.from('fake-image-data'),
                fileName: 'banner.jpg',
                mimeType: 'image/jpeg',
            };

            const updatedUser = User.fromPrimitives({
                ...mockUser.toPrimitives(),
                banner_url: newBannerUrl,
            });

            userRepository.findById.mockResolvedValue(mockUser);
            fileStorage.uploadFile.mockResolvedValue(newBannerUrl);
            fileStorage.deleteFile.mockResolvedValue(undefined);
            userRepository.updateProfile.mockResolvedValue(updatedUser);

            const result = await service.execute({
                userId: 'test-id',
                bannerFile,
            });

            expect(fileStorage.deleteFile).toHaveBeenCalledWith(mockUser.getBannerUrl());
            expect(fileStorage.uploadFile).toHaveBeenCalledWith({
                file: bannerFile.buffer,
                fileName: bannerFile.fileName,
                mimeType: bannerFile.mimeType,
                folder: 'banners',
            });
            expect(result.getBannerUrl()).toBe(newBannerUrl);
        });

        it('should update profile with both avatar and banner', async () => {
            const newAvatarUrl = 'https://new-avatar.com/avatar.jpg';
            const newBannerUrl = 'https://new-banner.com/banner.jpg';

            const avatarFile = {
                buffer: Buffer.from('fake-avatar-data'),
                fileName: 'avatar.jpg',
                mimeType: 'image/jpeg',
            };

            const bannerFile = {
                buffer: Buffer.from('fake-banner-data'),
                fileName: 'banner.jpg',
                mimeType: 'image/jpeg',
            };

            const updatedUser = User.fromPrimitives({
                ...mockUser.toPrimitives(),
                name: 'Updated Name',
                avatar_url: newAvatarUrl,
                banner_url: newBannerUrl,
            });

            userRepository.findById.mockResolvedValue(mockUser);
            fileStorage.uploadFile
                .mockResolvedValueOnce(newAvatarUrl)
                .mockResolvedValueOnce(newBannerUrl);
            fileStorage.deleteFile.mockResolvedValue(undefined);
            userRepository.updateProfile.mockResolvedValue(updatedUser);

            const result = await service.execute({
                userId: 'test-id',
                name: 'Updated Name',
                avatarFile,
                bannerFile,
            });

            expect(fileStorage.deleteFile).toHaveBeenCalledTimes(2);
            expect(fileStorage.uploadFile).toHaveBeenCalledTimes(2);
            expect(result.getName()).toBe('Updated Name');
            expect(result.getAvatarUrl()).toBe(newAvatarUrl);
            expect(result.getBannerUrl()).toBe(newBannerUrl);
        });

        it('should not delete files if user has no previous avatar/banner', async () => {
            const userWithoutImages = User.fromPrimitives({
                ...mockUser.toPrimitives(),
                avatar_url: undefined,
                banner_url: undefined,
            });

            const newAvatarUrl = 'https://new-avatar.com/avatar.jpg';
            const avatarFile = {
                buffer: Buffer.from('fake-image-data'),
                fileName: 'avatar.jpg',
                mimeType: 'image/jpeg',
            };

            const updatedUser = User.fromPrimitives({
                ...userWithoutImages.toPrimitives(),
                avatar_url: newAvatarUrl,
            });

            userRepository.findById.mockResolvedValue(userWithoutImages);
            fileStorage.uploadFile.mockResolvedValue(newAvatarUrl);
            userRepository.updateProfile.mockResolvedValue(updatedUser);

            await service.execute({
                userId: 'test-id',
                avatarFile,
            });

            expect(fileStorage.deleteFile).not.toHaveBeenCalled();
            expect(fileStorage.uploadFile).toHaveBeenCalledTimes(1);
        });
    });
});
