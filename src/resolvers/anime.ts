import { ImageSize } from "../typeorm-types/enums";
import { Arg, FieldResolver, Query, Resolver, Root } from "type-graphql";
import { Anime } from "../entities/Anime";
import { Rating } from "../entities/Ratings";
import { getConnection } from "typeorm";

@Resolver(Anime)
export class AnimeResolver {
	@FieldResolver(() => String)
	titleImage(@Root() root: Anime, @Arg("size", () => ImageSize) size: ImageSize) {
		if (!root.titleImage) {
			return "no title image of this size available."
		}
		else {
			return root.titleImage[size];
		}
	}

	@FieldResolver(() => [Rating])
	async ratings(@Root() root: Anime) {
		return (await getConnection().query(`SELECT * FROM rating WHERE "animeId" = ${root.animeId}`)) as Rating[]
	}

	@Query(() => Anime)
	async anime(@Arg("animeId") animeId: number): Promise<Anime | undefined> {
		return (await getConnection().query(`SELECT * FROM anime WHERE "animeId" = ${animeId}`))[0] as Anime
	}
}
