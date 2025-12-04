import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { UpdateUserDto } from "@/models/dto/users/update-user.dto";
import { CreateUserDto } from "@/models/dto/users/user.dto";
import { User, UserDocument } from "@/schemas/user.schema";

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel("Account") private companyModel: Model<any>
  ) {}

  async registerUser(
    createUserDto: CreateUserDto,
    creatorId: string,
    companyId: string
  ) {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }
    //check if account exists
    const account = await this.companyModel.findById(companyId);
    if (!account) {
      throw new BadRequestException("Account does not exist");
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds
    );

    // Create user
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      companyId: companyId,
      createdBy: creatorId,
    });

    await user.save();

    await account.updateOne({ $push: { users: user._id } });
  }

  async updateUser(
    updateUserDto: UpdateUserDto,
    id: string,
    companyId: string
  ) {
    const user = await this.userModel.findOne({ _id: id, companyId });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Update user fields
    user.role = updateUserDto.role;
    user.isActive = updateUserDto.isActive;

    await user.save();
  }
}
