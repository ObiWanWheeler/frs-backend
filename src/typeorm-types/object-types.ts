import { User } from "../entities/User";
import { ObjectType, Field } from "type-graphql";
import { Anime } from "../entities/Anime";

@ObjectType()
export class FieldError {
	@Field()
	message: string;
}

@ObjectType()
export class UserFieldError extends FieldError {
	@Field(() => String, { nullable: true })
	field?: "username" | "password" | "email";

}

@ObjectType()
export class UserResponse {
	@Field(() => [UserFieldError], { nullable: true })
	errors?: UserFieldError[];

	@Field(() => User, { nullable: true })
	user?: User;
}

@ObjectType()
export class BoolWithMessageResponse {
	@Field(() => Boolean)
	success: boolean;

	@Field(() => String)
	message: string;
}

@ObjectType()
export class AnimePaginationResponse {
	@Field(() => [Anime])
	animes: Anime[]

	@Field(() => Boolean)
	allFetched: boolean
}
