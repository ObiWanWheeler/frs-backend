import { ImageSize } from "../typeorm-types/enums";
import { Arg, FieldResolver, Query, Resolver, Root } from "type-graphql";
import { Anime } from "../entities/Anime";
import { Rating } from "../entities/Ratings";

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
	ratings(@Root() root: Anime) {
		return Rating.find({ where: { animeId: root.animeId }})
	}

	@Query(() => Anime)
	async anime(@Arg("animeId") animeId: number): Promise<Anime | undefined> {
		return Anime.findOne({ where: { animeId }});
	}
}
