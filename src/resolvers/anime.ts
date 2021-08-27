import { Anime } from "../entities/Anime";
import { Arg, Query, Resolver } from "type-graphql";

@Resolver(Anime)
export class AnimeResolver {
    @Query(() => Anime)
    async anime(@Arg("anime_id") anime_id: number): Promise<Anime | undefined> {
        return Anime.findOne(anime_id)
    }
}