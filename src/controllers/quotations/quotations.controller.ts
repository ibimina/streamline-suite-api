import { CreateInvoiceDto } from "@/models/dto/invoices/create-invoice.dto";
import { CreateQuotationDto } from "@/models/dto/quotations/create-quotation.dto";
import { QuotationsService } from "@/services/quotation/quotations.service";
import { Body, Controller, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ObjectId } from "mongoose";

@ApiTags("quotations")
@Controller("quotations")
export class QuotationsController {
    constructor(private readonly quotationsService: QuotationsService) { }
    
    //create quotation
      @Post()
      @ApiOperation({ summary: "Create a new quotation" })
      async create(
        @Body() createQuotationDto: CreateQuotationDto,
        @Req() req: Request & { user: { id: string; companyId: ObjectId } }
      ) {
        try {
          const user = req.user;
          await this.quotationsService.create(
            createQuotationDto,
            user.companyId,
            user.id
          );
          return {
            message: "Quotation created successfully",
            status: HttpStatus.CREATED,
          };
        } catch (error) {
          console.error(
            `Error occured in Quotations Controller in - create`,
            JSON.stringify(error)
          );
          throw error;
        }
      }
    //get quotation by id
    //update quotation
    //delete quotation
}