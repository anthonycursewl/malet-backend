import {
  Controller,
  Inject,
  UseInterceptors,
  UploadedFiles,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  UpdateUserProfileDto,
  UpdateUserProfileUseCase,
  UPDATE_USER_PROFILE_USECASE,
} from 'src/context/users/domain/ports/in/update-user-profile.usecase';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { GetUserByUsernameService } from 'src/context/users/application/get-user-by-username.service';
import { GET_USER_BY_USERNAME_USECASE } from 'src/context/users/domain/ports/in/get-user-by-username.usecase';

@Controller('users/profile')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(
    @Inject(UPDATE_USER_PROFILE_USECASE)
    private readonly updateUserProfileService: UpdateUserProfileUseCase,
    @Inject(GET_USER_BY_USERNAME_USECASE)
    private readonly getUserByUsernameService: GetUserByUsernameService,
  ) {}

  @Patch('update')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'banner', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
        fileFilter: (req, file, callback) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
            return callback(
              new BadRequestException(
                'Solo se permiten archivos de imagen (jpg, jpeg, png, gif, webp)',
              ),
              false,
            );
          }
          callback(null, true);
        },
      },
    ),
  )
  async updateProfile(
    @Req() req: any,
    @Body() body: UpdateProfileDto,
    @UploadedFiles()
    files: { avatar?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const userId = req.user.userId;

    console.log(userId);
    console.log(files);
    console.log(body);

    const dto: UpdateUserProfileDto = {
      userId,
      name: body.name,
      username: body.username,
    };

    if (files?.avatar && files.avatar[0]) {
      dto.avatarFile = {
        buffer: files.avatar[0].buffer,
        fileName: files.avatar[0].originalname,
        mimeType: files.avatar[0].mimetype,
      };
    }

    if (files?.banner && files.banner[0]) {
      dto.bannerFile = {
        buffer: files.banner[0].buffer,
        fileName: files.banner[0].originalname,
        mimeType: files.banner[0].mimetype,
      };
    }

    const updatedUser = await this.updateUserProfileService.execute(dto);

    const { password: _password, ...userWithoutPassword } =
      updatedUser.toPrimitives();
    return userWithoutPassword;
  }

  @Get('verified/username/:username')
  async getProfile(@Req() req: any, @Param('username') username: string) {
    const result = await this.getUserByUsernameService.execute(username);
    const usernameUsed = result.toString();
    if (usernameUsed === username) {
      return true;
    }
    return false;
  }
}
