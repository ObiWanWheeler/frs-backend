import { ImageSize } from "../typeorm-types/enums";
import { Arg, FieldResolver, Query, Resolver, Root } from "type-graphql";
import { Anime } from "../entities/Anime";
import { Rating } from "../entities/Ratings";
import { getConnection } from "typeorm";

@Resolver(Anime)
export class AnimeResolver {
	@FieldResolver(() => String)
	titleImage(@Root() root: Anime, @Arg("size", () => ImageSize) size: ImageSize) {
		console.log(root)
		if (!root.titleImage) {
			return "no title image of this size available."
		}
		else {
			return root.titleImage[size];
		}
	}

	// docs recommend to use a field resolver to get relations rather than use a join
	@FieldResolver(() => [Rating])
	async ratings(@Root() root: Anime) {
		return (await getConnection().query(`SELECT * FROM rating WHERE "animeId" = ${root.animeId}`)) as Rating[]
	}

	@Query(() => Anime)
	async anime(@Arg("animeId") animeId: number): Promise<Anime | undefined> {
		console.log("HERE")
		const c = (await getConnection().query(`SELECT * FROM anime WHERE "animeId" = ${animeId}`))[0] as Anime
		console.log(c)
		return c
	}
}
