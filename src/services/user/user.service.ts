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
import { AccountDocument } from "@/schemas/account.schema";
import { PaginationQuery } from "@/common/types";
import { EmailService } from "../email/email.service";

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel("Account") private accountModel: Model<AccountDocument>,
    private emailService: EmailService,
  ) {}

  async registerUser(
    createUserDto: CreateUserDto,
    creatorId: string,
    accountId: string,
  ) {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }
    //check if account exists
    const account = await this.accountModel.findById(accountId);
    if (!account) {
      throw new BadRequestException("Account does not exist");
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    // Create user
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      account: account._id,
      createdBy: creatorId,
      permissionMode: createUserDto.permissionMode || "inherit",
      permissions:
        createUserDto.permissionMode === "custom"
          ? createUserDto.permissions
          : [],
    });

    await user.save();

    await account.updateOne({ $push: { users: user._id } });

    // Send account created email (async, don't block)
    this.emailService
      .sendAccountCreatedEmail(
        user.email,
        user.firstName,
        account.name,
        user.role,
        createUserDto.password, // Send the original password before hashing
      )
      .catch((err) => {
        console.error("Failed to send account created email:", err);
      });
  }

  async updateUser(
    updateUserDto: UpdateUserDto,
    id: string,
    accountId: string,
  ) {
    const user = await this.userModel.findOne({ _id: id, account: accountId });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Update user fields
    user.role = updateUserDto.role;
    user.isActive = updateUserDto.isActive;
    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone;
    }

    // Update permission mode and custom permissions if provided
    if (updateUserDto.permissionMode !== undefined) {
      user.permissionMode = updateUserDto.permissionMode;
    }
    if (
      updateUserDto.permissionMode === "custom" &&
      updateUserDto.permissions
    ) {
      user.permissions = updateUserDto.permissions;
    } else if (updateUserDto.permissionMode === "inherit") {
      user.permissions = [];
    }

    await user.save();
  }

  async findAllUsers(accountId: string, query: PaginationQuery) {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    const account = await this.accountModel.findById(accountId).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Build filter
    const filter: any = {
      account: account._id,
    };

    // Add search filter
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query
    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select("-password -tokenVersion -lastGlobalLogout")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data: users,
      total,
    };
  }
}
