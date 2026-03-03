import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcrypt";
import { CreateStaffDto } from "@/models/dto/staff/create-staff.dto";
import { UpdateStaffDto } from "@/models/dto/staff/update-staff.dto";
import { User, UserDocument } from "@/schemas/user.schema";
import { PaginationQuery, PaginatedResponse } from "@/common/types";
import { RoleName } from "@/models/enums/shared.enum";
import { Staff, StaffDocument } from "@/schemas/staff.schema";
import { Account, AccountDocument } from "@/schemas/account.schema";

export interface StaffResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  position?: string;
  department?: string;
  employeeId?: string;
  salary: number;
  hireDate?: Date;
  isActive: boolean;
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Staff.name) private staffModel: Model<StaffDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,

  ) {}

  /**
   * Create a new staff member
   */
  async createStaff(
    createStaffDto: CreateStaffDto,
    creatorId: string,
    accountId: string,
  ): Promise<StaffResponse> {
    // Check if user with email already exists
    const existingStaff = await this.staffModel.findOne({
      email: createStaffDto.email,
    });

    if (existingStaff) {
      throw new ConflictException("A staff with this email already exists");
    }

    // Verify account exists
    const account = await this.accountModel.findById(accountId);
    if (!account) {
      throw new BadRequestException("Account does not exist");
    }

    const user =  await this.userModel.findById(creatorId);
    if (!user) {
      throw new NotFoundException("User creating staff member not found");
    }

    // Create staff user
    const staff = new this.staffModel({
      ...createStaffDto,
      account: account._id,
      createdBy: user._id,
      role: createStaffDto.role || RoleName.Staff,
      isActive: createStaffDto.isActive ?? true,
      salary: createStaffDto.salary || 0,
      hireDate: createStaffDto.hireDate
        ? new Date(createStaffDto.hireDate)
        : undefined,
    });

    await staff.save();

    return this.toStaffResponse(staff);
  }

  /**
   * Get all staff members for an account with pagination
   */
  async findAllStaff(
    accountId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<StaffResponse>> {
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
    const [staff, total] = await Promise.all([
      this.staffModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.staffModel.countDocuments(filter),
    ]);

    return {
      data: staff,
      total,
    };
  }

  /**
   * Get a single staff member by ID
   */
  async findStaffById(
    staffId: string,
    accountId: string,
  ): Promise<StaffResponse> {
    const staff = await this.staffModel
      .findOne({
        _id: new Types.ObjectId(staffId),
        account: new Types.ObjectId(accountId),
      })
      .lean();

    if (!staff) {
      throw new NotFoundException("Staff member not found");
    }

    return this.toStaffResponse(staff);
  }

  /**
   * Update a staff member
   */
  async updateStaff(
    staffId: string,
    updateStaffDto: UpdateStaffDto,
    accountId: string,
    updaterId: string,
  ): Promise<StaffResponse> {
    const staff = await this.staffModel.findOne({
      _id: new Types.ObjectId(staffId),
      account: new Types.ObjectId(accountId),
    });

    if (!staff) {
      throw new NotFoundException("Staff member not found");
    }
console.log(updateStaffDto, "updateStaffDto")
    // Update fields
    const updateData: any = {
      ...updateStaffDto,
      updatedBy: new Types.ObjectId(updaterId),
    };
   
    // Handle date conversion
    if (updateStaffDto.hireDate) {
      updateData.hireDate = new Date(updateStaffDto.hireDate);
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
console.log(updateData)
    const updatedStaff = await this.staffModel
      .findByIdAndUpdate(staffId, updateData, { new: true })
      .lean();

    return this.toStaffResponse(updatedStaff);
  }

  /**
   * Delete a staff member (soft delete by setting isActive to false)
   */
  async deleteStaff(
    staffId: string,
    accountId: string,
  ): Promise<{ message: string }> {
    const staff = await this.staffModel.findOne({
      _id: new Types.ObjectId(staffId),
      account: new Types.ObjectId(accountId),
    });

    if (!staff) {
      throw new NotFoundException("Staff member not found");
    }

    // Soft delete - set isActive to false
    await this.userModel.findByIdAndUpdate(staffId, {
      isActive: false,
    });

    return { message: "Staff member deleted successfully" };
  }

  /**
   * Permanently delete a staff member
   */
  async hardDeleteStaff(
    staffId: string,
    accountId: string,
  ): Promise<{ message: string }> {
    const staff = await this.staffModel.findOne({
      _id: new Types.ObjectId(staffId),
      account: new Types.ObjectId(accountId),
    });

    if (!staff) {
      throw new NotFoundException("Staff member not found");
    }

    // Hard delete
    await this.staffModel.findByIdAndDelete(staffId);

    return { message: "Staff member permanently deleted" };
  }

  /**
   * Toggle staff active status
   */
  async toggleStaffStatus(
    staffId: string,
    accountId: string,
  ): Promise<StaffResponse> {
    const staff = await this.staffModel.findOne({
      _id: new Types.ObjectId(staffId),
      account: new Types.ObjectId(accountId),
    });

    if (!staff) {
      throw new NotFoundException("Staff member not found");
    }

    const updatedStaff = await this.staffModel
      .findByIdAndUpdate(
        staffId,
        {
          isActive: !staff.isActive,
        },
        { new: true },
      )
      .lean();

    return this.toStaffResponse(updatedStaff);
  }

  /**
   * Get staff by department
   */
  async findStaffByDepartment(
    accountId: string,
    department: string,
  ): Promise<StaffResponse[]> {
    const staff = await this.staffModel
      .find({
        account: new Types.ObjectId(accountId),
        department: { $regex: department, $options: "i" },
        isActive: true,
      })
      .lean();

    return staff.map((s) => this.toStaffResponse(s));
  }

  /**
   * Get staff by role
   */
  async findStaffByRole(
    accountId: string,
    role: RoleName,
  ): Promise<StaffResponse[]> {
    const staff = await this.staffModel
      .find({
        account: new Types.ObjectId(accountId),
        role,
        isActive: true,
      })
      .lean();

    return staff.map((s) => this.toStaffResponse(s));
  }

  /**
   * Convert user document to staff response
   */
  private toStaffResponse(staff: any): StaffResponse {
    return {
      _id: staff._id.toString(),
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      position: staff.position,
      department: staff.department,
      employeeId: staff.employeeId,
      salary: staff.salary || 0,
      hireDate: staff.hireDate,
      isActive: staff.isActive,
      permissions: staff.permissions,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    };
  }
}
