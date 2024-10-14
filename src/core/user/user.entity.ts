import { Exclude } from "class-transformer";
import { UserRole } from "src/adapters/http/auth/user.role";
import { Inventory } from "src/core/inventory/inventory.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  @Exclude()
  password: string;

  @OneToMany(() => Inventory, (inventory) => inventory.user)
  inventory: Inventory[];

  @Column({
    type: "enum",
    enum: UserRole,
    array: true,
    default: [UserRole.User],
  })
  roles: UserRole[];
}
