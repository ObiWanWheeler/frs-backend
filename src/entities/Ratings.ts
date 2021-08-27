import { Field, Int, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { Anime } from "./Anime";

@ObjectType()
@Entity({name: "rating"}) 
export class Rating extends BaseEntity {
	@Field(() => Int)
	@Column({name: "rating"})
	rating: number;

	@Field(() => Int)
	@PrimaryColumn({name: "user_id"})
	userId!: number;

	@Field(() => Int)
	@PrimaryColumn({name: "anime_id"})
	animeId!: number;

	@Field(() => User)
	@ManyToOne(() => User,(user) => user.ratings)
    @JoinColumn({ name: "user_id" })
	user: User;
    
	@Field(() => Anime)
	@ManyToOne(() => Anime, (anime) => anime.ratings, {onDelete: "CASCADE"})
    @JoinColumn( {name: "anime_id"} )
	anime: Anime;

}