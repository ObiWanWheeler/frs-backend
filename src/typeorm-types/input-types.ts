import { InputType, Field } from "type-graphql";


@InputType()
export class UsernamePasswordInput {
	@Field()
	username!: string;

	@Field()
	password!: string;
}

@InputType()
export class RegisterInput extends UsernamePasswordInput {
	@Field()
	email!: string;
}