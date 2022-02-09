import { ObjectType, Field } from "type-graphql";
import { Anime } from "../../entities/Anime";


@ObjectType()
export class RecommendationFetchResponse {
	@Field(() => [String])
	errors: string[];

	@Field(() => [Anime])
	animes: Anime[];
}
