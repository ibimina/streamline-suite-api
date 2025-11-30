import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("quotations")
@Controller("quotations")
export class QuotationsController {
}