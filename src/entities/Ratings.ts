import { Field, Int, ObjectType } from "type-graphql";
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	UpdateDateColumn
} from "typeorm";
import { Anime } from "./Anime";
import { User } from "./User";

@ObjectType()
@Entity()
export class Rating extends BaseEntity {
	@Field(() => Int)
	@Column({ name: "rating" })
	rating: number;

	@Field(() => Int)
	@PrimaryColumn({ name: "user_id" })
	userId!: number;

	@Field(() => Int)
	@PrimaryColumn({ name: "anime_id" })
	animeId!: number;

	@ManyToOne(() => User, (user) => user.ratings)
	@JoinColumn({ name: "user_id" })
	user: User;

	@Field(() => Anime)
	@ManyToOne(() => Anime, (anime) => anime.ratings, { onDelete: "CASCADE" })
	@JoinColumn({ name: "anime_id" })
	anime: Anime;

	@Field(() => String)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt: Date;
}
