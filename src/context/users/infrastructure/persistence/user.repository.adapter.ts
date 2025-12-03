import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { User } from "../../domain/entities/user.entity";
import { UpdateUserProfileParams, UserRepository } from "../../domain/ports/out/user.repository";
import { PrismaService } from "src/prisma.service";
import { triggerAsyncId } from "async_hooks";

@Injectable()
export class UserRepositoryAdapter implements UserRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(user: User): Promise<User> {
        const { verification_type, ...createData } = user.toPrimitives()
        const userPrimitives = await this.prisma.user.upsert({
            where: {
                id: user.getId()
            },
            update: {
                name: user.getName(),
                username: user.getUsername(),
                password: user.getPassword(),
                avatar_url: user.getAvatarUrl(),
                banner_url: user.getBannerUrl()
            },
            create: createData
        })
        return User.fromPrimitives(userPrimitives)
    }

    async login({ email, password }: { email: string; password: string; }): Promise<User> {
        const user = await this.prisma.user.findFirst({
            where: {
                email
            }
        })

        if (!user) {
            throw new NotFoundException('Usuario no encontrado')
        }

        // ufp = User From Primitives 
        const ufp = User.fromPrimitives(user)

        const isPasswordValid = await ufp.comparePassword(password)
        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciales invalidas')
        }

        return ufp
    }

    async findByEmail(email: string): Promise<User> {
        const user = await this.prisma.user.findFirst({
            where: {
                email
            },
            select: {
                id: true,
                name: true,
                username: true,
                avatar_url: true,
                banner_url: true,
                created_at: true,
                email: true,
                verified: true,
                verification_type: {
                    select: {
                        id: true,
                        type: true,
                        icon_url: true
                    }
                }
            }
        })

        if (!user) {
            throw new NotFoundException('Usuario no encontrado.')
        }

        return User.fromPrimitives({ ...user, password: '' })
    }

    async findById(id: string): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: {
                id
            }
        })

        if (!user) {
            throw new NotFoundException('Usuario no encontrado')
        }

        return User.fromPrimitives(user)
    }

    async updateProfile(params: UpdateUserProfileParams): Promise<User> {
        const updateData: any = {};

        if (params.name !== undefined) updateData.name = params.name;
        if (params.username !== undefined) updateData.username = params.username;
        if (params.avatarUrl !== undefined) updateData.avatar_url = params.avatarUrl;
        if (params.bannerUrl !== undefined) updateData.banner_url = params.bannerUrl;

        const updatedUser = await this.prisma.user.update({
            where: {
                id: params.userId
            },
            select: {
                id: true,
                name: true,
                username: true,
                avatar_url: true,
                banner_url: true,
                created_at: true,
                email: true,
                verified: true,
                verification_type: {
                    select: {
                        id: true,
                        type: true,
                        icon_url: true
                    }
                }
            },
            data: updateData
        });

        return User.fromPrimitives({ ...updatedUser, password: '' });
    }

    async findByUsername(username: string, onlyUsername: boolean = false): Promise<User | string> {
        const select = onlyUsername ? {
            username: true
        } : {
            id: true,
            name: true,
            username: true,
            avatar_url: true,
            banner_url: true,
            created_at: true,
            email: true,
            verified: true,
            verification_type_id: true
        }

        const user = await this.prisma.user.findFirst({
            where: {
                username
            },
            select: select
        })

        if (!user) {
            return ''
        }

        if (onlyUsername) {
            return user.username
        }

        return User.fromPrimitives({ ...user, password: '' })
    }
}