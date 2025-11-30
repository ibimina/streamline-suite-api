import {
  IsDefined,
  IsNotEmpty,
  IsString,
  Matches,
} from "class-validator";

export class UploadFileDto {
  @IsDefined({ message: "file is required" })
  @IsNotEmpty({ message: "file must not be empty" })
  @IsString({ message: "file must be a base64 data URI string" })
  @Matches(/^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i, {
    message: "file must be a valid base64 data URI",
  })
  file: string;

  @IsDefined({ message: "imagePath is required" })
  @IsNotEmpty({ message: "imagePath must not be empty" })
  imagePath: String;

  @IsString({ message: "resourceType must be a string" })
  resourceType: string;

  @IsString({ message: "name must be a string" })
  name: string;

  @IsString({ message: "description must be a string" })
  description: string;
 }
