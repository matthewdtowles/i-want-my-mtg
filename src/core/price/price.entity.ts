@Entity()
export class Price {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsString()
    @IsNotEmpty()
    currency: string;

    @Column()
    @IsNumber()
    @IsNotEmpty()
    value: number;

    @Column()
    @IsDate()
    @IsNotEmpty()
    date: Date;

    @ManyToOne(() => Card, (card) => card.prices)
    @JoinColumn()
    card: Card;

    @Column()
    @IsString()
    @IsNotEmpty()
    provider: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    url: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    uuid: string;
}
