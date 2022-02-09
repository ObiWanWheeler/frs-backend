import { ObjectType, Field } from "type-graphql";
import { FieldError } from "./FieldError";


@ObjectType()
export class UserFieldError extends FieldError {
	@Field(() => String, { nullable: true })
	field?: "username" | "password" | "email";

}
