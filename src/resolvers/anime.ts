import { Arg, Query, Resolver } from "type-graphql";
import { Anime } from "../entities/Anime";

@Resolver(Anime)
export class AnimeResolver {
	@Query(() => Anime)
	async anime(@Arg("animeId") animeId: number): Promise<Anime | undefined> {
		return Anime.findOne({ where: { animeId }, relations: ["ratings"] });
	}
}
