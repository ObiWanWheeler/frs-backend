import { ObjectType, Field } from "type-graphql";


@ObjectType()
export class BoolWithMessageResponse {
	@Field(() => Boolean)
	success: boolean;

	@Field(() => String)
	message: string;
}
