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
	@Column()
	rating: number;

	@Field(() => Int)
	@PrimaryColumn()
	userId!: number;

	@Field(() => Int)
	@PrimaryColumn()
	animeId!: number;

	@ManyToOne(() => User, (user) => user.ratings)
	@JoinColumn({ name: "userId" })
	user: User;

	@Field(() => Anime)
	@ManyToOne(() => Anime, (anime) => anime.ratings, { onDelete: "CASCADE" })
	@JoinColumn({ name: "animeId" })
	anime: Anime;

	@Field(() => String)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt: Date;
}
