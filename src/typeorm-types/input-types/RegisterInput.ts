import { InputType, Field } from "type-graphql";
import { UsernamePasswordInput } from "./UsernamePasswordInput";

@InputType()
export class RegisterInput extends UsernamePasswordInput {
	@Field()
	email!: string;
	@Field()
	password!: string;
	@Field()
	username!: string;
}
