import { IsEnum, IsNotEmpty } from 'class-validator';
import { MemberRole } from '../../../domain/enums/member-role.enum';

/**
 * DTO para cambiar el rol de un miembro
 */
export class ChangeRoleDto {
    @IsEnum(MemberRole, { message: 'El rol debe ser admin, moderator o member' })
    @IsNotEmpty({ message: 'El rol es requerido' })
    role: MemberRole;
}
