
@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async save(user: User): Promise<User> {
    const userEntity = new UserEntity();
    userEntity.id = user.id;
    userEntity.name = user.name;
    userEntity.email = user.email;

    const savedUserEntity = await this.userRepository.save(userEntity);
    return new User(savedUserEntity.id, savedUserEntity.name, savedUserEntity.email);
  }

  async findById(id: number): Promise<User> {
    const userEntity = await this.userRepository.findOneBy({ id });
    return userEntity ? new User(userEntity.id, userEntity.name, userEntity.email) : null;
  }
}