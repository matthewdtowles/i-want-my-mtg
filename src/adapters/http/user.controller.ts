import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Patch,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { UpdateUserDto } from "src/core/user/dto/update-user.dto";
import { UserDto } from "src/core/user/dto/user.dto";
import { UserServicePort } from "src/core/user/ports/user.service.port";
import { CreateUserDto } from "../../core/user/dto/create-user.dto";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";
import { AuthenticatedRequest } from "./auth/authenticated.request";
import { AuthServicePort } from "src/core/auth/ports/auth.service.port";
import { AuthToken } from "src/core/auth/auth.types";
import { AUTH_TOKEN_NAME } from "./auth/auth.constants";

@Controller("user")
export class UserController {

  private readonly LOGGER = new Logger(UserController.name);

  constructor(
    @Inject(UserServicePort) private readonly userService: UserServicePort,
    @Inject(AuthServicePort) private readonly authService: AuthServicePort,
  ) {}

  @Get("create")
  @Render("create-user")
  createForm() {
    return {};
  }

  @Post("create")
  async create(@Body() createUserDto: CreateUserDto, @Res() res: Response): Promise<void> {
    try {
      const createdUser: UserDto = await this.userService.create(createUserDto);
      if (!createdUser) {
        throw new Error(`Could not create user`);
      }
      const authToken: AuthToken = await this.authService.login(createdUser);
      if (!authToken) {
        throw new Error(`Could not create auth token`);
      }
      res.cookie(AUTH_TOKEN_NAME, authToken.access_token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000,
      }).redirect(`/user?action=create&status=${HttpStatus.CREATED}`);
    } catch (error) {
      res.redirect(`/user/create?action=create&status=${HttpStatus.BAD_REQUEST}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @Render("user")
  async findById(@Req() req: AuthenticatedRequest) {
    if (!req) {
      this.LOGGER.error("Request undefined, unauthorized to view user");
      throw new Error("Request undefined, unauthorized to view user");
    }
    if (!req.user) {
      throw new Error("Request user undefined, unauthorized to view user");
    }
    if (!req.user.id) {
      throw new Error("Request user ID undefined, unauthorized to view user");
    }
    const id: number = req.user.id;
    const foundUser: UserDto = await this.userService.findById(id);
    const login: boolean =
      foundUser &&
      req.query &&
      req.query.status === HttpStatus.OK.toString() &&
      req.query.action === "login";
    return {
      message: login ? `${foundUser.name} - logged in` : null,
      user: await this.userService.findById(id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async update(@Body() updateUserDto: UpdateUserDto, @Res() res: Response) {
   try {
      const updatedUser: UserDto = await this.userService.update(updateUserDto);
      return res.status(HttpStatus.OK).json({
        message: `User ${updatedUser.name} updated successfully`,
        user: updatedUser,
      });
    } catch (error) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: `Error updating user: ${error.message}` });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async remove(@Res() res: Response, @Req() req: AuthenticatedRequest) {
    try {
      if (!req || !req.user || !req.user.id) {
        throw new Error("Unauthorized to delete user");
      }
      const id: number = req.user.id;
      await this.userService.remove(id);
      const user: UserDto = await this.userService.findById(id);
      if (user && user.name) {
        throw new Error("Could not delete user");
      }
      return res
        .status(HttpStatus.OK)
        .json({ message: "User deleted successfully" });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  }
}
