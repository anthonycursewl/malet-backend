import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { User } from "../../domain/entities/user.entity";
import { UserRepository } from "../../domain/ports/out/user.repository";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class UserRepositoryAdapter implements UserRepository {
    constructor(private readonly prisma: PrismaService) {}

    async save(user: User): Promise<User> {
        const userPrimitives = await this.prisma.user.upsert({
            where: {
                id: user.getId()
            },
            update: {
                name: user.getName(),
                username: user.getUsername(),
                password: user.getPassword()
            },
            create: user.toPrimitives()
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
            }
        })

        if (!user) {
            throw new NotFoundException('Usuario no encontrado')
        }

        return User.fromPrimitives(user)
    }
}