import { Body, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@/common/types";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Controller, UseGuards } from "@nestjs/common";
import { CloudinaryService } from "@/services/cloudinary/cloudinary.service";
import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";

@ApiTags("upload")
@Controller("upload")
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}
  @Post("file")
  @ApiOperation({ summary: "Create a new file upload" })
  async uploadFile(@Body() uploadFileDto: UploadFileDto) {
    await this.cloudinaryService.uploadImage(uploadFileDto);
    return { message: "File uploaded successfully" };
  }
}
