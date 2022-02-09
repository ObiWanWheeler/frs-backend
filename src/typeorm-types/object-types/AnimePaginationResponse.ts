import { Anime } from "../../entities/Anime";
import { ObjectType, Field } from "type-graphql";


@ObjectType()
export class AnimePaginationResponse {
	@Field(() => [Anime])
	animes: Anime[];

	@Field(() => Boolean)
	allFetched: boolean;
}
