import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	CreateDateColumn,
	UpdateDateColumn,
	BaseEntity,
} from "typeorm";
import { Field, Float, Int, ObjectType } from "type-graphql";

@ObjectType()
@Entity({name:"anime", synchronize: false})
export class Anime extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn()
	anime_id!: number;

	@Field(() => String)
	@Column({ unique: true })
	name!: string;

	@Field(() => String)
	@Column({ unique: true })
	genre!: string;

	@Field(() => String)
	@Column()
	type!: string;

	@Field(() => Int)
	@Column()
	episodes!: number;

	@Field(() => Float)
	@Column()
	rating!: number;

	@Field(() => Int)
	@Column()
	members!: number;

	@Field(() => String)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt: Date;
}
